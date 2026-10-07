import type { ConversionResult, DocumentInput, FileProcessorCallbacks, FileProcessorConfig } from '../types'
import { chunkText } from '../utils/chunk'

/**
 * Interface for AI clients that can generate localized text
 */
export interface AIClient {
	generate(systemPrompt: string, userPrompt: string): Promise<string>
}

/**
 * Detect file type from extension
 */
export function getFileType(filePath: string): 'pdf' | 'md' | 'unknown' {
	const lower = filePath.toLowerCase()
	if (lower.endsWith('.pdf')) return 'pdf'
	if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md'
	return 'unknown'
}

/**
 * Get suggested .md filename for a given source file path
 */
export function getMdFilePath(sourcePath: string): string {
	// Remove extension and add .md
	const withoutExt = sourcePath.replace(/\.[^/.]+$/, '')
	return `${withoutExt}.md`
}

/**
 * Process a document (PDF or MD) with AI localization.
 * Handles file type detection and conversion automatically.
 *
 * @param input - Document to process (id, path, name)
 * @param callbacks - Progress and status callbacks
 * @param parsePdfFn - Platform-specific PDF parsing function supplied by the caller
 * @param readFileFn - Platform-specific file reading function for .md files
 * @param writeFileFn - Platform-specific file writing function to save .md files
 * @param aiClient - AI client for localization
 * @param config - Processing configuration
 */
export async function processFile(
	input: DocumentInput,
	callbacks: FileProcessorCallbacks,
	parsePdfFn: (path: string) => Promise<{ pages: { page_number: number; text: string }[]; total_pages: number }>,
	readFileFn: (path: string) => Promise<string>,
	writeFileFn: (path: string, content: string) => Promise<void>,
	aiClient: AIClient,
	config: FileProcessorConfig
): Promise<void> {
	const { path, name } = input

	const fileType = getFileType(path)
	console.log(`[processFile] ===== START =====`)
	console.log(`[processFile] name: "${name}"`)
	console.log(`[processFile] path: ${path}`)
	console.log(`[processFile] fileType: ${fileType}`)
	console.log(`[processFile] saveMdFiles: ${config.saveMdFiles}`)

	let markdown: string
	let mdFilePath: string | undefined

	console.log(`[processFile] Checking fileType === 'md'...`)
	if (fileType === 'md') {
		// Direct markdown file - no conversion needed
		callbacks.onStatusChange('localizing')
		callbacks.onProgress(0, 1, 'converting')
		console.log(`[processFile] Reading .md file directly: ${path}`)

		try {
			markdown = await readFileFn(path)
			console.log(`[processFile] Read ${markdown.length} chars from .md file`)
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err)
			callbacks.onError(`Failed to read .md file: ${errorMessage}`)
			return
		}
	} else if (fileType === 'pdf') {
		console.log(`[processFile] Entering PDF branch`)
		// PDF file - need to convert
		callbacks.onStatusChange('parsing')
		callbacks.onProgress(0, 1, 'parsing')
		console.log(`[processFile] Parsing PDF: ${path}`)

		try {
			console.log(`[processFile] Calling parsePdfFn now...`)
			const parseResult = await parsePdfFn(path)
			console.log(`[processFile] PDF parsed, ${parseResult.pages.length} pages`)

			// Validate the result has pages
			if (!parseResult.pages || parseResult.pages.length === 0) {
				callbacks.onError('PDF parsing returned no content - file may be empty or corrupted')
				return
			}

			markdown = parseResult.pages.map((p) => p.text).join('\n\n')
			console.log(`[processFile] PDF converted to ${markdown.length} chars`)

			// Validate we got actual text content
			if (!markdown || markdown.trim().length === 0) {
				callbacks.onError('PDF contains no extractable text - file may be scanned/image-based')
				return
			}

			// Save .md file if configured
			if (config.saveMdFiles) {
				mdFilePath = getMdFilePath(path)
				try {
					callbacks.onProgress(1, 1, 'parsing') // Signal saving
					await writeFileFn(mdFilePath, markdown)
					console.log(`[processFile] Saved .md file to: ${mdFilePath}`)
				} catch (err) {
					// Non-fatal error - log but continue
					console.error(`[processFile] Failed to save .md file: ${err}`)
				}
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err)
			callbacks.onError(`PDF parsing failed: ${errorMessage}`)
			return
		}
	} else {
		console.log(`[processFile] Entering UNKNOWN branch for path: ${path}`)
		callbacks.onError(`Unsupported file type: ${path}`)
		return
	}

	// Now localize
	console.log(`[processFile] ===== START LOCALIZATION =====`)
	callbacks.onStatusChange('localizing')

	const chunks = chunkText(markdown, config.chunkSize, config.overlapSize)
	console.log(`[processFile] Chunked into ${chunks.length} pieces`)

	const localizedChunks: string[] = []

	for (let i = 0; i < chunks.length; i++) {
		callbacks.onProgress(i + 1, chunks.length, 'localizing')

		try {
			const localized = await aiClient.generate(config.systemPrompt, buildUserPrompt(chunks[i]))
			localizedChunks.push(localized)
			console.log(`[processFile] Localized chunk ${i + 1}/${chunks.length}`)
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err)
			callbacks.onError(`Localization failed at chunk ${i + 1}/${chunks.length}: ${errorMessage}`)
			return
		}
	}

	const localizedText = localizedChunks.join('\n')
	const result: ConversionResult = {
		markdown,
		sourceType: fileType,
		mdFilePath,
	}

	callbacks.onComplete(result, localizedText)
	console.log(`[processFile] Complete: ${markdown.length} chars -> ${localizedText.length} chars`)
}

function buildUserPrompt(chunk: string): string {
	return [
		'Localize the following markdown. Keep formatting intact.',
		'',
		'---BEGIN MARKDOWN---',
		chunk,
		'---END MARKDOWN---',
	].join('\n')
}

/**
 * Process multiple documents in parallel.
 */
export async function processFiles(
	inputs: DocumentInput[],
	callbacks: FileProcessorCallbacks,
	parsePdfFn: (path: string) => Promise<{ pages: { page_number: number; text: string }[]; total_pages: number }>,
	readFileFn: (path: string) => Promise<string>,
	writeFileFn: (path: string, content: string) => Promise<void>,
	aiClient: AIClient,
	config: FileProcessorConfig
): Promise<void> {
	await Promise.all(
		inputs.map((input) => processFile(input, callbacks, parsePdfFn, readFileFn, writeFileFn, aiClient, config))
	)
}
