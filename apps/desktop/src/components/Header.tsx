import { Button } from '@doclocalizer/ui'
import { ChevronDown, FolderOpen, History, Plus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Custom hook for connection checking
function useConnectionCheck(apiUrl: string | undefined, _refreshKey?: number) {
	const [isOnline, setIsOnline] = useState(false)
	const [isChecking, setIsChecking] = useState(false)

	const check = useCallback(async () => {
		if (!apiUrl) {
			setIsOnline(false)
			return
		}
		setIsChecking(true)
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 3000)
			const response = await fetch(`${apiUrl}/models`, {
				method: 'GET',
				signal: controller.signal,
			})
			clearTimeout(timeoutId)
			setIsOnline(response.ok)
		} catch {
			setIsOnline(false)
		} finally {
			setIsChecking(false)
		}
	}, [apiUrl])

	useEffect(() => {
		void check()
	}, [check])

	return { isOnline, isChecking, retry: check }
}

interface ModelConfig {
	id: string
	name: string
}

interface HeaderProps {
	models?: ModelConfig[]
	activeModelId?: string
	promptList?: string[]
	activePromptId?: string
	apiUrl?: string
	isConfigured: boolean
	connectionRefreshKey?: number
	appVersion?: string
	updateInfo?: { version: string } | null
	onSelectFiles: () => void
	onOpenSettings: () => void
	onOpenSettingsTab?: (tab: string) => void
	onOpenHistory: () => void
	onModelChange?: (modelId: string) => void
	onPromptChange?: (promptId: string) => void
	onCheckForUpdates?: () => void
	commercial?: boolean
}

export default function Header({
	models,
	activeModelId,
	promptList,
	activePromptId,
	apiUrl,
	isConfigured,
	connectionRefreshKey,
	appVersion,
	updateInfo,
	onSelectFiles,
	onOpenSettings,
	onOpenSettingsTab,
	onOpenHistory,
	onModelChange,
	onPromptChange,
	onCheckForUpdates,
	commercial = false,
}: HeaderProps) {
	const processingCount = 0
	const [showModelDropdown, setShowModelDropdown] = useState(false)
	const [showPromptDropdown, setShowPromptDropdown] = useState(false)
	const modelDropdownRef = useRef<HTMLDivElement>(null)
	const promptDropdownRef = useRef<HTMLDivElement>(null)

	const { isOnline, isChecking, retry: handleRetryConnection } = useConnectionCheck(apiUrl, connectionRefreshKey)

	const activeModel = models?.find((m) => m.id === activeModelId) || models?.[0]

	// Close model dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
				setShowModelDropdown(false)
			}
			if (promptDropdownRef.current && !promptDropdownRef.current.contains(event.target as Node)) {
				setShowPromptDropdown(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	return (
		<header className="border-b border-border px-6 py-4 flex items-center justify-between">
			<div className="flex items-center gap-4">
				<h1 className="text-xl font-semibold">Document Localizer</h1>
				<button
					type="button"
					onClick={() => onOpenSettingsTab?.('commercial')}
					className="px-2.5 py-1 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
				>
					{commercial ? 'Commercial' : 'Free'}
				</button>

				{/* Model Dropdown */}
				{models && models.length > 0 ? (
					<div className="relative" ref={modelDropdownRef}>
						<div
							role="button"
							tabIndex={0}
							onClick={() => {
								if (processingCount === 0) {
									setShowModelDropdown(!showModelDropdown)
								}
							}}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									if (processingCount === 0) {
										setShowModelDropdown(!showModelDropdown)
									}
								}
							}}
							className={`flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-md hover:bg-secondary/80 transition-colors ${
								processingCount > 0 ? 'cursor-default' : 'cursor-pointer'
							}`}
							title={`Model: ${activeModel?.name}\nAPI: ${apiUrl}\n${processingCount > 0 ? 'Processing documents...' : 'Click to change model'}`}
						>
							<span>{activeModel?.name}</span>
							<div className="relative group">
								<span
									className={`block w-2.5 h-2.5 rounded-full transition-opacity ${
										processingCount > 0
											? 'bg-blue-500 animate-pulse'
											: isChecking
												? 'bg-yellow-500 animate-pulse'
												: isOnline
													? 'bg-green-500'
													: 'bg-red-500'
									}`}
								/>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation()
										void handleRetryConnection()
									}}
									className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
									title="Test connection"
								>
									<RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
								</button>
							</div>
							<ChevronDown className="w-3 h-3" />
						</div>
						{showModelDropdown && models && models.length > 0 && (
							<div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[180px]">
								<div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
									Select Model
								</div>
								{models.map((model) => (
									<button
										type="button"
										key={model.id}
										className={`w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between ${
											model.id === activeModelId ? 'bg-primary/10 text-primary' : ''
										}`}
										onClick={() => {
											onModelChange?.(model.id)
											setShowModelDropdown(false)
										}}
									>
										<span className="truncate">{model.name}</span>
										{model.id === activeModelId && (
											<svg
												className="w-4 h-4 text-primary shrink-0"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												aria-label="Selected"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M5 13l4 4L19 7"
												/>
											</svg>
										)}
									</button>
								))}
								<div className="border-t border-border pt-1 mt-1">
									<button
										type="button"
										className="w-full px-3 py-2 text-left text-sm hover:bg-muted text-muted-foreground"
										onClick={() => {
											setShowModelDropdown(false)
											onOpenSettingsTab?.('api')
										}}
									>
										Manage Models...
									</button>
								</div>
							</div>
						)}
					</div>
				) : (
					<Button variant="outline" size="sm" onClick={() => onOpenSettingsTab?.('api')}>
						<Plus className="w-4 h-4 mr-1" />
						Add Model
					</Button>
				)}

				{/* Prompt Profile Dropdown */}
				{promptList && promptList.length > 0 ? (
					<div className="relative" ref={promptDropdownRef}>
						<div
							role="button"
							tabIndex={0}
							onClick={() => {
								setShowPromptDropdown(!showPromptDropdown)
							}}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									setShowPromptDropdown(!showPromptDropdown)
								}
							}}
							className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-md hover:bg-secondary/80 transition-colors cursor-pointer"
							title={`Prompt: ${activePromptId}\nClick to change prompt`}
						>
							<span className="truncate max-w-[120px]">{activePromptId}</span>
							<ChevronDown className="w-3 h-3" />
						</div>
						{showPromptDropdown && promptList && promptList.length > 0 && (
							<div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[180px]">
								<div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
									Select Prompt
								</div>
								{promptList.map((filename) => (
									<button
										type="button"
										key={filename}
										className={`w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between ${
											filename === activePromptId ? 'bg-primary/10 text-primary' : ''
										}`}
										onClick={() => {
											onPromptChange?.(filename)
											setShowPromptDropdown(false)
										}}
									>
										<span className="truncate">{filename}</span>
										{filename === activePromptId && (
											<svg
												className="w-4 h-4 text-primary shrink-0"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												aria-label="Selected"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M5 13l4 4L19 7"
												/>
											</svg>
										)}
									</button>
								))}
								<div className="border-t border-border pt-1 mt-1">
									<button
										type="button"
										className="w-full px-3 py-2 text-left text-sm hover:bg-muted text-muted-foreground"
										onClick={() => {
											setShowPromptDropdown(false)
											onOpenSettingsTab?.('prompts')
										}}
									>
										Manage Prompts...
									</button>
								</div>
							</div>
						)}
					</div>
				) : (
					<Button variant="outline" size="sm" onClick={() => onOpenSettingsTab?.('prompts')}>
						<Plus className="w-4 h-4 mr-1" />
						Add Prompt
					</Button>
				)}
			</div>
			<div className="flex gap-2">
				{!isConfigured && (
					<Button variant="destructive" onClick={onOpenSettings}>
						Configure Model First
					</Button>
				)}
				{isConfigured && (
					<Button variant="secondary" onClick={onSelectFiles}>
						<FolderOpen className="w-4 h-4 mr-1" />
						Select Files
					</Button>
				)}
				<Button variant="ghost" size="icon" onClick={onOpenHistory} aria-label="History">
					<History className="w-5 h-5" />
				</Button>
				<Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Settings">
					<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</Button>
				{appVersion && <span className="text-xs text-muted-foreground ml-1 self-center">v{appVersion}</span>}
				{updateInfo && (
					<Button variant="secondary" size="sm" onClick={onCheckForUpdates}>
						Update to v{updateInfo.version}
					</Button>
				)}
			</div>
		</header>
	)
}
