/**
 * Document processing logic - parallel processing, AI calls, and response cleanup.
 */
import { convertPdfToMarkdown } from '@doclocalizer/core'
import { DISK_WRITE_INTERVAL, MEMORY_MATCH_LIMIT, MEMORY_SIMILARITY_THRESHOLD, PROCESSING_CONCURRENCY } from './config'
import { embedTexts } from './embeddings'
import { getOutputFileName, getOutputPath, isPdfPath, readPdfFile, readTextFile } from './files'
import { buildMemoryContext, buildMemoryEntries, findReusableTranslation, splitParagraphs } from './memory'
import { buildPrompt, validatePromptTemplate } from './prompts'
import { findSimilar } from './similarity'
import type { MemoryEntry, ProcessingOutput, SourceDocument } from './types'

/**
 * Processing result returned by the document processor.
 */
export interface ProcessingResult {
	success: boolean
	localizedText?: string
	markdown?: string
	error?: string
	paragraphsProcessed?: number
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
	// Match "Here's", "Heres" (missing apostrophe), "Here is" (with space),
	// and any trailing wording after "translation" (e.g. "...of the markdown:")
	processed = processed
		.replace(
			new RegExp(`^Here[${smartApostrophe}${regularApostrophe}]?s?(?:\\s+is)? (?:the )?translation[.:]?.*`, 'i'),
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
	const paragraphs = splitParagraphs(markdown)

	onStatusChange('localizing', { current: 0, total: paragraphs.length })

	// Initialize output file
	await window.electron.writeTextFile(outputPath, '')

	// Build base prompt ONCE with locales replaced, keeping {text} as literal placeholder
	const basePrompt = buildPrompt(customPrompt, {
		sourceLocale,
		targetLocale,
		text: '{text}', // Keep as placeholder to be replaced per paragraph
	})

	// Reuse and retrieval are both decided once, before any model call.
	const locales = { source: sourceLocale, target: targetLocale }
	const plan = await planParagraphs(paragraphs, await loadMemory(), locales)

	const localizedParagraphs: string[] = []

	// Process in parallel batches
	for (let i = 0; i < paragraphs.length; i += PROCESSING_CONCURRENCY) {
		// Check if stopped between batches
		if (shouldContinue && !shouldContinue()) {
			return { success: false }
		}

		const batch = plan.slice(i, i + PROCESSING_CONCURRENCY)

		const results = await Promise.all(
			batch.map(async (step, offset) => {
				if (step.translation !== null) return step.translation

				const content = basePrompt.replace('{text}', paragraphs[i + offset])
				return await processParagraph({
					apiUrl,
					model,
					content: step.context ? `${step.context}\n${content}` : content,
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
	}
}

/**
 * Loads approved memory once. Returns an empty list when unavailable so the
 * document still translates.
 */
async function loadMemory(): Promise<MemoryEntry[]> {
	try {
		const loaded = await window.electron.loadMemory()
		return Array.isArray(loaded) ? (loaded as MemoryEntry[]) : []
	} catch {
		return []
	}
}

/**
 * Decides, for every paragraph, whether an approved translation can be reused
 * or the paragraph must be sent to the model.
 *
 * All paragraphs are embedded in one batched call, and a paragraph covered by
 * an approved translation never reaches the model at all.
 */
async function planParagraphs(
	paragraphs: string[],
	memory: MemoryEntry[],
	locales: { source: string; target: string }
): Promise<Array<{ translation: string | null; context: string }>> {
	if (memory.length === 0) {
		return paragraphs.map(() => ({ translation: null, context: '' }))
	}

	const vectors = await embedTexts(paragraphs)

	return paragraphs.map((paragraph, index) => {
		const approved = findReusableTranslation(paragraph, memory, locales)
		if (approved) return { translation: approved, context: '' }

		const vector = vectors[index]
		const matches =
			vector && vector.length > 0
				? findSimilar(vector, memory, MEMORY_SIMILARITY_THRESHOLD, MEMORY_MATCH_LIMIT, locales)
				: []

		return { translation: null, context: buildMemoryContext(matches, locales.target) }
	})
}

/**
 * Records an approved document into translation memory.
 * Failures are swallowed: approving a document must never fail on the memory write.
 */
export async function recordApprovedDocument(args: {
	documentId: string
	sourceText: string
	translatedText: string
	sourceLocale: string
	targetLocale: string
}): Promise<MemoryEntry[]> {
	try {
		const paragraphs = splitParagraphs(args.sourceText)
		const vectors = await embedTexts(paragraphs)
		if (vectors.length === 0) return []

		const entries = buildMemoryEntries({
			documentId: args.documentId,
			sourceText: args.sourceText,
			translatedText: args.translatedText,
			sourceLocale: args.sourceLocale,
			targetLocale: args.targetLocale,
			embeddings: vectors,
			approvedAt: new Date().toISOString(),
		})
		if (entries.length === 0) return []

		const existing = (await window.electron.loadMemory()) as MemoryEntry[]
		await window.electron.saveMemory([...(Array.isArray(existing) ? existing : []), ...entries])
		return entries
	} catch {
		return []
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
