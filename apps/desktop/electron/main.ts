import fs from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, net } from 'electron'
import { autoUpdater } from 'electron-updater'
import { embed, registerEmbedderShutdown } from './embedder'

// For dev logging
const DEBUG = true
const log = (...args: unknown[]) => DEBUG && console.log('[electron]', ...args)

// Auto-updater setup
function setupAutoUpdater() {
	// Disable auto-download - we'll prompt user first
	autoUpdater.autoDownload = false

	autoUpdater.on('checking-for-update', () => {
		log('Checking for updates...')
	})

	autoUpdater.on('update-available', (info) => {
		log('Update available:', info.version)
		// Notify renderer
		if (mainWindow) {
			mainWindow.webContents.send('update:available', { version: info.version })
		}
		// Prompt user to download
		if (mainWindow) {
			dialog
				.showMessageBox(mainWindow, {
					type: 'info',
					title: 'Update Available',
					message: `A new version (${info.version}) is available. Would you like to download it now?`,
					buttons: ['Download', 'Later'],
				})
				.then((result) => {
					if (result.response === 0) {
						autoUpdater.downloadUpdate()
					}
				})
		}
	})

	autoUpdater.on('update-not-available', () => {
		log('No updates available')
	})

	autoUpdater.on('download-progress', (progress) => {
		log(`Download progress: ${progress.percent.toFixed(1)}%`)
	})

	autoUpdater.on('update-downloaded', () => {
		log('Update downloaded')
		if (mainWindow) {
			dialog
				.showMessageBox(mainWindow, {
					type: 'info',
					title: 'Update Ready',
					message: 'Update downloaded. The application will restart to install the update.',
					buttons: ['Restart Now', 'Later'],
				})
				.then((result) => {
					if (result.response === 0) {
						autoUpdater.quitAndInstall()
					}
				})
		}
	})

	autoUpdater.on('error', (err) => {
		log('Auto-updater error:', err.message)
		// Don't crash the app if auto-updater fails
	})
}

// Check for updates (skip in dev mode)
function checkForUpdates() {
	if (process.env.NODE_ENV === 'production') {
		autoUpdater.checkForUpdates().catch((err) => {
			log('Update check failed (this is normal if not published yet):', err.message)
		})
	}
}

// IPC Handlers
ipcMain.handle('app:version', () => {
	return app.getVersion()
})

ipcMain.handle('update:check', () => {
	if (process.env.NODE_ENV === 'production') {
		return autoUpdater
			.checkForUpdates()
			.then((result) => {
				log('Update check result:', result)
				return result
			})
			.catch((err) => {
				log('Update check failed:', err.message)
				return { error: err.message }
			})
	}
	return { dev: true }
})

let mainWindow: BrowserWindow | null = null

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		title: 'Najimu',
		backgroundColor: '#0a0a0f',
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, 'preload.cjs'),
		},
	})

	// For vite build (production), load from dist folder
	// For vite dev server, load from localhost
	const isDev = !app.isPackaged
	console.log('[electron] isPackaged:', app.isPackaged, 'isDev:', isDev)
	console.log('[electron] __dirname:', __dirname)
	console.log('[electron] loading from:', isDev ? 'localhost:1420' : path.join(__dirname, '../dist/index.html'))

	if (isDev) {
		mainWindow.loadURL('http://localhost:1420')
	} else {
		mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
	}

	mainWindow.on('closed', () => {
		mainWindow = null
	})
}

app.whenReady().then(() => {
	createWindow()
	setupAutoUpdater()
	registerEmbedderShutdown()
	checkForUpdates()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

// IPC Handlers

// File validation for drag and drop
const ALLOWED_EXTENSIONS = ['pdf', 'md', 'markdown']

function isValidFilePath(filePath: string): boolean {
	const ext = path.extname(filePath).toLowerCase().replace('.', '')
	return ALLOWED_EXTENSIONS.includes(ext)
}

ipcMain.handle('dialog:validateFilePaths', async (_event, filePaths: string[]) => {
	const validPaths = filePaths.filter(isValidFilePath)
	return {
		valid: validPaths,
		invalid: filePaths.filter((p) => !isValidFilePath(p)),
	}
})

// Handle drag and drop from UI - receive file paths and validate
ipcMain.handle('dialog:handleFileDrop', async (_event, filePaths: string[]) => {
	const validPaths = filePaths.filter(isValidFilePath)
	return {
		valid: validPaths,
		invalid: filePaths.filter((p) => !isValidFilePath(p)),
	}
})

ipcMain.handle('dialog:openFile', async (_event, options) => {
	if (!mainWindow) return null
	const result = await dialog.showOpenDialog(mainWindow, {
		properties: ['openFile', 'multiSelections'],
		filters: [{ name: 'Documents', extensions: ['pdf', 'md', 'markdown'] }],
		...options,
	})
	return result.canceled ? null : result.filePaths
})

ipcMain.handle('dialog:saveFile', async (_event, options) => {
	if (!mainWindow) return null
	const result = await dialog.showSaveDialog(mainWindow, {
		filters: [{ name: 'Markdown', extensions: ['md'] }],
		...options,
	})
	return result.canceled ? null : result.filePath
})

ipcMain.handle('fs:readTextFile', async (_event, filePath) => {
	return fs.readFileSync(filePath, 'utf-8')
})

ipcMain.handle('fs:writeTextFile', async (_event, filePath, content) => {
	fs.writeFileSync(filePath, content, 'utf-8')
})

ipcMain.handle('fs:writeBase64File', async (_event, filePath, base64) => {
	const buffer = Buffer.from(base64, 'base64')
	fs.writeFileSync(filePath, buffer)
})

ipcMain.handle('fs:readFile', async (_event, filePath) => {
	const buffer = fs.readFileSync(filePath)
	return buffer.toString('base64')
})

ipcMain.handle('log', (_event, message) => {
	console.log(`[electron] ${message}`)
})

ipcMain.handle('test-connection', async (_event, url: string) => {
	try {
		const response = await net.fetch(url)
		const data = await response.json()
		const headers: Record<string, string> = {}
		response.headers.forEach((value, key) => {
			headers[key] = value
		})
		return { status: response.status, headers, body: JSON.stringify(data).substring(0, 500) }
	} catch (e: unknown) {
		return { error: e instanceof Error ? e.message : String(e) }
	}
})

ipcMain.handle('pdf:parse', async (_event, filePath) => {
	const buffer = fs.readFileSync(filePath)
	// Return base64 encoded PDF for frontend processing
	return { base64: buffer.toString('base64'), size: buffer.length }
})

// Settings persistence using JSON file
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json')

interface HistoryEntry {
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

function ensureUserDataDir(): void {
	const userDataPath = app.getPath('userData')
	if (!fs.existsSync(userDataPath)) {
		fs.mkdirSync(userDataPath, { recursive: true })
	}
}

ipcMain.handle('settings:load', async () => {
	try {
		ensureUserDataDir()
		if (fs.existsSync(settingsFilePath)) {
			const data = fs.readFileSync(settingsFilePath, 'utf-8')
			return JSON.parse(data)
		}
	} catch (e) {
		log('Error loading settings:', e)
	}
	return null
})

ipcMain.handle('settings:save', async (_event, settings) => {
	try {
		ensureUserDataDir()
		fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8')
		log('Settings saved to:', settingsFilePath)
		return true
	} catch (e) {
		log('Error saving settings:', e)
		return false
	}
})

// History persistence using JSON file
const historyFilePath = path.join(app.getPath('userData'), 'history.json')
const MAX_HISTORY_ITEMS = 100

ipcMain.handle('history:get', async () => {
	try {
		ensureUserDataDir()
		if (fs.existsSync(historyFilePath)) {
			const data = fs.readFileSync(historyFilePath, 'utf-8')
			return JSON.parse(data)
		}
	} catch (e) {
		log('Error loading history:', e)
	}
	return []
})

ipcMain.handle('history:add', async (_event, entry: Omit<HistoryEntry, 'id'>) => {
	try {
		ensureUserDataDir()
		const history: HistoryEntry[] = fs.existsSync(historyFilePath)
			? JSON.parse(fs.readFileSync(historyFilePath, 'utf-8'))
			: []

		const newEntry: HistoryEntry = {
			...entry,
			id: crypto.randomUUID(),
		}
		history.unshift(newEntry)
		fs.writeFileSync(historyFilePath, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS), null, 2), 'utf-8')
		return newEntry
	} catch (e) {
		log('Error adding history entry:', e)
		return null
	}
})

ipcMain.handle('history:update', async (_event, id: string, updates: Partial<HistoryEntry>) => {
	try {
		ensureUserDataDir()
		if (!fs.existsSync(historyFilePath)) return null

		const history: HistoryEntry[] = JSON.parse(fs.readFileSync(historyFilePath, 'utf-8'))
		const index = history.findIndex((h) => h.id === id)
		if (index !== -1) {
			history[index] = { ...history[index], ...updates }
			fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2), 'utf-8')
			return history[index]
		}
		return null
	} catch (e) {
		log('Error updating history entry:', e)
		return null
	}
})

ipcMain.handle('history:clear', async () => {
	try {
		ensureUserDataDir()
		fs.writeFileSync(historyFilePath, JSON.stringify([], null, 2), 'utf-8')
		return true
	} catch (e) {
		log('Error clearing history:', e)
		return false
	}
})

// Document interfaces for persistence
// Uploaded documents - original files user uploaded
interface UploadedDocument {
	id: string
	name: string
	path: string
	sourceLocale?: string
	targetLocale?: string
}

// Processed documents - output files from localization
interface ProcessedDocument {
	id: string
	originalDocId: string
	name: string
	path: string
	status: 'pending' | 'processing' | 'review' | 'approved' | 'exported' | 'error'
	markdown?: string
	localizedText?: string
	error?: string
	progress?: { current: number; total: number }
}

ipcMain.handle('uploaded:load', async () => {
	try {
		ensureUserDataDir()
		const uploadedFilePath = path.join(app.getPath('userData'), 'uploaded.json')
		if (fs.existsSync(uploadedFilePath)) {
			const data = fs.readFileSync(uploadedFilePath, 'utf-8')
			return JSON.parse(data)
		}
	} catch (e) {
		log('Error loading uploaded docs:', e)
	}
	return []
})

ipcMain.handle('uploaded:save', async (_event, documents: UploadedDocument[]) => {
	try {
		ensureUserDataDir()
		const uploadedFilePath = path.join(app.getPath('userData'), 'uploaded.json')
		fs.writeFileSync(uploadedFilePath, JSON.stringify(documents, null, 2), 'utf-8')
		log('Uploaded docs saved to:', uploadedFilePath)
		return true
	} catch (e) {
		log('Error saving uploaded docs:', e)
		return false
	}
})

ipcMain.handle('processed:load', async () => {
	try {
		ensureUserDataDir()
		const processedFilePath = path.join(app.getPath('userData'), 'processed.json')
		if (fs.existsSync(processedFilePath)) {
			const data = fs.readFileSync(processedFilePath, 'utf-8')
			return JSON.parse(data)
		}
	} catch (e) {
		log('Error loading processed docs:', e)
	}
	return []
})

ipcMain.handle('processed:save', async (_event, documents: ProcessedDocument[]) => {
	try {
		ensureUserDataDir()
		const processedFilePath = path.join(app.getPath('userData'), 'processed.json')
		fs.writeFileSync(processedFilePath, JSON.stringify(documents, null, 2), 'utf-8')
		log('Processed docs saved to:', processedFilePath)
		return true
	} catch (e) {
		log('Error saving processed docs:', e)
		return false
	}
})

// Tasks persistence (active processing outputs) using JSON file
const tasksFilePath = path.join(app.getPath('userData'), 'tasks.json')

ipcMain.handle('tasks:load', async () => {
	try {
		ensureUserDataDir()
		if (fs.existsSync(tasksFilePath)) {
			const data = fs.readFileSync(tasksFilePath, 'utf-8')
			return JSON.parse(data)
		}
	} catch (e) {
		log('Error loading tasks docs:', e)
	}
	return []
})

ipcMain.handle('tasks:save', async (_event, documents: ProcessedDocument[]) => {
	try {
		ensureUserDataDir()
		fs.writeFileSync(tasksFilePath, JSON.stringify(documents, null, 2), 'utf-8')
		log('Tasks docs saved to:', tasksFilePath)
		return true
	} catch (e) {
		log('Error saving tasks docs:', e)
		return false
	}
})

// Prompt profiles - stored as .md files in prompts/ directory
const promptsDir = path.join(app.getPath('userData'), 'prompts')

function ensurePromptsDir(): void {
	if (!fs.existsSync(promptsDir)) {
		fs.mkdirSync(promptsDir, { recursive: true })
	}
}

ipcMain.handle('prompts:list', async () => {
	try {
		ensurePromptsDir()
		const files = fs.readdirSync(promptsDir)
		return files.filter((f) => f.endsWith('.md')).sort()
	} catch (e) {
		log('Error listing prompts:', e)
		return []
	}
})

ipcMain.handle('prompts:read', async (_event, filename: string) => {
	try {
		const filePath = path.join(promptsDir, filename)
		if (!filePath.startsWith(promptsDir)) {
			return null // Prevent directory traversal
		}
		return fs.readFileSync(filePath, 'utf-8')
	} catch (e) {
		log('Error reading prompt:', e)
		return null
	}
})

ipcMain.handle('prompts:write', async (_event, filename: string, content: string) => {
	try {
		ensurePromptsDir()
		const filePath = path.join(promptsDir, filename)
		if (!filePath.startsWith(promptsDir)) {
			return false // Prevent directory traversal
		}
		fs.writeFileSync(filePath, content, 'utf-8')
		log('Saved prompt:', filename)
		return true
	} catch (e) {
		log('Error writing prompt:', e)
		return false
	}
})

ipcMain.handle('prompts:delete', async (_event, filename: string) => {
	try {
		const filePath = path.join(promptsDir, filename)
		if (!filePath.startsWith(promptsDir)) {
			return false // Prevent directory traversal
		}
		fs.unlinkSync(filePath)
		log('Deleted prompt:', filename)
		return true
	} catch (e) {
		log('Error deleting prompt:', e)
		return false
	}
})

// Embeddings for translation-memory retrieval.
// Runs in a worker thread, so this handler stays non-blocking.
ipcMain.handle('ai:embed', async (_event, input: string[]): Promise<{ vectors?: number[][]; error?: string }> => {
	if (!Array.isArray(input) || input.length === 0) {
		return { vectors: [] }
	}

	log('ai:embed called, inputs:', input.length)

	try {
		const vectors = await embed(input)
		log('ai:embed produced', vectors.length, 'vectors')
		return { vectors }
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e)
		log('ai:embed error:', message)
		return { error: message }
	}
})

// Translation memory persistence (approved source/target pairs + embeddings)
const memoryFilePath = path.join(app.getPath('userData'), 'memory.json')
const MAX_MEMORY_ENTRIES = 5000

interface StoredMemoryEntry {
	id: string
	documentId: string
	sourceText: string
	translation: string
	sourceLocale: string
	targetLocale: string
	embedding: number[]
	approvedAt: string
}

ipcMain.handle('memory:load', async () => {
	try {
		ensureUserDataDir()
		if (fs.existsSync(memoryFilePath)) {
			return JSON.parse(fs.readFileSync(memoryFilePath, 'utf-8'))
		}
	} catch (e) {
		log('Error loading memory:', e)
	}
	return []
})

ipcMain.handle('memory:save', async (_event, entries: StoredMemoryEntry[]) => {
	try {
		ensureUserDataDir()
		const existing = fs.existsSync(memoryFilePath)
			? (JSON.parse(fs.readFileSync(memoryFilePath, 'utf-8')) as StoredMemoryEntry[])
			: []

		// Replace this document's entries, then append and cap.
		const documentIds = new Set(entries.map((entry) => entry.documentId))
		const merged = [...existing.filter((entry) => !documentIds.has(entry.documentId)), ...entries]

		fs.writeFileSync(memoryFilePath, JSON.stringify(merged.slice(-MAX_MEMORY_ENTRIES), null, 2), 'utf-8')
		return true
	} catch (e) {
		log('Error saving memory:', e)
		return false
	}
})

// AI Generation using Electron's net.fetch (Chromium networking)
ipcMain.handle(
	'ai:generate',
	async (
		_event,
		options: { url: string; body: object }
	): Promise<{ content: string; error?: string; status?: number }> => {
		const { url, body } = options
		log('ai:generate called, URL:', url)

		try {
			const response = await net.fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})

			log('Response status:', response.status)

			if (response.status !== 200) {
				const text = await response.text()
				return {
					content: '',
					error: `HTTP ${response.status}: ${text.substring(0, 500)}`,
					status: response.status,
				}
			}

			const data = (await response.json()) as {
				choices?: Array<{ message?: { content?: string } }>
				message?: { content?: string }
				content?: string
			}
			const content = data.choices?.[0]?.message?.content || data.message?.content || data.content

			if (!content) {
				log('No content extracted from response')
				return { content: '', error: 'No content in response', status: 200 }
			}

			log('Success, content length:', content.length)
			return { content, status: 200 }
		} catch (e) {
			log('Error:', e)
			const errorMessage = e instanceof Error ? e.message : String(e)
			log('Error message details:', JSON.stringify(e))
			// Clean up Chrome network errors for better UX
			let userMessage = errorMessage
			if (errorMessage.includes('ERR_EMPTY_RESPONSE')) {
				userMessage = 'Server did not respond. Please check if your AI server is running.'
			} else if (errorMessage.includes('ERR_CONNECTION_REFUSED')) {
				userMessage = 'Could not connect to server. Please verify your API URL in settings.'
			} else if (errorMessage.includes('ERR_CONNECTION_TIMED_OUT')) {
				userMessage = 'Connection timed out. The server may be busy or unreachable.'
			} else if (errorMessage.includes('net::ERR_')) {
				userMessage = `Connection error: ${errorMessage.replace('net::ERR_', '').replace(/_/g, ' ').toLowerCase()}`
			}
			log('User-facing error:', userMessage)
			return { content: '', error: userMessage }
		}
	}
)
