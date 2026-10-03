import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('electron', {
	openFile: (options?: { multiple?: boolean }) => ipcRenderer.invoke('dialog:openFile', options),

	saveFile: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
		ipcRenderer.invoke('dialog:saveFile', options),

	getDroppedFilePaths: (files: File[]) => {
		return files.map((file) => webUtils.getPathForFile(file))
	},

	readTextFile: (filePath: string) => ipcRenderer.invoke('fs:readTextFile', filePath),

	writeTextFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeTextFile', filePath, content),

	writeBase64File: (filePath: string, base64: string) => ipcRenderer.invoke('fs:writeBase64File', filePath, base64),

	readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),

	parsePdf: (filePath: string) => ipcRenderer.invoke('pdf:parse', filePath),

	log: (message: string) => ipcRenderer.invoke('log', message),

	testConnection: (url: string) => ipcRenderer.invoke('test-connection', url),

	generateAI: (options: { url: string; body: object }) => ipcRenderer.invoke('ai:generate', options),

	loadSettings: () => ipcRenderer.invoke('settings:load'),

	saveSettings: (settings: object) => ipcRenderer.invoke('settings:save', settings),

	getHistory: () => ipcRenderer.invoke('history:get'),

	addHistory: (entry: object) => ipcRenderer.invoke('history:add', entry),

	updateHistory: (id: string, updates: object) => ipcRenderer.invoke('history:update', id, updates),

	clearHistory: () => ipcRenderer.invoke('history:clear'),

	loadUploaded: () => ipcRenderer.invoke('uploaded:load'),

	saveUploaded: (documents: object) => ipcRenderer.invoke('uploaded:save', documents),

	loadTasks: () => ipcRenderer.invoke('tasks:load'),

	saveTasks: (documents: object) => ipcRenderer.invoke('tasks:save', documents),

	loadProcessed: () => ipcRenderer.invoke('processed:load'),

	saveProcessed: (documents: object) => ipcRenderer.invoke('processed:save', documents),

	listPrompts: () => ipcRenderer.invoke('prompts:list'),

	readPrompt: (filename: string) => ipcRenderer.invoke('prompts:read', filename),

	writePrompt: (filename: string, content: string) => ipcRenderer.invoke('prompts:write', filename, content),

	deletePrompt: (filename: string) => ipcRenderer.invoke('prompts:delete', filename),

	commercialCatalog: () => ipcRenderer.invoke('commercial:catalog'),

	licenseStatus: () => ipcRenderer.invoke('license:status'),

	activateLicense: (key: string) => ipcRenderer.invoke('license:activate', key),

	clearLicense: () => ipcRenderer.invoke('license:clear'),

	openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

	loadGlossary: () => ipcRenderer.invoke('glossary:load'),

	saveGlossary: (entries: object) => ipcRenderer.invoke('glossary:save', entries),

	loadMemory: () => ipcRenderer.invoke('memory:load'),

	saveMemory: (entries: object) => ipcRenderer.invoke('memory:save', entries),

	appendAudit: (event: object) => ipcRenderer.invoke('audit:append', event),

	exportAudit: () => ipcRenderer.invoke('audit:export'),

	appVersion: () => ipcRenderer.invoke('app:version'),

	checkForUpdates: () => ipcRenderer.invoke('update:check'),

	onUpdateAvailable: (callback: (data: { version: string }) => void) => {
		ipcRenderer.on('update:available', (_event, data) => callback(data))
	},
})
