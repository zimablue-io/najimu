import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, net, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { type AuditEvent, auditEventsToCsv, parseAuditLine } from '../src/lib/audit'
import { type CommercialCatalog, isPolarHttpsUrl, POLAR_API_BASE, parseCommercialCatalog } from '../src/lib/commercial'
import { parseGlossary } from '../src/lib/glossary'
import {
	activationIdFromPolar,
	cacheFromStored,
	type LicenseProbe,
	type StoredLicense,
	snapshotFromPolar,
} from '../src/lib/license'
import { parseMemory } from '../src/lib/memory'

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
		title: 'Document Localizer',
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
const licenseFilePath = path.join(app.getPath('userData'), 'license.json')
const glossaryFilePath = path.join(app.getPath('userData'), 'glossary.json')
const memoryFilePath = path.join(app.getPath('userData'), 'memory.json')
const auditFilePath = path.join(app.getPath('userData'), 'audit.jsonl')

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

function readStoredLicense(): StoredLicense | null {
	try {
		if (!fs.existsSync(licenseFilePath)) return null
		const parsed = JSON.parse(fs.readFileSync(licenseFilePath, 'utf-8')) as StoredLicense
		if (!parsed || typeof parsed.key !== 'string' || parsed.key.length === 0) return null
		return parsed
	} catch (e) {
		log('Error loading license:', e)
		return null
	}
}

function writeStoredLicense(stored: StoredLicense): void {
	ensureUserDataDir()
	fs.writeFileSync(licenseFilePath, JSON.stringify(stored, null, 2), 'utf-8')
}

function readCommercialCatalog(): CommercialCatalog {
	const candidates = [
		process.env.DOCLZ_COMMERCIAL_CATALOG,
		path.join(app.getAppPath(), 'commercial.public.json'),
		path.join(app.getAppPath(), 'dist-electron', 'commercial.public.json'),
	].filter((value): value is string => typeof value === 'string' && value.length > 0)
	for (const filePath of candidates) {
		try {
			if (!fs.existsSync(filePath)) continue
			return parseCommercialCatalog(JSON.parse(fs.readFileSync(filePath, 'utf-8')))
		} catch {
			log('Commercial catalog unreadable')
		}
	}
	return parseCommercialCatalog(null)
}

async function polarPost(pathname: string, body: Record<string, unknown>): Promise<unknown> {
	const response = await net.fetch(`${POLAR_API_BASE}${pathname}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	if (!response.ok) {
		throw new Error(`Polar responded ${response.status}`)
	}
	return response.json()
}

function emptyProbe(key: string | null, error?: string): LicenseProbe {
	return { key, response: null, networkError: false, cache: null, error }
}

async function refreshLicense(key: string, activationId: string | null): Promise<LicenseProbe> {
	const organizationId = readCommercialCatalog().organizationId
	if (!organizationId) {
		return emptyProbe(key, 'Commercial catalog is not configured')
	}

	const previous = readStoredLicense()
	let nextActivation = activationId
	try {
		if (!nextActivation) {
			const activated = await polarPost('/customer-portal/license-keys/activate', {
				key,
				organization_id: organizationId,
				label: os.hostname(),
			})
			nextActivation = activationIdFromPolar(activated)
		}
		const validated = await polarPost('/customer-portal/license-keys/validate', {
			key,
			organization_id: organizationId,
			...(nextActivation ? { activation_id: nextActivation } : {}),
		})
		const snapshot = snapshotFromPolar(validated)
		const stored: StoredLicense = {
			key,
			activationId: nextActivation,
			benefitId: snapshot?.benefitId ?? null,
			expiresAt: snapshot?.expiresAt ?? null,
			status: snapshot?.status ?? null,
			lastValidatedAt: new Date().toISOString(),
		}
		writeStoredLicense(stored)
		return {
			key,
			response: snapshot,
			networkError: false,
			cache: cacheFromStored(stored),
		}
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e)
		const networkError = /fetch|network|ENOTFOUND|ECONN|timed out|ERR_/i.test(message)
		const cache = previous?.key === key ? cacheFromStored(previous) : null
		log('License check failed')
		return { key, response: null, networkError, cache, error: message }
	}
}

ipcMain.handle('commercial:catalog', () => readCommercialCatalog())

ipcMain.handle('license:status', async (): Promise<LicenseProbe> => {
	const stored = readStoredLicense()
	if (!stored) return emptyProbe(null)
	return refreshLicense(stored.key, stored.activationId)
})

ipcMain.handle('license:activate', async (_event, key: unknown): Promise<LicenseProbe> => {
	if (typeof key !== 'string' || key.trim().length === 0) {
		return emptyProbe(null, 'Enter a license key')
	}
	const trimmed = key.trim()
	const stored = readStoredLicense()
	const activationId = stored?.key === trimmed ? stored.activationId : null
	return refreshLicense(trimmed, activationId)
})

ipcMain.handle('license:clear', async () => {
	try {
		if (fs.existsSync(licenseFilePath)) fs.unlinkSync(licenseFilePath)
		return true
	} catch (e) {
		log('Error clearing license:', e)
		return false
	}
})

ipcMain.handle('shell:openExternal', async (_event, url: unknown) => {
	if (typeof url !== 'string' || !isPolarHttpsUrl(url)) {
		throw new Error('Invalid Polar URL')
	}
	await shell.openExternal(url)
	return true
})

ipcMain.handle('glossary:load', async () => {
	try {
		ensureUserDataDir()
		if (!fs.existsSync(glossaryFilePath)) return []
		return parseGlossary(JSON.parse(fs.readFileSync(glossaryFilePath, 'utf-8')))
	} catch (e) {
		log('Error loading glossary:', e)
		return []
	}
})

ipcMain.handle('glossary:save', async (_event, entries: unknown) => {
	try {
		ensureUserDataDir()
		fs.writeFileSync(glossaryFilePath, JSON.stringify(parseGlossary(entries), null, 2), 'utf-8')
		return true
	} catch (e) {
		log('Error saving glossary:', e)
		return false
	}
})

ipcMain.handle('memory:load', async () => {
	try {
		ensureUserDataDir()
		if (!fs.existsSync(memoryFilePath)) return []
		return parseMemory(JSON.parse(fs.readFileSync(memoryFilePath, 'utf-8')))
	} catch (e) {
		log('Error loading memory:', e)
		return []
	}
})

ipcMain.handle('memory:save', async (_event, entries: unknown) => {
	try {
		ensureUserDataDir()
		fs.writeFileSync(memoryFilePath, JSON.stringify(parseMemory(entries), null, 2), 'utf-8')
		return true
	} catch (e) {
		log('Error saving memory:', e)
		return false
	}
})

ipcMain.handle('audit:append', async (_event, event: AuditEvent) => {
	try {
		ensureUserDataDir()
		fs.appendFileSync(auditFilePath, `${JSON.stringify(event)}\n`, 'utf-8')
		return true
	} catch (e) {
		log('Error appending audit event:', e)
		return false
	}
})

ipcMain.handle('audit:export', async () => {
	try {
		const savePath = await dialog.showSaveDialog({
			defaultPath: 'document-localizer-review.csv',
			filters: [{ name: 'CSV', extensions: ['csv'] }],
		})
		if (savePath.canceled || !savePath.filePath) return null
		const lines = fs.existsSync(auditFilePath) ? fs.readFileSync(auditFilePath, 'utf-8').split('\n') : []
		const events = lines.map(parseAuditLine).filter((event): event is AuditEvent => event !== null)
		fs.writeFileSync(savePath.filePath, auditEventsToCsv(events), 'utf-8')
		return savePath.filePath
	} catch (e) {
		log('Error exporting audit:', e)
		return null
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
