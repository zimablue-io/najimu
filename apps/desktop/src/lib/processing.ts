/**
 * Document processing logic - parallel processing, AI calls, and response cleanup.
 */
import { convertPdfToMarkdown } from '@doclocalizer/core'
import { DISK_WRITE_INTERVAL, PROCESSING_CONCURRENCY } from './config'
import { getOutputFileName, getOutputPath, isPdfPath, readPdfFile, readTextFile } from './files'
import { lookupMemory, type MemoryEntry } from './memory'
import { buildPrompt, validatePromptTemplate } from './prompts'
import type { ProcessingOutput, SourceDocument } from './types'

/**
 * Processing result returned by the document processor.
 */
export interface ProcessingResult {
	success: boolean
	localizedText?: string
	markdown?: string
	error?: string
	paragraphsProcessed?: number
	memoryHits?: number
}

/**
 * Processing options passed to the document processor.
 */
export interface ProcessingOptions {
	sourceDoc: SourceDocument
	apiUrl: string
	model: string
	customPrompt?: string
	sourceLocale: string
	targetLocale: string
	termsBlock?: string
	memory?: MemoryEntry[]
	shouldContinue?: () => boolean
	onStatusChange: (status: ProcessingOutput['status'], progress?: { current: number; total: number }) => void
	onProgress: (current: number, total: number) => void
	onIntermediateWrite: (text: string) => Promise<void>
}

/**
 * Extracts markdown from a document (PDF or markdown file).
 */
export async function extractMarkdown(sourceDoc: SourceDocument): Promise<string> {
	if (isPdfPath(sourceDoc.path)) {
		const bytes = await readPdfFile(sourceDoc.path)
		return await convertPdfToMarkdown(bytes)
	}
	return await readTextFile(sourceDoc.path)
}

/**
 * Processes a single paragraph through the AI model.
 */
export async function processParagraph(options: {
	apiUrl: string
	model: string
	content: string // Pre-built prompt with text already inserted
}): Promise<string> {
	const result = await window.electron.generateAI({
		url: `${options.apiUrl}/chat/completions`,
		body: {
			model: options.model,
			messages: [{ role: 'user', content: options.content }],
			temperature: 0.2,
			max_tokens: 4096,
			stream: false,
		},
	})

	if (result.error) {
		throw new Error(result.error)
	}

	return cleanResponse(result.content)
}

/**
 * Cleans AI response text by removing markers, code fences, and leading commentary.
 */
export function cleanResponse(content: string): string {
	let processed = content.trim()

	// Remove code fences if present
	if (processed.startsWith('```')) {
		processed = processed
			.replace(/^```(?:markdown)?\n?/i, '')
			.replace(/\n?```$/i, '')
			.trim()
	}

	// Remove markers
	const beginMarker = processed.indexOf('---BEGIN TEXT---')
	if (beginMarker !== -1) {
		processed = processed.slice(beginMarker + '---BEGIN TEXT---'.length)
	}
	const endMarker = processed.indexOf('---END TEXT---')
	if (endMarker !== -1) {
		processed = processed.slice(0, endMarker)
	}

	// Remove any leading commentary
	const smartApostrophe = '\u2019'
	const regularApostrophe = "'"
	// Match "Here's", "Heres" (missing apostrophe), "Here is" (with space)
	processed = processed
		.replace(
			new RegExp(`^Here[${smartApostrophe}${regularApostrophe}]?s?(?:\\s+is)? (?:the )?translation[.:].*`, 'i'),
			''
		)
		.trim()
	processed = processed.replace(/^Translate the text above.*/i, '').trim()
	processed = processed
		.replace(new RegExp(`^Here[${smartApostrophe}${regularApostrophe}]s?.*translation.*`, 'i'), '')
		.trim()

	return processed.trim()
}

/**
 * Processes a document through localization.
 * Returns the final localized text and metadata.
 */
export async function processDocument(options: ProcessingOptions): Promise<ProcessingResult> {
	const {
		sourceDoc,
		apiUrl,
		model,
		customPrompt,
		sourceLocale,
		targetLocale,
		termsBlock,
		memory,
		shouldContinue,
		onStatusChange,
		onProgress,
		onIntermediateWrite,
	} = options

	// Validate prompt ONCE at the start
	if (!customPrompt) {
		throw new Error('No prompt template configured. Please select a prompt in Settings.')
	}

	const templateValidation = validatePromptTemplate(customPrompt)
	if (!templateValidation.valid) {
		throw new Error(`Custom prompt is missing required variables: ${templateValidation.missingVars.join(', ')}`)
	}

	if (!sourceLocale || !targetLocale) {
		const missing = []
		if (!sourceLocale) missing.push('source locale')
		if (!targetLocale) missing.push('target locale')
		throw new Error(`Please select the ${missing.join(' and ')} before processing`)
	}

	onStatusChange('parsing')

	const markdown = await extractMarkdown(sourceDoc)
	const outputPath = getOutputPath(sourceDoc.path, targetLocale)

	// Save extracted markdown next to original PDF
	if (isPdfPath(sourceDoc.path)) {
		const mdPath = sourceDoc.path.replace(/\.pdf$/i, '.md')
		await window.electron.writeTextFile(mdPath, markdown)
	}

	// Split markdown into paragraphs - one paragraph per API call
	const paragraphs = markdown.split(/\n\n+/).filter((p) => p.trim())

	onStatusChange('localizing', { current: 0, total: paragraphs.length })

	// Initialize output file
	await window.electron.writeTextFile(outputPath, '')

	// Build base prompt ONCE with locales replaced, keeping {text} as literal placeholder
	const basePrompt = buildPrompt(customPrompt, {
		sourceLocale,
		targetLocale,
		text: '{text}', // Keep as placeholder to be replaced per paragraph
		termsBlock,
	})

	const localizedParagraphs: string[] = []
	let memoryHits = 0

	// Process in parallel batches
	for (let i = 0; i < paragraphs.length; i += PROCESSING_CONCURRENCY) {
		// Check if stopped between batches
		if (shouldContinue && !shouldContinue()) {
			return { success: false }
		}

		const batch = paragraphs.slice(i, i + PROCESSING_CONCURRENCY)

		const results = await Promise.all(
			batch.map(async (paragraph) => {
				if (memory) {
					const hit = lookupMemory(memory, sourceLocale, targetLocale, paragraph)
					if (hit !== null) {
						memoryHits += 1
						return hit
					}
				}
				return processParagraph({
					apiUrl,
					model,
					content: basePrompt.replace('{text}', paragraph),
				})
			})
		)

		localizedParagraphs.push(...results)

		const progress = Math.min(i + PROCESSING_CONCURRENCY, paragraphs.length)
		onProgress(progress, paragraphs.length)

		// Write intermediate results periodically
		if (localizedParagraphs.length >= DISK_WRITE_INTERVAL) {
			await onIntermediateWrite(localizedParagraphs.join('\n\n'))
		}
	}

	// Write final result
	const finalText = localizedParagraphs.join('\n\n')
	await window.electron.writeTextFile(outputPath, finalText)

	onStatusChange('review', { current: paragraphs.length, total: paragraphs.length })

	return {
		success: true,
		localizedText: finalText,
		markdown,
		paragraphsProcessed: paragraphs.length,
		memoryHits,
	}
}

/**
 * Creates a new processing output entry for a document.
 */
export function createProcessingOutput(sourceDoc: SourceDocument, targetLocale: string): ProcessingOutput {
	const outputId = crypto.randomUUID()
	const outputName = getOutputFileName(sourceDoc.name, targetLocale)
	const outputPath = getOutputPath(sourceDoc.path, targetLocale)

	return {
		id: outputId,
		sourceDocId: sourceDoc.id,
		sourceDocName: sourceDoc.name,
		name: outputName,
		path: outputPath,
		sourceLocale: sourceDoc.sourceLocale || '',
		targetLocale,
		status: 'parsing',
		progress: { current: 0, total: 1 },
	}
}
