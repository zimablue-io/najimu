import { Button, Input, Label } from '@najimu/ui'
import { Plus, X } from 'lucide-react'
import { useMemo } from 'react'
import { validatePromptTemplate } from '../lib/prompts'

interface PromptCreateFormProps {
	newPromptName: string
	newPromptContent: string
	onNameChange: (name: string) => void
	onContentChange: (content: string) => void
	onCreate: () => void
	onCancel: () => void
}

export function PromptCreateForm({
	newPromptName,
	newPromptContent,
	onNameChange,
	onContentChange,
	onCreate,
	onCancel,
}: PromptCreateFormProps) {
	const missingVars = useMemo(() => validatePromptTemplate(newPromptContent).missingVars, [newPromptContent])

	const isValidName = newPromptName.trim() && /^[a-zA-Z0-9-]+$/.test(newPromptName)
	const canCreate = isValidName && missingVars.length === 0

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="font-medium">Create New Prompt</h3>
				<Button variant="ghost" size="sm" onClick={onCancel}>
					<X className="w-4 h-4" />
				</Button>
			</div>
			<div className="space-y-2">
				<Label>Prompt name</Label>
				<div className="flex gap-2">
					<Input
						value={newPromptName}
						onChange={(e) => {
							const val = e.target.value.replace(/\.md$/i, '')
							onNameChange(val)
						}}
						placeholder="my-prompt"
						className="flex-1"
						onKeyDown={(e) => {
							if (e.key === 'Enter' && canCreate) onCreate()
							if (e.key === 'Escape') onCancel()
						}}
						autoFocus
					/>
					<span className="self-center text-muted-foreground">.md</span>
				</div>
				<p className="text-xs text-muted-foreground">Only letters, numbers, and hyphens allowed</p>
			</div>
			<div className="flex gap-2">
				<Button onClick={onCreate} disabled={!canCreate}>
					<Plus className="w-4 h-4 mr-1" />
					Create
				</Button>
				<Button variant="outline" onClick={onCancel}>
					Cancel
				</Button>
			</div>
			<textarea
				value={newPromptContent}
				onChange={(e) => onContentChange(e.target.value)}
				className="min-h-[12rem] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none focus-visible:border-ring resize-none font-mono"
				placeholder="Enter your prompt..."
			/>
			<p className="text-xs text-muted-foreground">
				Template:{' '}
				<code
					className={`px-1 rounded ${missingVars.includes('{sourceLocale}') ? 'text-destructive' : 'bg-secondary'}`}
				>
					{'{sourceLocale}'}
				</code>
				,{' '}
				<code
					className={`px-1 rounded ${missingVars.includes('{targetLocale}') ? 'text-destructive' : 'bg-secondary'}`}
				>
					{'{targetLocale}'}
				</code>
				,{' '}
				<code
					className={`px-1 rounded ${missingVars.includes('{text}') ? 'text-destructive' : 'bg-secondary'}`}
				>
					{'{text}'}
				</code>
			</p>
		</div>
	)
}
