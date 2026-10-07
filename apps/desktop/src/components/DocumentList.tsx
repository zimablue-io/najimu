import type { DocumentState } from '@najimu/core'
import { Button } from '@najimu/ui'
import { ChevronDown, Eye, File, FileText, FileType, Square, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LocaleSelect, STATUS_COLORS, STATUS_LABELS, StatusIcon } from './document-helpers'

type ExtendedStatus = DocumentState['status'] | 'rejected'

interface SourceDocument {
	id: string
	name: string
	sourceLocale?: string
	targetLocale?: string
}

interface ProcessingOutput {
	id: string
	sourceDocId: string
	sourceDocName: string
	name: string
	path: string
	sourceLocale: string
	targetLocale: string
	status: ExtendedStatus
	markdown?: string
	localizedText?: string
	progress?: { current: number; total: number }
	error?: string
}

interface DocumentListProps {
	sourceDocs: SourceDocument[]
	tasksDocs: ProcessingOutput[]
	processedDocs: ProcessingOutput[]
	locales?: { code: string; name: string }[]
	onProcess: (id: string) => void
	onReview: (id: string) => void
	onRemoveSource: (id: string) => void
	onRemoveTask: (id: string) => void
	onRemoveProcessed: (id: string) => void
	onStop?: (id: string) => void
	onFilesAdded?: (paths: string[]) => void
	onExport?: (id: string, format: 'md' | 'pdf' | 'doc') => void
	onLocaleChange?: (id: string, source?: string, target?: string) => void
}

function ProgressBar({ current, total }: { current: number; total: number }) {
	const percent = total > 0 ? Math.round((current / total) * 100) : 0
	return (
		<div className="flex items-center gap-3">
			<div className="w-[200px] h-2 bg-secondary rounded-full overflow-hidden">
				<div className="h-full bg-primary transition-all duration-300" style={{ width: `${percent}%` }} />
			</div>
			<span className="text-sm text-primary font-medium tabular-nums w-16 text-right">
				{current}/{total}
			</span>
		</div>
	)
}

function sortLocalesWithSelected<T extends { code: string }>(items: T[], selectedCode: string | undefined): T[] {
	if (!items || items.length === 0) return []
	if (!selectedCode) return items

	const selected = items.find((item) => item.code === selectedCode)
	if (!selected) return items

	const rest = items.filter((item) => item.code !== selectedCode)
	return [selected, ...rest]
}

export default function DocumentList({
	sourceDocs,
	tasksDocs,
	processedDocs,
	locales,
	onProcess,
	onReview,
	onRemoveSource,
	onRemoveTask,
	onRemoveProcessed,
	onStop,
	onFilesAdded,
	onExport,
	onLocaleChange,
}: DocumentListProps) {
	const [isDragging, setIsDragging] = useState(false)
	const [showExportMenu, setShowExportMenu] = useState<string | null>(null)
	const [activeTab, setActiveTab] = useState<'uploaded' | 'tasks' | 'processed'>('uploaded')
	const exportMenuRef = useRef<HTMLDivElement>(null)

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(true)
	}, [])

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
		const x = e.clientX
		const y = e.clientY
		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
			setIsDragging(false)
		}
	}, [])

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			e.stopPropagation()
			setIsDragging(false)

			const files = Array.from(e.dataTransfer.files)
			if (files.length === 0) return

			const filePaths = window.electron.getDroppedFilePaths(files)
			const validFiles = filePaths.filter((p) => /\.(pdf|md|markdown)$/i.test(p))

			if (validFiles.length > 0 && onFilesAdded) {
				onFilesAdded(validFiles)
			}
		},
		[onFilesAdded]
	)

	// Close dropdown when clicking outside
	useEffect(() => {
		if (!showExportMenu) return

		const handleClick = (e: MouseEvent) => {
			if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
				setShowExportMenu(null)
			}
		}

		document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [showExportMenu])

	return (
		<div
			className={`h-full flex flex-col ${isDragging ? 'ring-2 ring-primary ring-inset rounded-xl' : ''}`}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{isDragging && (
				<div className="flex-shrink-0 border-2 border-dashed border-primary bg-primary/5 rounded-xl p-8 text-center mb-4">
					<p className="text-lg font-medium text-primary">Drop files to add documents</p>
				</div>
			)}

			<div className="flex-1 overflow-auto">
				{/* Tabs */}
				<div className="flex border-b border-border mb-4">
					<button
						onClick={() => setActiveTab('uploaded')}
						className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
							activeTab === 'uploaded'
								? 'border-primary text-primary'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						}`}
					>
						Uploaded ({sourceDocs.length})
					</button>
					<button
						onClick={() => setActiveTab('tasks')}
						className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
							activeTab === 'tasks'
								? 'border-primary text-primary'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						}`}
					>
						Tasks ({tasksDocs.length})
					</button>
					<button
						onClick={() => setActiveTab('processed')}
						className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
							activeTab === 'processed'
								? 'border-primary text-primary'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						}`}
					>
						Processed ({processedDocs.length})
					</button>
				</div>

				{/* Uploaded tab - Source library */}
				{activeTab === 'uploaded' && sourceDocs.length === 0 && (
					<div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
						<svg
							className="w-16 h-16 mb-4 opacity-50"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-label="Document icon"
							role="img"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						<p className="text-lg">No files uploaded</p>
						<p className="text-sm mt-1">Add files to get started</p>
					</div>
				)}

				{activeTab === 'uploaded' && sourceDocs.length > 0 && (
					<table className="w-full">
						<thead className="sticky top-0 bg-background z-10">
							<tr className="border-b border-border text-left">
								<th className="pb-3 pl-4 text-sm font-semibold text-muted-foreground w-[40%]">
									Document
								</th>
								<th className="pb-3 px-2 text-sm font-semibold text-muted-foreground w-36">Source</th>
								<th className="pb-3 px-2 text-sm font-semibold text-muted-foreground w-36">Target</th>
								<th className="pb-3 pr-4 text-sm font-semibold text-muted-foreground text-right w-36">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{sourceDocs.map((doc) => (
								<tr key={doc.id} className="hover:bg-muted/50 transition-colors">
									<td className="py-3 pl-4">
										<p className="font-medium truncate">{doc.name}</p>
									</td>
									<td className="py-3 px-2">
										<LocaleSelect
											value={doc.sourceLocale || ''}
											onChange={(v) => v && onLocaleChange?.(doc.id, v, undefined)}
											locales={sortLocalesWithSelected(
												locales?.filter((l) => l.code !== doc.targetLocale) || [],
												doc.sourceLocale
											)}
										/>
									</td>
									<td className="py-3 px-2">
										<LocaleSelect
											value={doc.targetLocale || ''}
											onChange={(v) => v && onLocaleChange?.(doc.id, undefined, v)}
											locales={sortLocalesWithSelected(locales || [], doc.targetLocale)}
											showSameLocaleWarning={
												doc.sourceLocale === doc.targetLocale && !!doc.sourceLocale
											}
										/>
									</td>
									<td className="py-3 pr-4">
										<div className="flex items-center justify-end gap-2">
											<Button
												variant="secondary"
												size="sm"
												onClick={() => onProcess(doc.id)}
												disabled={
													!doc.sourceLocale ||
													!doc.targetLocale ||
													!locales?.some((l) => l.code === doc.sourceLocale) ||
													!locales?.some((l) => l.code === doc.targetLocale)
												}
											>
												<Zap className="w-4 h-4 mr-1" />
												Process
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => onRemoveSource(doc.id)}
												aria-label="Remove document"
											>
												<svg
													className="w-4 h-4"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</Button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}

				{/* Tasks tab - Active processing */}
				{activeTab === 'tasks' && tasksDocs.length === 0 && (
					<div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
						<svg
							className="w-16 h-16 mb-4 opacity-50"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-label="Tasks icon"
							role="img"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
							/>
						</svg>
						<p className="text-lg">No active tasks</p>
						<p className="text-sm mt-1">Process files from the Uploaded tab</p>
					</div>
				)}

				{activeTab === 'tasks' && tasksDocs.length > 0 && (
					<table className="w-full">
						<thead className="sticky top-0 bg-background z-10">
							<tr className="border-b border-border text-left">
								<th className="pb-3 pl-4 text-sm font-semibold text-muted-foreground w-[30%]">
									Document
								</th>
								<th className="pb-3 px-4 text-sm font-semibold text-muted-foreground w-28">Locale</th>
								<th className="pb-3 px-4 text-sm font-semibold text-muted-foreground w-28">Status</th>
								<th className="pb-3 px-4 text-sm font-semibold text-muted-foreground w-[280px]">
									Progress
								</th>
								<th className="pb-3 pr-4 text-sm font-semibold text-muted-foreground text-right w-48">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{tasksDocs.map((doc) => (
								<tr key={doc.id} className="hover:bg-muted/50 transition-colors">
									<td className="py-4 pl-4">
										<div className="flex items-center gap-3">
											<StatusIcon status={doc.status} />
											<div className="min-w-0">
												<p className="font-medium text-base truncate">{doc.name}</p>
												<p className="text-sm text-muted-foreground truncate">
													{doc.sourceDocName}
												</p>
												<div className="h-5 mt-0.5">
													{doc.error && doc.status === 'error' && (
														<p className="text-sm text-red-500 truncate">{doc.error}</p>
													)}
												</div>
											</div>
										</div>
									</td>
									<td className="py-4 px-4">
										<span className="text-sm whitespace-nowrap">
											{doc.sourceLocale} → {doc.targetLocale}
										</span>
									</td>
									<td className="py-4 px-4">
										<span className={`text-sm font-medium ${STATUS_COLORS[doc.status]}`}>
											{STATUS_LABELS[doc.status]}
										</span>
									</td>
									<td className="py-4 px-4">
										{(doc.status === 'parsing' || doc.status === 'localizing') && doc.progress ? (
											<ProgressBar current={doc.progress.current} total={doc.progress.total} />
										) : (
											<div className="h-6 flex items-center">
												<span className="text-muted-foreground">—</span>
											</div>
										)}
									</td>
									<td className="py-4 pr-4">
										<div className="flex items-center justify-end gap-2">
											{(doc.status === 'parsing' || doc.status === 'localizing') && onStop && (
												<Button variant="destructive" size="sm" onClick={() => onStop(doc.id)}>
													<Square className="w-4 h-4 mr-1" />
													Stop
												</Button>
											)}
											{doc.status === 'review' && (
												<Button onClick={() => onReview(doc.id)}>
													<Eye className="w-4 h-4 mr-1" />
													Review
												</Button>
											)}
											<Button
												variant="ghost"
												size="icon"
												onClick={() => onRemoveTask(doc.id)}
												aria-label="Remove task"
											>
												<svg
													className="w-4 h-4"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</Button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}

				{/* Processed tab - Completed outputs */}
				{activeTab === 'processed' && processedDocs.length === 0 && (
					<div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
						<svg
							className="w-16 h-16 mb-4 opacity-50"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-label="Completed icon"
							role="img"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<p className="text-lg">No processed documents</p>
						<p className="text-sm mt-1">Completed outputs will appear here</p>
					</div>
				)}

				{activeTab === 'processed' && processedDocs.length > 0 && (
					<table className="w-full">
						<thead className="sticky top-0 bg-background z-10">
							<tr className="border-b border-border text-left">
								<th className="pb-3 pl-4 text-sm font-semibold text-muted-foreground w-[40%]">
									Document
								</th>
								<th className="pb-3 px-4 text-sm font-semibold text-muted-foreground w-28">Locale</th>
								<th className="pb-3 px-4 text-sm font-semibold text-muted-foreground w-28">Status</th>
								<th className="pb-3 pr-4 text-sm font-semibold text-muted-foreground text-right w-40">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{processedDocs.map((doc) => (
								<tr key={doc.id} className="hover:bg-muted/50 transition-colors">
									<td className="py-4 pl-4">
										<div className="flex items-center gap-3">
											<StatusIcon status={doc.status} />
											<div className="min-w-0">
												<p className="font-medium text-base truncate">{doc.name}</p>
												<p className="text-sm text-muted-foreground truncate">
													{doc.sourceDocName}
												</p>
											</div>
										</div>
									</td>
									<td className="py-4 px-4">
										<span className="text-sm whitespace-nowrap">
											{doc.sourceLocale} → {doc.targetLocale}
										</span>
									</td>
									<td className="py-4 px-4">
										<span className={`text-sm font-medium ${STATUS_COLORS[doc.status]}`}>
											{STATUS_LABELS[doc.status]}
										</span>
									</td>
									<td className="py-4 pr-4">
										<div className="flex items-center justify-end gap-2">
											{(doc.status === 'approved' || doc.status === 'exported') && (
												<div className="relative" ref={exportMenuRef}>
													<Button
														variant="default"
														size="sm"
														onClick={() =>
															setShowExportMenu(showExportMenu === doc.id ? null : doc.id)
														}
													>
														Export
														<ChevronDown className="ml-1 w-4 h-4" />
													</Button>
													{showExportMenu === doc.id && (
														<div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[220px]">
															<button
																type="button"
																className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-3"
																onClick={() => {
																	onExport?.(doc.id, 'md')
																	setShowExportMenu(null)
																}}
															>
																<FileText className="w-5 h-5 text-primary shrink-0" />
																<span className="whitespace-nowrap">
																	Markdown (.md)
																</span>
															</button>
															<button
																className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-3"
																onClick={() => {
																	onExport?.(doc.id, 'pdf')
																	setShowExportMenu(null)
																}}
															>
																<FileType className="w-5 h-5 text-primary shrink-0" />
																<span className="whitespace-nowrap">PDF (.pdf)</span>
															</button>
															<button
																type="button"
																className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-3"
																onClick={() => {
																	onExport?.(doc.id, 'doc')
																	setShowExportMenu(null)
																}}
															>
																<File className="w-5 h-5 text-primary shrink-0" />
																<span className="whitespace-nowrap">
																	Word Document (.docx)
																</span>
															</button>
														</div>
													)}
												</div>
											)}
											<Button
												variant="ghost"
												size="icon"
												onClick={() => onRemoveProcessed(doc.id)}
												aria-label="Remove document"
											>
												<svg
													className="w-4 h-4"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</Button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	)
}
