import type { MemoryEntry } from './memory'
import { normalizeParagraph } from './memory'

export type AuditEventType =
	| 'process_started'
	| 'process_finished'
	| 'approved'
	| 'rejected'
	| 'exported'
	| 'review_confirmed'
	| 'review_returned'

export interface AuditEvent {
	time: string
	type: AuditEventType
	documentId: string
	documentName: string
	sourceLocale: string
	targetLocale: string
	model?: string
	promptId?: string
	glossaryCount?: number
	memoryHits?: number
	reviewerName?: string
}

const CSV_COLUMNS = [
	'time',
	'type',
	'documentId',
	'documentName',
	'sourceLocale',
	'targetLocale',
	'model',
	'promptId',
	'glossaryCount',
	'memoryHits',
	'reviewerName',
] as const

function csvCell(value: unknown): string {
	if (value === undefined || value === null) return ''
	const text = String(value)
	if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
	return text
}

export function auditEventsToCsv(events: AuditEvent[]): string {
	const header = CSV_COLUMNS.join(',')
	const rows = events.map((event) => CSV_COLUMNS.map((column) => csvCell(event[column])).join(','))
	return [header, ...rows].join('\n')
}

export function parseAuditLine(line: string): AuditEvent | null {
	const trimmed = line.trim()
	if (!trimmed) return null
	try {
		const value = JSON.parse(trimmed) as Partial<AuditEvent>
		if (!value.time || !value.type || !value.documentId || !value.documentName) return null
		if (!value.sourceLocale || !value.targetLocale) return null
		return value as AuditEvent
	} catch {
		return null
	}
}

export function pairsFromApproval(
	markdown: string,
	localized: string,
	sourceLocale: string,
	targetLocale: string
): MemoryEntry[] {
	const sources = markdown.split(/\n\n+/)
	const targets = localized.split(/\n\n+/)
	const count = Math.min(sources.length, targets.length)
	const pairs: MemoryEntry[] = []
	for (let index = 0; index < count; index++) {
		if (!normalizeParagraph(sources[index])) continue
		pairs.push({
			sourceLocale,
			targetLocale,
			source: sources[index],
			target: targets[index],
		})
	}
	return pairs
}

export function applyReview(input: {
	id: string
	name: string
	sourceLocale: string
	targetLocale: string
	decision: 'confirmed' | 'returned'
	reviewerName: string
	now: string
}): {
	status: 'approved' | 'review'
	review: { reviewerName: string; decision: 'confirmed' | 'returned'; at: string }
	event: AuditEvent
} {
	const returned = input.decision === 'returned'
	return {
		status: returned ? 'review' : 'approved',
		review: { reviewerName: input.reviewerName, decision: input.decision, at: input.now },
		event: {
			time: input.now,
			type: returned ? 'review_returned' : 'review_confirmed',
			documentId: input.id,
			documentName: input.name,
			sourceLocale: input.sourceLocale,
			targetLocale: input.targetLocale,
			reviewerName: input.reviewerName,
		},
	}
}
