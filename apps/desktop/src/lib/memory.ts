export interface MemoryEntry {
	sourceLocale: string
	targetLocale: string
	source: string
	target: string
}

export function normalizeParagraph(text: string): string {
	return text.trim().replace(/\s+/g, ' ')
}

export function lookupMemory(
	entries: MemoryEntry[],
	sourceLocale: string,
	targetLocale: string,
	paragraph: string
): string | null {
	const key = normalizeParagraph(paragraph)
	const hit = entries.find(
		(entry) =>
			entry.sourceLocale === sourceLocale &&
			entry.targetLocale === targetLocale &&
			normalizeParagraph(entry.source) === key
	)
	return hit ? hit.target : null
}

export function rememberPairs(existing: MemoryEntry[], incoming: MemoryEntry[]): MemoryEntry[] {
	const next = existing.map((entry) => ({ ...entry, source: normalizeParagraph(entry.source) }))
	for (const entry of incoming) {
		const source = normalizeParagraph(entry.source)
		if (!source || !entry.target.trim()) continue
		const index = next.findIndex(
			(stored) =>
				stored.sourceLocale === entry.sourceLocale &&
				stored.targetLocale === entry.targetLocale &&
				stored.source === source
		)
		const stored = { ...entry, source }
		if (index === -1) next.push(stored)
		else next[index] = stored
	}
	return next
}

export function parseMemory(value: unknown): MemoryEntry[] {
	if (!Array.isArray(value)) return []
	const entries: MemoryEntry[] = []
	for (const item of value) {
		if (!item || typeof item !== 'object') continue
		const record = item as Record<string, unknown>
		if (
			typeof record.sourceLocale !== 'string' ||
			typeof record.targetLocale !== 'string' ||
			typeof record.source !== 'string' ||
			typeof record.target !== 'string'
		) {
			continue
		}
		entries.push({
			sourceLocale: record.sourceLocale,
			targetLocale: record.targetLocale,
			source: record.source,
			target: record.target,
		})
	}
	return entries
}
