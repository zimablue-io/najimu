// Document Localizer - Main Application Component
import { Button } from '@doclocalizer/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import DiffView from './components/DiffView'
import DocumentList from './components/DocumentList'
import EmptyState from './components/EmptyState'
import Header from './components/Header'
import HistoryPanel from './components/HistoryPanel'
import SettingsModal from './components/SettingsModal'
import { useDocuments } from './hooks/useDocuments'
import { type AuditEvent, applyReview, pairsFromApproval } from './lib/audit'
import { planBatch } from './lib/batch'
import { isPolarHttpsUrl, parseCommercialCatalog } from './lib/commercial'
import { contentToDocx, contentToPdf, type ExportFormat, getFileExtension } from './lib/export'
import { parseGlossary, renderTermsBlock, termsForLocale } from './lib/glossary'
import { decideLicense } from './lib/license'
import { ALL_LOCALES } from './lib/locales'
import { type MemoryEntry, parseMemory, rememberPairs } from './lib/memory'
import { createProcessingOutput, extractMarkdown, processDocument } from './lib/processing'
import { LOCALE_DETECTION_PROMPT } from './lib/prompts'
import { loadSettings } from './lib/settings'
import type { HistoryEntry, Settings, SourceDocument } from './lib/types'
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
	const [entitled, setEntitled] = useState(false)
	const [checkoutUrl, setCheckoutUrl] = useState('')
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

	const refreshLicense = useCallback(async () => {
		const [rawCatalog, probe] = await Promise.all([
			window.electron.commercialCatalog(),
			window.electron.licenseStatus(),
		])
		const catalog = parseCommercialCatalog(rawCatalog)
		setCheckoutUrl(catalog.checkoutCommercial)
		const decision = decideLicense({
			now: new Date(),
			commercialBenefitId: catalog.commercialBenefitId,
			response: probe.response,
			networkError: probe.networkError,
			cache: probe.cache,
		})
		setEntitled(decision.entitled)
	}, [])

	useEffect(() => {
		void refreshLicense()
	}, [refreshLicense])

	const openBuy = useCallback(() => {
		if (isPolarHttpsUrl(checkoutUrl)) {
			void window.electron.openExternal(checkoutUrl)
			return
		}
		setSettingsTab('commercial')
		setShowSettings(true)
	}, [checkoutUrl])

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

	const detectSourceLocale = useCallback(
		async (markdown: string): Promise<string> => {
			if (!settings) return ''
			const prompt = LOCALE_DETECTION_PROMPT.replace('{text}', markdown.slice(0, 1000))
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
			return result.content?.trim() || ''
		},
		[settings, activeModelName]
	)

	const recordAudit = useCallback(
		async (event: AuditEvent) => {
			if (!entitled) return true
			return window.electron.appendAudit(event)
		},
		[entitled]
	)

	const runProcess = useCallback(
		async (
			sourceDoc: SourceDocument,
			sourceLocale: string,
			targetLocale: string,
			abortController: AbortController
		) => {
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

			let glossaryCount = 0
			try {
				let termsBlock: string | undefined
				let memory: MemoryEntry[] | undefined
				if (entitled) {
					const [glossaryRaw, memoryRaw] = await Promise.all([
						window.electron.loadGlossary(),
						window.electron.loadMemory(),
					])
					const terms = termsForLocale(parseGlossary(glossaryRaw), sourceLocale, targetLocale)
					const block = renderTermsBlock(terms)
					termsBlock = block.length > 0 ? block : undefined
					memory = parseMemory(memoryRaw)
					glossaryCount = terms.length
					const started = await recordAudit({
						time: new Date().toISOString(),
						type: 'process_started',
						documentId: newOutput.id,
						documentName: newOutput.name,
						sourceLocale,
						targetLocale,
						model: activeModelName || undefined,
						promptId: settings.activePromptId,
						glossaryCount,
					})
					if (!started) toast.error('Could not record the start of this run')
				}

				const result = await processDocument({
					sourceDoc,
					apiUrl: settings.apiUrl,
					model: activeModelName,
					customPrompt: activePrompt,
					sourceLocale,
					targetLocale,
					termsBlock,
					memory,
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

				if (!result.success) return

				setTasksDocs((prev) =>
					prev.map((d) =>
						d.id === newOutput.id
							? {
									...d,
									status: 'review',
									localizedText: result.localizedText,
									markdown: result.markdown,
									progress: undefined,
									memoryHits: result.memoryHits,
									glossaryCount,
								}
							: d
					)
				)
				toast.success(`${sourceDoc.name} processed to ${targetLocale}`)

				if (entitled) {
					const finished = await recordAudit({
						time: new Date().toISOString(),
						type: 'process_finished',
						documentId: newOutput.id,
						documentName: newOutput.name,
						sourceLocale,
						targetLocale,
						model: activeModelName || undefined,
						promptId: settings.activePromptId,
						glossaryCount,
						memoryHits: result.memoryHits,
					})
					if (!finished) toast.error('Could not record the finished run')
				}

				if (historyEntry?.id) {
					await window.electron.updateHistory(historyEntry.id, {
						status: 'review',
						chunksProcessed: result.paragraphsProcessed,
					})
				}
			} catch (err) {
				const cleanError = formatError(err)
				if (cleanError === 'cancelled') return

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
		[settings, entitled, activeModelName, activePrompt, setTasksDocs, recordAudit]
	)

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

			const abortController = new AbortController()
			abortControllers.current.set(sourceDocId, abortController)

			let detectedLocale = ''
			try {
				detectedLocale = await detectSourceLocale(await extractMarkdown(sourceDoc))
			} catch (err) {
				abortControllers.current.delete(sourceDocId)
				toast.error(`Failed to read ${sourceDoc.name}: ${formatError(err)}`)
				return
			}

			if (detectedLocale && detectedLocale !== 'unknown' && detectedLocale !== sourceLocale) {
				setPendingLocaleCheck({ sourceDocId, detectedLocale, sourceLocale, targetLocale })
				return
			}

			await runProcess(sourceDoc, sourceLocale, targetLocale, abortController)
		},
		[sourceDocs, settings, isConfigured, detectSourceLocale, runProcess]
	)

	const handleConfirmLocaleMismatch = useCallback(async () => {
		if (!pendingLocaleCheck || !settings) return
		const { sourceDocId, sourceLocale } = pendingLocaleCheck
		setPendingLocaleCheck(null)

		const sourceDoc = sourceDocs.find((d) => d.id === sourceDocId)
		if (!sourceDoc) return

		const targetLocale = sourceDoc.targetLocale
		if (!targetLocale) return

		let abortController = abortControllers.current.get(sourceDocId)
		if (!abortController) {
			abortController = new AbortController()
			abortControllers.current.set(sourceDocId, abortController)
		}

		await runProcess(sourceDoc, sourceLocale, targetLocale, abortController)
	}, [pendingLocaleCheck, sourceDocs, settings, runProcess])

	const handleProcessBatch = useCallback(
		async (documentIds: string[], targetLocales: string[]) => {
			if (!entitled) return
			if (!settings || !isConfigured) {
				toast.error('Please configure API URL and model in settings')
				setShowSettings(true)
				return
			}

			const pairs = planBatch({ entitled: true, documentIds, targetLocales })
			for (const pair of pairs) {
				const sourceDoc = sourceDocs.find((d) => d.id === pair.documentId)
				if (!sourceDoc) continue
				if (!sourceDoc.sourceLocale) {
					toast.error(`Set a source locale for ${sourceDoc.name}`)
					continue
				}

				let detectedLocale = ''
				try {
					detectedLocale = await detectSourceLocale(await extractMarkdown(sourceDoc))
				} catch (err) {
					toast.error(`Failed to read ${sourceDoc.name}: ${formatError(err)}`)
					continue
				}
				if (detectedLocale && detectedLocale !== 'unknown' && detectedLocale !== sourceDoc.sourceLocale) {
					toast.error(
						`${sourceDoc.name}: detected ${detectedLocale}, source locale is ${sourceDoc.sourceLocale}. Skipped.`
					)
					continue
				}

				const abortController = new AbortController()
				abortControllers.current.set(sourceDoc.id, abortController)
				await runProcess(sourceDoc, sourceDoc.sourceLocale, pair.targetLocale, abortController)
				if (abortController.signal.aborted) break
			}
		},
		[entitled, settings, isConfigured, sourceDocs, detectSourceLocale, runProcess]
	)

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

		if (entitled) {
			if (output.markdown && output.localizedText) {
				const saved = await window.electron.saveMemory(
					rememberPairs(
						parseMemory(await window.electron.loadMemory()),
						pairsFromApproval(
							output.markdown,
							output.localizedText,
							output.sourceLocale,
							output.targetLocale
						)
					)
				)
				if (!saved) {
					toast.error('Could not save translation memory')
					return
				}
			}
			const recorded = await recordAudit({
				time: new Date().toISOString(),
				type: 'approved',
				documentId: output.id,
				documentName: output.name,
				sourceLocale: output.sourceLocale,
				targetLocale: output.targetLocale,
				model: activeModelName || undefined,
				promptId: settings?.activePromptId,
				glossaryCount: output.glossaryCount,
				memoryHits: output.memoryHits,
			})
			if (!recorded) {
				toast.error('Could not record the approval')
				return
			}
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
	}, [
		selectedOutputId,
		tasksDocs,
		entitled,
		recordAudit,
		activeModelName,
		settings?.activePromptId,
		updateHistory,
		setTasksDocs,
		setProcessedDocs,
	])

	const handleReject = useCallback(async () => {
		const output = tasksDocs.find((d) => d.id === selectedOutputId)
		if (!output) return

		if (entitled) {
			const recorded = await recordAudit({
				time: new Date().toISOString(),
				type: 'rejected',
				documentId: output.id,
				documentName: output.name,
				sourceLocale: output.sourceLocale,
				targetLocale: output.targetLocale,
				model: activeModelName || undefined,
				promptId: settings?.activePromptId,
			})
			if (!recorded) {
				toast.error('Could not record the rejection')
				return
			}
		}

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
	}, [
		selectedOutputId,
		tasksDocs,
		entitled,
		recordAudit,
		activeModelName,
		settings?.activePromptId,
		updateHistory,
		setTasksDocs,
		setProcessedDocs,
	])

	const handleReviewDecision = useCallback(
		async (decision: 'confirmed' | 'returned', reviewerName: string) => {
			if (!entitled) return
			const output =
				processedDocs.find((d) => d.id === selectedOutputId) ?? tasksDocs.find((d) => d.id === selectedOutputId)
			if (!output || reviewerName.trim().length === 0) return

			const applied = applyReview({
				id: output.id,
				name: output.name,
				sourceLocale: output.sourceLocale,
				targetLocale: output.targetLocale,
				decision,
				reviewerName: reviewerName.trim(),
				now: new Date().toISOString(),
			})
			const recorded = await recordAudit(applied.event)
			if (!recorded) {
				toast.error('Could not record the review')
				return
			}

			if (decision === 'returned') {
				const returned = { ...output, status: applied.status, review: applied.review }
				setProcessedDocs((prev) => prev.filter((d) => d.id !== output.id))
				setTasksDocs((prev) => [...prev.filter((d) => d.id !== output.id), returned])
				toast.success('Returned for another pass')
			} else {
				setProcessedDocs((prev) =>
					prev.map((d) =>
						d.id === output.id ? { ...d, status: 'approved' as const, review: applied.review } : d
					)
				)
				toast.success('Review confirmed')
			}
			setSelectedOutputId(null)
		},
		[entitled, processedDocs, tasksDocs, selectedOutputId, recordAudit, setProcessedDocs, setTasksDocs]
	)

	const handleUpdateLocalizedText = useCallback(
		(paragraphIndex: number, newText: string) => {
			const apply = <T extends { id: string; localizedText?: string }>(docs: T[]) =>
				docs.map((d) => {
					if (d.id !== selectedOutputId) return d
					const paragraphs = (d.localizedText || '').split(/\n\n+/)
					paragraphs[paragraphIndex] = newText
					return { ...d, localizedText: paragraphs.join('\n\n') }
				})
			setTasksDocs(apply)
			setProcessedDocs(apply)
			toast.success('Paragraph updated')
		},
		[selectedOutputId, setTasksDocs, setProcessedDocs]
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
					filters: [
						format === 'pdf'
							? { name: 'PDF', extensions: ['pdf'] }
							: format === 'doc'
								? { name: 'Word Document', extensions: ['doc'] }
								: { name: 'Markdown', extensions: ['md'] },
					],
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
				const markExported = <T extends { id: string; status: string }>(docs: T[]) =>
					docs.map((d) => (d.id === id ? { ...d, status: 'exported' as const } : d))
				setTasksDocs(markExported)
				setProcessedDocs(markExported)
				toast.success(`Exported to ${savePath}`)
				if (entitled) {
					const recorded = await recordAudit({
						time: new Date().toISOString(),
						type: 'exported',
						documentId: output.id,
						documentName: output.name,
						sourceLocale: output.sourceLocale,
						targetLocale: output.targetLocale,
						model: activeModelName || undefined,
						promptId: settings?.activePromptId,
					})
					if (!recorded) toast.error('Could not record the export')
				}
			} catch (err) {
				toast.error(`Export failed: ${formatError(err)}`)
			}
		},
		[
			tasksDocs,
			processedDocs,
			entitled,
			recordAudit,
			activeModelName,
			settings?.activePromptId,
			setTasksDocs,
			setProcessedDocs,
		]
	)

	const selectedOutput =
		tasksDocs.find((d) => d.id === selectedOutputId) ?? processedDocs.find((d) => d.id === selectedOutputId)

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
				commercial={entitled}
			/>

			<main className="flex-1 p-6 overflow-auto">
				{selectedOutputId && selectedOutput && (
					<DiffView
						document={selectedOutput}
						onApprove={handleApprove}
						onReject={handleReject}
						onBack={() => setSelectedOutputId(null)}
						onUpdateLocalizedText={handleUpdateLocalizedText}
						commercial={entitled}
						onConfirmReview={(reviewerName) => void handleReviewDecision('confirmed', reviewerName)}
						onReturnReview={(reviewerName) => void handleReviewDecision('returned', reviewerName)}
						onBuy={openBuy}
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
						commercial={entitled}
						onBuy={openBuy}
						onProcessBatch={(documentIds, targetLocales) =>
							void handleProcessBatch(documentIds, targetLocales)
						}
						onSignOff={setSelectedOutputId}
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
					onCommercialChanged={() => void refreshLicense()}
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
