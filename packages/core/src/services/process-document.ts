import type { DocumentInput, PdfParseResult, ProcessCallbacks, ProcessConfig } from '../types'
import { chunkText } from '../utils/chunk'
import { OpenAIClient } from './openai-client'

/**
 * Process a document through PDF parsing and AI localization.
 *
 * @param input - Document to process (id, path, name)
 * @param callbacks - Progress and status callbacks
 * @param parsePdfFn - Platform-specific PDF parsing function supplied by the caller
 * @param aiClient - AI client for localization
 * @param config - Processing configuration
 */
export async function processDocument(
	input: DocumentInput,
	callbacks: ProcessCallbacks,
	parsePdfFn: (path: string) => Promise<PdfParseResult>,
	aiClient: OpenAIClient,
	config: ProcessConfig
): Promise<void> {
	const { path } = input

	callbacks.onStatusChange('parsing')
	// Show parsing status BEFORE the slow PDF extraction starts
	callbacks.onProgress(0, 1, 'parsing')

	let parseResult: PdfParseResult

	try {
		// This is the slow part - PDF extraction happens here
		parseResult = await parsePdfFn(path)
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err)
		callbacks.onError(`PDF parsing failed: ${errorMessage}`)
		return
	}

	// Validate the result has pages
	if (!parseResult.pages || parseResult.pages.length === 0) {
		callbacks.onError('PDF parsing returned no content - file may be empty or corrupted')
		return
	}

	const markdown = parseResult.pages.map((p) => p.text).join('\n\n')

	// Validate we got actual text content
	if (!markdown || markdown.trim().length === 0) {
		callbacks.onError('PDF contains no extractable text - file may be scanned/image-based')
		return
	}

	// Switch to localizing ONLY AFTER PDF parsing is complete
	callbacks.onStatusChange('localizing')

	// Localize with AI API (chunk by chunk)
	const chunks = chunkText(markdown, config.chunkSize, config.overlapSize)
	const localizedChunks: string[] = []

	for (let i = 0; i < chunks.length; i++) {
		callbacks.onProgress(i + 1, chunks.length, 'localizing')

		try {
			const localized = await aiClient.generate(config.systemPrompt, buildUserPrompt(chunks[i]))
			localizedChunks.push(localized)
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err)
			callbacks.onError(`Localization failed at chunk ${i + 1}/${chunks.length}: ${errorMessage}`)
			return
		}
	}

	const localizedText = localizedChunks.join('\n')

	callbacks.onComplete(markdown, localizedText)
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
export async function processDocuments(
	inputs: DocumentInput[],
	callbacks: ProcessCallbacks,
	parsePdfFn: (path: string) => Promise<PdfParseResult>,
	aiClient: OpenAIClient,
	config: ProcessConfig
): Promise<void> {
	await Promise.all(inputs.map((input) => processDocument(input, callbacks, parsePdfFn, aiClient, config)))
}
