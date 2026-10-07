// Najimu - Main Application Component
import { Button } from '@najimu/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import DiffView from './components/DiffView'
import DocumentList from './components/DocumentList'
import EmptyState from './components/EmptyState'
import Header from './components/Header'
import HistoryPanel from './components/HistoryPanel'
import SettingsModal from './components/SettingsModal'
import { useDocuments } from './hooks/useDocuments'
import { contentToDocx, contentToPdf, ExportFormat, getFileExtension, getFilterForFormat } from './lib/export'
import { ALL_LOCALES } from './lib/locales'
import { createProcessingOutput, extractMarkdown, processDocument, recordApprovedDocument } from './lib/processing'
import { LOCALE_DETECTION_PROMPT } from './lib/prompts'
import { loadSettings } from './lib/settings'
import type { HistoryEntry, Settings } from './lib/types'
import { formatError } from './lib/utils'

export default function App() {
	const {
		sourceDocs,
		tasksDocs,
		processedDocs,
		history,
		isLoading,
		setTasksDocs,
		setProcessedDocs,
		addSourceDocs,
		removeSourceDoc,
		removeTaskDoc,
		removeProcessedDoc,
		updateSourceLocales,
		updateHistory,
		clearHistory,
	} = useDocuments()

	const [settings, setSettings] = useState<Settings | null>(null)
	const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null)
	const [showSettings, setShowSettings] = useState(false)
	const [settingsTab, setSettingsTab] = useState<string>('locales')
	const [showHistory, setShowHistory] = useState(false)
	const [connectionRefreshKey] = useState(0)
	const [activePrompt, setActivePrompt] = useState<string>('')
	const [promptList, setPromptList] = useState<string[]>([])
	const [appVersion, setAppVersion] = useState<string>('')
	const [updateInfo, setUpdateInfo] = useState<{ version: string } | null>(null)
	const handlePromptListRefresh = useCallback(
		async (newPromptId?: string) => {
			const prompts = await window.electron.listPrompts()
			setPromptList(prompts)
			// Also reload active prompt content
			const promptId = newPromptId || settings?.activePromptId
			if (promptId) {
				const content = await window.electron.readPrompt(promptId)
				if (content) setActivePrompt(content)
			}
		},
		[settings?.activePromptId]
	)
	const handleModelsRefresh = useCallback(() => {
		void loadSettings().then(setSettings)
	}, [])
	const [pendingLocaleCheck, setPendingLocaleCheck] = useState<{
		sourceDocId: string
		detectedLocale: string
		sourceLocale: string
		targetLocale: string
	} | null>(null)
	const abortControllers = useRef<Map<string, AbortController>>(new Map())

	// Load settings on mount
	useEffect(() => {
		void loadSettings().then(setSettings)
	}, [])

	// Load app version on mount
	useEffect(() => {
		window.electron.appVersion().then(setAppVersion)
	}, [])

	// Listen for update available events
	useEffect(() => {
		window.electron.onUpdateAvailable((data) => {
			setUpdateInfo(data)
		})
	}, [])

	const handleCheckForUpdates = useCallback(() => {
		toast.info('Checking for updates...')
		window.electron.checkForUpdates().then((result) => {
			if ('dev' in result) {
				toast.info('Update check not available in development mode')
			}
		})
	}, [])

	// Load prompt list on mount
	useEffect(() => {
		window.electron.listPrompts().then(setPromptList)
	}, [])

	// Load active prompt when settings or activePromptId changes
	useEffect(() => {
		if (settings?.activePromptId) {
			window.electron.readPrompt(settings.activePromptId).then((content) => {
				if (content) setActivePrompt(content)
			})
		}
	}, [settings?.activePromptId])

	const isConfigured = settings?.apiUrl && settings?.models?.length

	const activeModelName =
		settings?.models?.find((m) => m.id === settings.activeModelId)?.name || settings?.models?.[0]?.name || ''

	const handleSelectFiles = useCallback(async () => {
		try {
			const files = await window.electron.openFile({ multiple: true })
			if (files && files.length > 0) {
				const newDocs = addSourceDocs(files)
				toast.success(`Added ${newDocs.length} file(s)`)
			}
		} catch {
			toast.error('Failed to select files')
		}
	}, [addSourceDocs])

	const handleProcess = useCallback(
		async (sourceDocId: string) => {
			const sourceDoc = sourceDocs.find((d) => d.id === sourceDocId)
			if (!sourceDoc) {
				toast.error('Document not found')
				return
			}

			if (!settings || !isConfigured) {
				toast.error('Please configure API URL and model in settings')
				setShowSettings(true)
				return
			}

			const sourceLocale = sourceDoc.sourceLocale
			const targetLocale = sourceDoc.targetLocale

			if (!sourceLocale || !targetLocale) {
				toast.error('Please set source and target locales before processing')
				return
			}

			// Create abort controller EARLY so stop can work during locale detection
			const abortController = new AbortController()
			abortControllers.current.set(sourceDocId, abortController)

			// Detect locale before processing
			const markdown = await extractMarkdown(sourceDoc)
			const sampleText = markdown.slice(0, 1000) // Sample first 1000 chars

			// Use AI to detect locale
			const prompt = LOCALE_DETECTION_PROMPT.replace('{text}', sampleText)
			const result = await window.electron.generateAI({
				url: `${settings.apiUrl}/chat/completions`,
				body: {
					model: activeModelName,
					messages: [{ role: 'user', content: prompt }],
					temperature: 0.2,
					max_tokens: 50,
					stream: false,
				},
			})

			const detectedLocale = result.content?.trim() || ''

			// If detected locale differs from selected source locale, prompt confirmation
			if (detectedLocale && detectedLocale !== 'unknown' && detectedLocale !== sourceLocale) {
				setPendingLocaleCheck({ sourceDocId, detectedLocale, sourceLocale, targetLocale })
				return
			}

			// Proceed with processing
			if (!settings) return

			const newOutput = createProcessingOutput(sourceDoc, targetLocale)
			setTasksDocs((prev) => [...prev, newOutput])
			toast.info(`Processing ${sourceDoc.name} to ${targetLocale}...`)

			let historyEntry: Awaited<ReturnType<typeof window.electron.addHistory>> | undefined
			try {
				historyEntry = await window.electron.addHistory({
					fileName: sourceDoc.name,
					filePath: sourceDoc.path,
					sourceLocale,
					targetLocale,
					processedAt: new Date().toISOString(),
					status: 'processed',
				})
			} catch (err) {
				toast.error(`Failed to create history entry: ${formatError(err)}`)
				return
			}

			try {
				const result = await processDocument({
					sourceDoc,
					apiUrl: settings.apiUrl,
					model: activeModelName,
					customPrompt: activePrompt,
					sourceLocale,
					targetLocale,
					shouldContinue: () => !abortController.signal.aborted,
					onStatusChange: (status, progress) => {
						setTasksDocs((prev) =>
							prev.map((d) => (d.id === newOutput.id ? { ...d, status, progress } : d))
						)
					},
					onProgress: (current, total) => {
						setTasksDocs((prev) =>
							prev.map((d) =>
								d.id === newOutput.id ? { ...d, progress: { current, total, phase: 'localizing' } } : d
							)
						)
					},
					onIntermediateWrite: async (text) => {
						await window.electron.writeTextFile(newOutput.path, text)
					},
				})

				// If cancelled/stopped, don't update UI or show success
				if (!result.success) {
					return
				}

				setTasksDocs((prev) =>
					prev.map((d) =>
						d.id === newOutput.id
							? {
									...d,
									status: 'review',
									localizedText: result.localizedText,
									markdown: result.markdown,
									progress: undefined,
								}
							: d
					)
				)
				toast.success(`${sourceDoc.name} processed to ${targetLocale}`)

				if (historyEntry?.id) {
					await window.electron.updateHistory(historyEntry.id, {
						status: 'review',
						chunksProcessed: result.paragraphsProcessed,
					})
				}
			} catch (err) {
				const cleanError = formatError(err)

				// 'cancelled' means user stopped - task already removed, nothing to do
				if (cleanError === 'cancelled') {
					return
				}

				setTasksDocs((prev) =>
					prev.map((d) =>
						d.id === newOutput.id ? { ...d, status: 'error', error: cleanError, progress: undefined } : d
					)
				)
				toast.error(`Failed to process ${sourceDoc.name}: ${cleanError}`)

				if (historyEntry?.id) {
					await window.electron.updateHistory(historyEntry.id, {
						status: 'error',
						errorMessage: cleanError,
					})
				}
			}
		},
		[sourceDocs, settings, isConfigured, activeModelName, activePrompt, setTasksDocs]
	)

	const handleConfirmLocaleMismatch = useCallback(async () => {
		if (!pendingLocaleCheck || !settings) return
		const { sourceDocId, sourceLocale } = pendingLocaleCheck
		setPendingLocaleCheck(null)

		const sourceDoc = sourceDocs.find((d) => d.id === sourceDocId)
		if (!sourceDoc) return

		const targetLocale = sourceDoc.targetLocale
		if (!targetLocale) return

		// Reuse or create abort controller keyed by sourceDocId
		let abortController = abortControllers.current.get(sourceDocId)
		if (!abortController) {
			abortController = new AbortController()
			abortControllers.current.set(sourceDocId, abortController)
		}

		const newOutput = createProcessingOutput(sourceDoc, targetLocale)
		setTasksDocs((prev) => [...prev, newOutput])
		toast.info(`Processing ${sourceDoc.name} to ${targetLocale}...`)

		let historyEntry: Awaited<ReturnType<typeof window.electron.addHistory>> | undefined
		try {
			historyEntry = await window.electron.addHistory({
				fileName: sourceDoc.name,
				filePath: sourceDoc.path,
				sourceLocale,
				targetLocale,
				processedAt: new Date().toISOString(),
				status: 'processed',
			})
		} catch (err) {
			toast.error(`Failed to create history entry: ${formatError(err)}`)
			return
		}

		try {
			const result = await processDocument({
				sourceDoc,
				apiUrl: settings.apiUrl,
				model: activeModelName,
				customPrompt: activePrompt,
				sourceLocale,
				targetLocale,
				shouldContinue: () => !abortController.signal.aborted,
				onStatusChange: (status, progress) => {
					setTasksDocs((prev) => prev.map((d) => (d.id === newOutput.id ? { ...d, status, progress } : d)))
				},
				onProgress: (current, total) => {
					setTasksDocs((prev) =>
						prev.map((d) =>
							d.id === newOutput.id ? { ...d, progress: { current, total, phase: 'localizing' } } : d
						)
					)
				},
				onIntermediateWrite: async (text) => {
					await window.electron.writeTextFile(newOutput.path, text)
				},
			})

			// If cancelled/stopped, don't update UI or show success
			if (!result.success) {
				return
			}

			setTasksDocs((prev) =>
				prev.map((d) =>
					d.id === newOutput.id
						? {
								...d,
								status: 'review',
								localizedText: result.localizedText,
								markdown: result.markdown,
								progress: undefined,
							}
						: d
				)
			)
			toast.success(`${sourceDoc.name} processed to ${targetLocale}`)

			if (historyEntry?.id) {
				await window.electron.updateHistory(historyEntry.id, {
					status: 'review',
					chunksProcessed: result.paragraphsProcessed,
				})
			}
		} catch (err) {
			const cleanError = formatError(err)

			// 'cancelled' means user stopped - task already removed, nothing to do
			if (cleanError === 'cancelled') {
				return
			}

			setTasksDocs((prev) =>
				prev.map((d) =>
					d.id === newOutput.id ? { ...d, status: 'error', error: cleanError, progress: undefined } : d
				)
			)
			toast.error(`Failed to process ${sourceDoc.name}: ${cleanError}`)

			if (historyEntry?.id) {
				await window.electron.updateHistory(historyEntry.id, {
					status: 'error',
					errorMessage: cleanError,
				})
			}
		}
	}, [pendingLocaleCheck, sourceDocs, settings, activeModelName, activePrompt, setTasksDocs])

	const handleStop = useCallback(
		(id: string) => {
			// Find the task to get its sourceDocId
			const task = tasksDocs.find((d) => d.id === id)
			if (!task) {
				// Task not in list, might be in locale check phase - try to abort by sourceDocId
				const controller = abortControllers.current.get(id)
				if (controller) {
					controller.abort()
					abortControllers.current.delete(id)
				}
				return
			}

			// Abort using sourceDocId
			const controller = abortControllers.current.get(task.sourceDocId)
			if (controller) {
				controller.abort()
				abortControllers.current.delete(task.sourceDocId)
			}
			setTasksDocs((prev) => prev.filter((d) => d.id !== id))
			toast.info('Processing stopped')
		},
		[tasksDocs, setTasksDocs]
	)

	const handleApprove = useCallback(async () => {
		const output = tasksDocs.find((d) => d.id === selectedOutputId)
		if (!output) return

		// Record approved translations before the task leaves state, so the
		// source/target text is still available for embedding.
		if (output.markdown && output.localizedText) {
			await recordApprovedDocument({
				documentId: output.id,
				sourceText: output.markdown,
				translatedText: output.localizedText,
				sourceLocale: output.sourceLocale,
				targetLocale: output.targetLocale,
			})
		}

		setTasksDocs((prev) => prev.filter((d) => d.id !== selectedOutputId))
		setProcessedDocs((prev) => [...prev, { ...output, status: 'approved' as const }])
		setSelectedOutputId(null)
		toast.success('Document approved')

		const historyEntries = (await window.electron.getHistory()) as HistoryEntry[]
		const entry = historyEntries.find((h) => h.filePath === output.path)
		if (entry) {
			await window.electron.updateHistory(entry.id, { status: 'approved' })
			updateHistory((await window.electron.getHistory()) as HistoryEntry[])
		}
	}, [selectedOutputId, tasksDocs, updateHistory, setTasksDocs, setProcessedDocs])

	const handleReject = useCallback(async () => {
		const output = tasksDocs.find((d) => d.id === selectedOutputId)
		if (!output) return

		setTasksDocs((prev) => prev.filter((d) => d.id !== selectedOutputId))
		setProcessedDocs((prev) => [...prev, { ...output, status: 'rejected' as const }])
		setSelectedOutputId(null)
		toast.success('Document rejected')

		const historyEntries = (await window.electron.getHistory()) as HistoryEntry[]
		const entry = historyEntries.find((h) => h.filePath === output.path)
		if (entry) {
			await window.electron.updateHistory(entry.id, { status: 'rejected' })
			updateHistory((await window.electron.getHistory()) as HistoryEntry[])
		}
	}, [selectedOutputId, tasksDocs, updateHistory, setTasksDocs, setProcessedDocs])

	const handleUpdateLocalizedText = useCallback(
		(paragraphIndex: number, newText: string) => {
			setTasksDocs((prev) =>
				prev.map((d) => {
					if (d.id !== selectedOutputId) return d

					const paragraphs = (d.localizedText || '').split(/\n\n+/)
					paragraphs[paragraphIndex] = newText

					return {
						...d,
						localizedText: paragraphs.join('\n\n'),
					}
				})
			)
			toast.success('Paragraph updated')
		},
		[selectedOutputId, setTasksDocs]
	)

	const handleExport = useCallback(
		async (id: string, format: ExportFormat) => {
			const output = tasksDocs.find((d) => d.id === id) || processedDocs.find((d) => d.id === id)
			if (!output) {
				toast.error('Document not found')
				return
			}
			if (!output.localizedText) {
				toast.error('No localized text to export')
				return
			}

			try {
				const baseFilename = output.sourceDocName.replace(/\.[^.]+$/, '')
				const extension = getFileExtension(format)
				const defaultFilename = `${baseFilename}.localized${extension}`

				const savePath = await window.electron.saveFile({
					defaultPath: defaultFilename,
					filters: [getFilterForFormat(format)],
				})

				if (!savePath) return

				if (format === 'pdf') {
					const pdfBlob = contentToPdf(output.localizedText, baseFilename)
					const arrayBuffer = await pdfBlob.arrayBuffer()
					const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
					await window.electron.writeBase64File(savePath, base64)
				} else if (format === 'doc') {
					const docBlob = await contentToDocx(output.localizedText)
					const arrayBuffer = await docBlob.arrayBuffer()
					const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
					await window.electron.writeBase64File(savePath, base64)
				} else {
					await window.electron.writeTextFile(savePath, output.localizedText)
				}
				toast.success(`Exported to ${savePath}`)
			} catch (err) {
				toast.error(`Export failed: ${formatError(err)}`)
			}
		},
		[tasksDocs, processedDocs]
	)

	const selectedOutput = tasksDocs.find((d) => d.id === selectedOutputId)

	// Loading state
	if (isLoading) {
		return (
			<div className="h-screen bg-background text-foreground flex items-center justify-center">
				<div className="text-center">
					<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
					<p>Loading...</p>
				</div>
			</div>
		)
	}

	return (
		<div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
			<Toaster position="bottom-right" richColors closeButton />

			<Header
				models={settings?.models}
				activeModelId={settings?.activeModelId}
				promptList={promptList}
				activePromptId={settings?.activePromptId}
				apiUrl={settings?.apiUrl}
				isConfigured={!!isConfigured}
				connectionRefreshKey={connectionRefreshKey}
				appVersion={appVersion}
				updateInfo={updateInfo}
				onSelectFiles={handleSelectFiles}
				onOpenSettings={() => setShowSettings(true)}
				onOpenSettingsTab={(tab) => {
					setSettingsTab(tab)
					setShowSettings(true)
				}}
				onOpenHistory={() => setShowHistory(true)}
				onModelChange={(modelId) => setSettings((prev) => (prev ? { ...prev, activeModelId: modelId } : null))}
				onPromptChange={(promptId) =>
					setSettings((prev) => (prev ? { ...prev, activePromptId: promptId } : null))
				}
				onCheckForUpdates={handleCheckForUpdates}
			/>

			<main className="flex-1 p-6 overflow-auto">
				{selectedOutputId && selectedOutput && (
					<DiffView
						document={selectedOutput}
						onApprove={handleApprove}
						onReject={handleReject}
						onBack={() => setSelectedOutputId(null)}
						onUpdateLocalizedText={handleUpdateLocalizedText}
					/>
				)}

				{!selectedOutputId &&
					sourceDocs.length === 0 &&
					tasksDocs.length === 0 &&
					processedDocs.length === 0 && (
						<EmptyState onFilesAdded={addSourceDocs} onSelectFiles={handleSelectFiles} />
					)}

				{!selectedOutputId && (sourceDocs.length > 0 || tasksDocs.length > 0 || processedDocs.length > 0) && (
					<DocumentList
						sourceDocs={sourceDocs}
						tasksDocs={tasksDocs}
						processedDocs={processedDocs}
						locales={
							settings?.enabledLocaleCodes?.length
								? ALL_LOCALES.filter((l) => settings.enabledLocaleCodes.includes(l.code))
								: ALL_LOCALES
						}
						onProcess={handleProcess}
						onReview={setSelectedOutputId}
						onRemoveSource={removeSourceDoc}
						onRemoveTask={removeTaskDoc}
						onRemoveProcessed={removeProcessedDoc}
						onStop={handleStop}
						onFilesAdded={addSourceDocs}
						onExport={handleExport}
						onLocaleChange={(id, source, target) => {
							updateSourceLocales(id, source, target)
						}}
					/>
				)}
			</main>

			{showSettings && settings && (
				<SettingsModal
					settings={settings}
					initialTab={settingsTab}
					onChange={setSettings}
					onClose={() => setShowSettings(false)}
					onPromptListRefresh={handlePromptListRefresh}
					onModelsRefresh={handleModelsRefresh}
				/>
			)}

			<HistoryPanel
				history={history}
				isOpen={showHistory}
				onClose={() => setShowHistory(false)}
				onClear={clearHistory}
			/>

			{/* Locale Mismatch Confirmation Dialog */}
			{pendingLocaleCheck && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-card rounded-lg border border-border p-6 w-full max-w-md">
						<h3 className="text-lg font-semibold mb-2">Locale Mismatch Detected</h3>
						<p className="text-muted-foreground mb-4">
							Document appears to be in <strong>{pendingLocaleCheck.detectedLocale}</strong>, but you
							selected <strong>{pendingLocaleCheck.sourceLocale}</strong> as the source locale.
						</p>
						{pendingLocaleCheck.detectedLocale === pendingLocaleCheck.sourceLocale && (
							<div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg mb-4">
								<svg
									className="w-5 h-5 text-orange-500 shrink-0 mt-0.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
								<div>
									<p className="text-sm font-medium text-orange-500">Same locale selected</p>
									<p className="text-xs text-orange-500/80 mt-0.5">
										Ensure you have a custom prompt configured to define the transformation
									</p>
								</div>
							</div>
						)}
						<p className="text-sm text-muted-foreground mb-6">
							This may result in unnecessary processing if the document is already in your selected
							locale.
						</p>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => {
									// Abort the in-progress locale detection
									const controller = abortControllers.current.get(pendingLocaleCheck.sourceDocId)
									if (controller) {
										controller.abort()
										abortControllers.current.delete(pendingLocaleCheck.sourceDocId)
									}
									setPendingLocaleCheck(null)
								}}
							>
								Cancel
							</Button>
							<Button onClick={handleConfirmLocaleMismatch}>Continue Anyway</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
