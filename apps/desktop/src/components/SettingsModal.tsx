import { Button, Input, Label, ScrollArea, Tabs, TabsContent, TabsList, TabsTrigger } from '@doclocalizer/ui'
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { ALL_LOCALES } from '../lib/locales'
import { DEFAULT_LOCALIZATION_PROMPT } from '../lib/prompts'
import type { ModelConfig, Settings } from '../lib/types'
import { CommercialPanel } from './CommercialPanel'
import { PromptCreateForm } from './PromptCreateForm'
import { PromptEditor } from './PromptEditor'
import { PromptList } from './PromptList'

interface SettingsModalProps {
	settings: Settings
	initialTab?: string
	onChange: (settings: Settings) => void
	onClose: () => void
	onPromptListRefresh?: (promptId?: string) => void
	onModelsRefresh?: () => void
	onCommercialChanged?: () => void
}

export default function SettingsModal({
	settings,
	initialTab = 'locales',
	onChange,
	onClose,
	onPromptListRefresh,
	onModelsRefresh,
	onCommercialChanged,
}: SettingsModalProps) {
	const [activeTab, setActiveTab] = useState<string>(initialTab)
	const [localeSearch, setLocaleSearch] = useState('')

	// Model management state
	const [newModelName, setNewModelName] = useState('')
	const [editingModelId, setEditingModelId] = useState<string | null>(null)
	const [editModelName, setEditModelName] = useState('')

	// Prompt management state
	const [promptList, setPromptList] = useState<string[]>([])
	const [promptContent, setPromptContent] = useState<string>('')
	const [savedPromptContent, setSavedPromptContent] = useState<string>('')
	const [newPromptName, setNewPromptName] = useState('')
	const [newPromptContent, setNewPromptContent] = useState(DEFAULT_LOCALIZATION_PROMPT)
	const [showNewPromptInput, setShowNewPromptInput] = useState(false)
	const [isEditingPrompt, setIsEditingPrompt] = useState(false)

	const loadPrompts = useCallback(async () => {
		const prompts = await window.electron.listPrompts()
		setPromptList(prompts)

		if (settings.activePromptId) {
			// Check if active prompt still exists
			if (!prompts.includes(settings.activePromptId)) {
				// Active prompt was deleted, switch to first available or empty
				const remaining = prompts[0] || ''
				onChange({ ...settings, activePromptId: remaining })
				if (remaining) {
					const content = await window.electron.readPrompt(remaining)
					if (content) {
						setPromptContent(content)
						setSavedPromptContent(content)
					}
				} else {
					setPromptContent('')
					setSavedPromptContent('')
				}
				return
			}
			const content = await window.electron.readPrompt(settings.activePromptId)
			if (content) {
				setPromptContent(content)
				setSavedPromptContent(content)
			}
		}
	}, [settings.activePromptId, onChange, settings])

	useEffect(() => {
		void loadPrompts()
	}, [loadPrompts])

	const handleSelectPrompt = async (filename: string | null, edit = false) => {
		if (!filename) return
		onChange({ ...settings, activePromptId: filename })
		setIsEditingPrompt(edit)
		const content = await window.electron.readPrompt(filename)
		if (content) {
			setPromptContent(content)
			setSavedPromptContent(content)
		}
	}

	const handleSavePrompt = async () => {
		if (settings.activePromptId) {
			await window.electron.writePrompt(settings.activePromptId, promptContent)
			setSavedPromptContent(promptContent)
		}
	}

	const handleCreatePrompt = async () => {
		const filename = `${newPromptName.trim()}.md`
		if (newPromptName.trim()) {
			await window.electron.writePrompt(filename, newPromptContent)
			await loadPrompts()
			onChange({ ...settings, activePromptId: filename })
			setPromptContent(newPromptContent)
			setSavedPromptContent(newPromptContent)
			setNewPromptName('')
			setNewPromptContent(DEFAULT_LOCALIZATION_PROMPT)
			setShowNewPromptInput(false)
			onPromptListRefresh?.(filename)
		}
	}

	const handleDeletePrompt = async () => {
		if (!settings.activePromptId) return
		await window.electron.deletePrompt(settings.activePromptId)
		await loadPrompts()
		const remaining = promptList.filter((p) => p !== settings.activePromptId)
		if (remaining.length > 0) {
			onChange({ ...settings, activePromptId: remaining[0] })
			const content = await window.electron.readPrompt(remaining[0])
			if (content) {
				setPromptContent(content)
				setSavedPromptContent(content)
			}
			onPromptListRefresh?.(remaining[0])
		} else {
			setPromptContent('')
			setSavedPromptContent('')
			onChange({ ...settings, activePromptId: '' })
			onPromptListRefresh?.()
		}
	}

	const handleResetPrompt = async () => {
		await window.electron.writePrompt('default.md', DEFAULT_LOCALIZATION_PROMPT)
		await loadPrompts()
		if (settings.activePromptId === 'default.md') {
			setPromptContent(DEFAULT_LOCALIZATION_PROMPT)
			setSavedPromptContent(DEFAULT_LOCALIZATION_PROMPT)
			onPromptListRefresh?.('default.md')
		} else {
			onPromptListRefresh?.()
		}
	}

	const handleRenamePrompt = async (newName: string) => {
		if (!settings.activePromptId) return
		const content = await window.electron.readPrompt(settings.activePromptId)
		if (content) {
			await window.electron.writePrompt(newName, content)
			await window.electron.deletePrompt(settings.activePromptId)
			await loadPrompts()
			onChange({ ...settings, activePromptId: newName })
			onPromptListRefresh?.(newName)
		}
	}

	const toggleLocale = (code: string) => {
		const enabled = settings.enabledLocaleCodes.includes(code)
		if (enabled) {
			const newEnabled = settings.enabledLocaleCodes.filter((c) => c !== code)
			onChange({ ...settings, enabledLocaleCodes: newEnabled })
			if (settings.sourceLocale === code) onChange({ ...settings, sourceLocale: '' })
			if (settings.targetLocale === code) onChange({ ...settings, targetLocale: '' })
		} else {
			onChange({ ...settings, enabledLocaleCodes: [...settings.enabledLocaleCodes, code] })
		}
	}

	const filteredLocales = ALL_LOCALES.filter(
		(locale) =>
			locale.name.toLowerCase().includes(localeSearch.toLowerCase()) ||
			locale.code.toLowerCase().includes(localeSearch.toLowerCase())
	).sort((a, b) => {
		const aEnabled = settings.enabledLocaleCodes.includes(a.code)
		const bEnabled = settings.enabledLocaleCodes.includes(b.code)
		if (aEnabled && !bEnabled) return -1
		if (!aEnabled && bEnabled) return 1
		return a.name.localeCompare(b.name)
	})

	const handleAddModel = () => {
		if (newModelName.trim()) {
			const newModel: ModelConfig = {
				id: crypto.randomUUID(),
				name: newModelName.trim(),
			}
			const updatedModels = [...settings.models, newModel]
			onChange({ ...settings, models: updatedModels, activeModelId: newModel.id })
			setNewModelName('')
			onModelsRefresh?.()
		}
	}

	const handleRemoveModel = (id: string) => {
		const updatedModels = settings.models.filter((m) => m.id !== id)
		let newActiveId = settings.activeModelId
		if (settings.activeModelId === id) {
			newActiveId = updatedModels[0]?.id || ''
		}
		onChange({ ...settings, models: updatedModels, activeModelId: newActiveId })
		onModelsRefresh?.()
	}

	const handleStartEditModel = (model: ModelConfig) => {
		setEditingModelId(model.id)
		setEditModelName(model.name)
	}

	const handleSaveEditModel = () => {
		if (editingModelId && editModelName.trim()) {
			const updatedModels = settings.models.map((m) =>
				m.id === editingModelId ? { ...m, name: editModelName.trim() } : m
			)
			onChange({ ...settings, models: updatedModels })
			setEditingModelId(null)
			setEditModelName('')
		}
	}

	const handleCancelEditModel = () => {
		setEditingModelId(null)
		setEditModelName('')
	}

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className="bg-card rounded-lg border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold">Settings</h2>
					<Button variant="ghost" size="sm" onClick={onClose}>
						<X className="w-4 h-4" />
					</Button>
				</div>

				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList variant="line">
						<TabsTrigger value="locales">Locales</TabsTrigger>
						<TabsTrigger value="api">API</TabsTrigger>
						<TabsTrigger value="prompts">Prompts</TabsTrigger>
						<TabsTrigger value="processing">Processing</TabsTrigger>
						<TabsTrigger value="commercial">Commercial</TabsTrigger>
					</TabsList>

					<ScrollArea className="flex-1 min-h-0 mt-4">
						<TabsContent value="locales" className="space-y-4 pr-4">
							<p className="text-sm text-muted-foreground">
								Select locales to enable. Enabled locales can be used as source or target for document
								processing.
							</p>

							<Input
								placeholder="Search locales..."
								value={localeSearch}
								onChange={(e) => setLocaleSearch(e.target.value)}
							/>

							<div className="space-y-1 max-h-[300px] overflow-y-auto pr-2">
								{filteredLocales.map((locale) => {
									const isEnabled = settings.enabledLocaleCodes.includes(locale.code)
									return (
										<div
											key={locale.code}
											className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
												isEnabled ? 'bg-primary/10' : 'hover:bg-secondary'
											}`}
											onClick={() => toggleLocale(locale.code)}
											onKeyDown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault()
													toggleLocale(locale.code)
												}
											}}
											role="checkbox"
											aria-checked={isEnabled}
											tabIndex={0}
										>
											<div
												className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
													isEnabled ? 'bg-primary border-primary' : 'border-muted-foreground'
												}`}
											>
												{isEnabled && <Check className="w-3 h-3 text-primary-foreground" />}
											</div>
											<div className="flex-1">
												<span
													className={isEnabled ? 'text-foreground' : 'text-muted-foreground'}
												>
													{locale.name}
												</span>
												<span className="text-xs text-muted-foreground ml-2">
													({locale.code})
												</span>
											</div>
										</div>
									)
								})}
								{filteredLocales.length === 0 && (
									<p className="text-sm text-muted-foreground text-center py-4">No locales found</p>
								)}
							</div>
						</TabsContent>

						<TabsContent value="api" className="space-y-4 pr-4">
							<div className="space-y-1.5">
								<Label htmlFor="api-url">API URL</Label>
								<Input
									id="api-url"
									value={settings.apiUrl}
									onChange={(e) => onChange({ ...settings, apiUrl: e.target.value })}
									placeholder="http://localhost:8080/v1"
								/>
							</div>

							<div className="border-t border-border pt-4">
								<Label className="mb-2 block">Models</Label>
								<div className="flex gap-2 mb-3">
									<Input
										value={newModelName}
										onChange={(e) => setNewModelName(e.target.value)}
										placeholder="Model name (e.g., llama:3.2:3b-instruct)"
										className="flex-1"
										onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
									/>
									<Button onClick={handleAddModel} disabled={!newModelName.trim()}>
										<Plus className="w-4 h-4 mr-1" />
										Add
									</Button>
								</div>

								{settings.models.length > 0 && (
									<div className="space-y-2">
										{settings.models.map((model) => (
											<div
												key={model.id}
												className={`flex items-center h-9 px-0.5 rounded-lg border cursor-pointer transition-colors ${
													editingModelId === model.id
														? 'border-input'
														: model.id === settings.activeModelId
															? 'bg-primary/10 border-primary'
															: 'bg-secondary border-transparent hover:border-border'
												}`}
											>
												{editingModelId === model.id ? (
													<div className="flex items-center gap-2 w-full">
														<Input
															value={editModelName}
															onChange={(e) => setEditModelName(e.target.value)}
															placeholder="Model name"
															className="w-full"
														/>

														<div className="flex items-center gap-x-1">
															<Button
																variant="ghost"
																size="sm"
																onClick={handleCancelEditModel}
															>
																<X className="w-4 h-4" />
															</Button>
															<Button
																variant="ghost"
																size="sm"
																onClick={handleSaveEditModel}
															>
																<Check className="w-4 h-4" />
															</Button>
														</div>
													</div>
												) : (
													<div
														className="flex items-center justify-between w-full"
														onClick={() =>
															onChange({ ...settings, activeModelId: model.id })
														}
														onKeyDown={(e) => {
															if (e.key === 'Enter' || e.key === ' ') {
																e.preventDefault()
																onChange({ ...settings, activeModelId: model.id })
															}
														}}
													>
														<span className="truncate px-2">{model.name}</span>

														<div className="flex items-center gap-x-1">
															{model.id === settings.activeModelId && (
																<span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
																	Selected
																</span>
															)}
															<Button
																variant="ghost"
																size="sm"
																onClick={(e) => {
																	e.stopPropagation()
																	handleStartEditModel(model)
																}}
															>
																<Edit2 className="w-4 h-4" />
															</Button>
															<Button
																variant="ghost"
																size="sm"
																onClick={(e) => {
																	e.stopPropagation()
																	handleRemoveModel(model.id)
																}}
															>
																<Trash2 className="w-4 h-4" />
															</Button>
														</div>
													</div>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						</TabsContent>

						<TabsContent value="prompts" className="space-y-4 pr-4">
							{showNewPromptInput ? (
								<PromptCreateForm
									newPromptName={newPromptName}
									newPromptContent={newPromptContent}
									onNameChange={setNewPromptName}
									onContentChange={setNewPromptContent}
									onCreate={handleCreatePrompt}
									onCancel={() => setShowNewPromptInput(false)}
								/>
							) : promptList.length === 0 ? (
								<div className="text-center py-8">
									<p className="text-muted-foreground mb-4">No prompts yet</p>
									<Button
										onClick={async () => {
											await window.electron.writePrompt('default.md', DEFAULT_LOCALIZATION_PROMPT)
											onChange({ ...settings, activePromptId: 'default.md' })
											setPromptContent(DEFAULT_LOCALIZATION_PROMPT)
											setSavedPromptContent(DEFAULT_LOCALIZATION_PROMPT)
											await loadPrompts()
											onPromptListRefresh?.('default.md')
										}}
									>
										<Plus className="w-4 h-4 mr-1" />
										Create default prompt
									</Button>
								</div>
							) : (
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<h3 className="font-medium">Prompt Profiles</h3>
										<Button size="sm" onClick={() => setShowNewPromptInput(true)}>
											<Plus className="w-4 h-4 mr-1" />
											New
										</Button>
									</div>

									<PromptList
										promptList={promptList}
										settings={settings}
										onSelectPrompt={handleSelectPrompt}
									/>

									{settings.activePromptId && (
										<PromptEditor
											settings={settings}
											promptContent={promptContent}
											savedContent={savedPromptContent}
											isEditing={isEditingPrompt}
											onSetEditing={setIsEditingPrompt}
											onContentChange={setPromptContent}
											onSave={handleSavePrompt}
											onDelete={handleDeletePrompt}
											onRename={handleRenamePrompt}
											onReset={handleResetPrompt}
										/>
									)}
								</div>
							)}
						</TabsContent>

						<TabsContent value="processing" className="space-y-4 pr-4">
							<div className="space-y-1.5">
								<Label htmlFor="chunk-size">Chunk Size</Label>
								<Input
									id="chunk-size"
									value={settings.chunkSize}
									onChange={(e) => onChange({ ...settings, chunkSize: e.target.value })}
								/>
								<p className="text-xs text-muted-foreground">Maximum characters per chunk</p>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="overlap-size">Overlap</Label>
								<Input
									id="overlap-size"
									value={settings.overlapSize}
									onChange={(e) => onChange({ ...settings, overlapSize: e.target.value })}
								/>
								<p className="text-xs text-muted-foreground">Characters to overlap between chunks</p>
							</div>
						</TabsContent>

						<TabsContent value="commercial">
							<CommercialPanel onChanged={() => onCommercialChanged?.()} />
						</TabsContent>
					</ScrollArea>
				</Tabs>
			</div>
		</div>
	)
}
