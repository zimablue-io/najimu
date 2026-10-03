export interface ElectronAPI {
	openFile: (options?: { multiple?: boolean }) => Promise<string[] | null>
	saveFile: (options?: {
		defaultPath?: string
		filters?: { name: string; extensions: string[] }[]
	}) => Promise<string | null>

	getDroppedFilePaths: (files: File[]) => string[]
	readTextFile: (filePath: string) => Promise<string>
	writeTextFile: (filePath: string, content: string) => Promise<void>
	writeBase64File: (filePath: string, base64: string) => Promise<void>
	readFile: (filePath: string) => Promise<string>
	parsePdf: (filePath: string) => Promise<{ base64: string; size: number }>
	log: (message: string) => Promise<void>
	testConnection: (
		url: string
	) => Promise<{ status?: number; headers?: Record<string, string>; body?: string; error?: string }>
	generateAI: (options: {
		url: string
		body: object
	}) => Promise<{ content: string; error?: string; status?: number }>
	loadSettings: () => Promise<unknown>
	saveSettings: (settings: object) => Promise<boolean>
	getHistory: () => Promise<unknown[]>
	addHistory: (entry: object) => Promise<{ id: string }>
	updateHistory: (id: string, updates: object) => Promise<unknown>
	clearHistory: () => Promise<boolean>
	loadUploaded: () => Promise<unknown[]>
	saveUploaded: (documents: object) => Promise<boolean>
	loadTasks: () => Promise<unknown[]>
	saveTasks: (documents: object) => Promise<boolean>
	loadProcessed: () => Promise<unknown[]>
	saveProcessed: (documents: object) => Promise<boolean>
	listPrompts: () => Promise<string[]>
	readPrompt: (filename: string) => Promise<string | null>
	writePrompt: (filename: string, content: string) => Promise<boolean>
	deletePrompt: (filename: string) => Promise<boolean>
	commercialCatalog: () => Promise<{
		organizationId: string
		commercialBenefitId: string
		checkoutCommercial: string
	}>
	licenseStatus: () => Promise<{
		key: string | null
		response: { status: string; benefitId: string; expiresAt: string | null } | null
		networkError: boolean
		cache: { benefitId: string; expiresAt: string | null; lastValidatedAt: string } | null
		error?: string
	}>
	activateLicense: (key: string) => Promise<{
		key: string | null
		response: { status: string; benefitId: string; expiresAt: string | null } | null
		networkError: boolean
		cache: { benefitId: string; expiresAt: string | null; lastValidatedAt: string } | null
		error?: string
	}>
	clearLicense: () => Promise<boolean>
	openExternal: (url: string) => Promise<boolean>
	loadGlossary: () => Promise<
		{ id: string; sourceLocale: string; targetLocale: string; source: string; target: string }[]
	>
	saveGlossary: (entries: object) => Promise<boolean>
	loadMemory: () => Promise<{ sourceLocale: string; targetLocale: string; source: string; target: string }[]>
	saveMemory: (entries: object) => Promise<boolean>
	appendAudit: (event: object) => Promise<boolean>
	exportAudit: () => Promise<string | null>
	appVersion: () => Promise<string>
	checkForUpdates: () => Promise<{ dev?: true; error?: string }>
	onUpdateAvailable: (callback: (data: { version: string }) => void) => void
}

declare global {
	interface Window {
		electron: ElectronAPI
	}
}
