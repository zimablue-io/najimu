import type { DocumentState } from '@najimu/core'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@najimu/ui'
import { AlertTriangle, CheckCircle2, Clock, FileText, Loader2, XCircle } from 'lucide-react'

type ExtendedStatus = DocumentState['status'] | 'rejected'

interface LocaleSelectProps {
	value: string
	onChange: (value: string | null) => void
	locales?: { code: string; name: string }[]
	disabled?: boolean
	showSameLocaleWarning?: boolean
}

export function LocaleSelect({ value, onChange, locales, disabled, showSameLocaleWarning }: LocaleSelectProps) {
	const isInvalid = value && !locales?.some((l) => l.code === value)

	return (
		<div className="flex items-center gap-1">
			<Select value={value} onValueChange={onChange} disabled={disabled}>
				<SelectTrigger className={`h-7 w-28 ${isInvalid ? 'border-destructive' : ''}`}>
					<SelectValue placeholder="Select..." />
				</SelectTrigger>
				<SelectContent>
					{locales?.map((l) => (
						<SelectItem key={l.code} value={l.code}>
							{l.code}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<div className="w-5 h-5 flex items-center justify-center">
				{isInvalid ? (
					<div className="group relative flex items-center">
						<XCircle className="w-4 h-4 text-destructive" />
						<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 w-48 p-2 bg-popover border border-border rounded-lg shadow-lg text-xs text-popover-foreground">
							Locale not available - please select a different one
						</div>
					</div>
				) : showSameLocaleWarning ? (
					<div className="group relative flex items-center">
						<AlertTriangle className="w-4 h-4 text-orange-500" />
						<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 w-48 p-2 bg-popover border border-border rounded-lg shadow-lg text-xs text-popover-foreground">
							Same locale selected - ensure you have a custom prompt configured to define the
							transformation
						</div>
					</div>
				) : null}
			</div>
		</div>
	)
}

export function StatusIcon({ status }: { status: ExtendedStatus }) {
	switch (status) {
		case 'idle':
			return <Clock className="w-5 h-5 text-muted-foreground" />
		case 'parsing':
		case 'localizing':
			return <Loader2 className="w-5 h-5 text-primary animate-spin" />
		case 'review':
			return <FileText className="w-5 h-5 text-yellow-500" />
		case 'approved':
		case 'exported':
			return <CheckCircle2 className="w-5 h-5 text-green-500" />
		case 'rejected':
			return <XCircle className="w-5 h-5 text-red-500" />
		case 'error':
			return <XCircle className="w-5 h-5 text-red-500" />
	}
}

export const STATUS_LABELS: Record<ExtendedStatus, string> = {
	idle: 'Ready to process',
	parsing: 'Extracting text...',
	localizing: 'Localizing...',
	review: 'Needs review',
	approved: 'Ready to export',
	rejected: 'Rejected',
	exported: 'Exported',
	error: 'Error',
}

export const STATUS_COLORS: Record<ExtendedStatus, string> = {
	idle: 'text-muted-foreground',
	parsing: 'text-muted-foreground',
	localizing: 'text-muted-foreground',
	review: 'text-yellow-500',
	approved: 'text-green-500',
	rejected: 'text-red-500',
	exported: 'text-green-500',
	error: 'text-red-500',
}

export const ALL_STATUSES: ExtendedStatus[] = [
	'idle',
	'parsing',
	'localizing',
	'review',
	'approved',
	'rejected',
	'exported',
	'error',
]
