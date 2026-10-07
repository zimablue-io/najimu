export interface ChunkConfig {
	maxTokens: number
	overlapTokens: number
}

export interface AppConfig {
	llmBaseUrl: string
	llmModel: string
	chunkConfig: ChunkConfig
	defaultSourceLocale?: string
	defaultTargetLocale?: string
}

export interface LocalizationResult {
	outputText: string
	chunks: number
	model: string
	changesCount?: number
}

// Document processing types
export type DocumentStatus = 'idle' | 'parsing' | 'localizing' | 'review' | 'approved' | 'exported' | 'error'

// Change review types
export type ChangeStatus = 'pending' | 'approved' | 'rejected' | 'ignored'

export type ChunkStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Chunk {
	id: string
	paragraphIndices: number[]
	originalText: string
	localizedText?: string
	status: ChunkStatus
	charCount: number
	createdAt: string
	processedAt?: string
	error?: string
}

export interface ProcessingState {
	documentId: string
	chunks: Chunk[]
	totalChunks: number
	completedChunks: number
	failedChunks: number
	currentChunkIndex: number
}

export interface TextChange {
	id: string
	paragraphIndex: number
	wordIndex: number // Start position in original text
	originalText: string
	localizedText: string
	context: string // Surrounding text for context
	status: ChangeStatus
	comment?: string
	timestamp: string
}

export interface ChangeReviewState {
	changes: TextChange[]
	totalChanges: number
	approvedCount: number
	rejectedCount: number
	ignoredCount: number
	pendingCount: number
}

// Extend DocumentState to include change review
export interface DocumentState {
	id: string
	name: string
	path: string
	status: DocumentStatus
	error?: string
	markdown?: string
	localizedText?: string
	progress?: {
		current: number
		total: number
		phase: 'parsing' | 'localizing'
	}
	// For targeted re-localization
	chunkErrorIndex?: number
	// For change review
	changeReview?: ChangeReviewState
	// For processing queue
	processingState?: ProcessingState
	// Per-item locale configuration (overrides settings defaults)
	sourceLocale?: string
	targetLocale?: string
}

export interface ClassifiedChange {
	type: 'spelling' | 'phrase' | 'regional' | 'style'
	original: string
	rewritten: string
	risky: boolean
	reason?: string
}

export interface BatchStatus {
	total: number
	processed: number
	failed: number
	documents: BatchDocStatus[]
}

export interface BatchDocStatus {
	name: string
	status: 'pending' | 'processing' | 'completed' | 'failed'
	error?: string
	localePair?: string
}

export interface ApprovalRecord {
	document: string
	approvedBy: string
	approvedAt: string
	targetLocale: string
	notes?: string
}

export interface DocumentInput {
	id: string
	path: string
	name: string
}

export interface PdfPage {
	page_number: number
	text: string
}

export interface PdfParseResult {
	pages: PdfPage[]
	total_pages: number
	file_name: string
}

export interface ProcessCallbacks {
	onStatusChange: (status: DocumentStatus) => void
	onProgress: (current: number, total: number, phase: 'parsing' | 'localizing') => void
	onComplete: (markdown: string, localizedText: string) => void
	onError: (error: string) => void
}

export interface ProcessConfig {
	chunkSize: number
	overlapSize: number
	systemPrompt: string
}

export interface ProcessResult {
	markdown: string
	localizedText: string
	chunksCount: number
}

// File-based processing types
export type SourceFileType = 'pdf' | 'md' | 'unknown'

export interface ConversionResult {
	markdown: string
	sourceType: SourceFileType
	mdFilePath?: string // Path to saved .md file if converted from PDF
}

export interface FileProcessorCallbacks {
	onStatusChange: (status: DocumentStatus) => void
	onProgress: (current: number, total: number, phase: 'parsing' | 'localizing' | 'converting') => void
	onComplete: (result: ConversionResult, localizedText: string) => void
	onError: (error: string) => void
}

export interface FileProcessorConfig {
	chunkSize: number
	overlapSize: number
	systemPrompt: string
	saveMdFiles: boolean // Whether to save converted .md files to disk
}
