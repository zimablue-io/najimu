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
	embedText: (input: string[]) => Promise<{ vectors?: number[][]; error?: string }>
	loadMemory: () => Promise<unknown[]>
	saveMemory: (entries: object[]) => Promise<boolean>
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
	appVersion: () => Promise<string>
	checkForUpdates: () => Promise<{ dev?: true; error?: string }>
	onUpdateAvailable: (callback: (data: { version: string }) => void) => void
}

declare global {
	interface Window {
		electron: ElectronAPI
	}
}
