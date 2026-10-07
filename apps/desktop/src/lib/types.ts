/**
 * Shared TypeScript types for the Najimu desktop app.
 */

/**
 * Represents a locale with its BCP 47 code and display name.
 */
export interface Locale {
	code: string
	name: string
}

/**
 * Represents an AI model configuration.
 */
export interface ModelConfig {
	id: string
	name: string
}

/**
 * Application settings stored in user preferences.
 */
export interface Settings {
	apiUrl: string
	models: ModelConfig[]
	activeModelId: string
	activePromptId: string
	chunkSize: string
	overlapSize: string
	sourceLocale: string
	targetLocale: string
	enabledLocaleCodes: string[]
}

/**
 * History entry for tracking processed documents.
 */
export interface HistoryEntry {
	id: string
	fileName: string
	filePath: string
	sourceLocale: string
	targetLocale: string
	processedAt: string
	status: 'processed' | 'review' | 'approved' | 'rejected' | 'error'
	errorMessage?: string
	chunksProcessed?: number
}

/**
 * Source document - uploaded files are permanent library entries, never modified.
 */
export interface SourceDocument {
	id: string
	name: string
	path: string
	sourceLocale?: string
	targetLocale?: string
}

/**
 * Processing output - created when processing starts.
 */
export interface ProcessingOutput {
	id: string
	sourceDocId: string
	sourceDocName: string
	name: string
	path: string
	sourceLocale: string
	targetLocale: string
	status: 'parsing' | 'localizing' | 'review' | 'approved' | 'rejected' | 'exported' | 'error'
	markdown?: string
	localizedText?: string
	progress?: { current: number; total: number; phase?: string }
	error?: string
}

/**
 * An approved source/target pair plus its source-language embedding,
 * used to reuse established terminology on later runs.
 */
export interface MemoryEntry {
	id: string
	documentId: string
	sourceText: string
	translation: string
	sourceLocale: string
	targetLocale: string
	embedding: number[]
	approvedAt: string
}

/**
 * Document processing status types.
 */
export type DocumentStatus = ProcessingOutput['status']

/**
 * History status types.
 */
export type HistoryStatus = HistoryEntry['status']
