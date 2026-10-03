export interface GlossaryEntry {
	id: string
	sourceLocale: string
	targetLocale: string
	source: string
	target: string
}

export function termsForLocale(entries: GlossaryEntry[], sourceLocale: string, targetLocale: string): GlossaryEntry[] {
	return entries.filter(
		(entry) =>
			entry.sourceLocale === sourceLocale &&
			entry.targetLocale === targetLocale &&
			entry.source.trim().length > 0 &&
			entry.target.trim().length > 0
	)
}

export function renderTermsBlock(entries: GlossaryEntry[]): string {
	if (entries.length === 0) return ''
	return entries.map((entry) => `- ${entry.source} → ${entry.target}`).join('\n')
}

export function parseGlossary(value: unknown): GlossaryEntry[] {
	if (!Array.isArray(value)) return []
	const entries: GlossaryEntry[] = []
	for (const item of value) {
		if (!item || typeof item !== 'object') continue
		const record = item as Record<string, unknown>
		if (
			typeof record.id !== 'string' ||
			typeof record.sourceLocale !== 'string' ||
			typeof record.targetLocale !== 'string' ||
			typeof record.source !== 'string' ||
			typeof record.target !== 'string'
		) {
			continue
		}
		entries.push({
			id: record.id,
			sourceLocale: record.sourceLocale,
			targetLocale: record.targetLocale,
			source: record.source,
			target: record.target,
		})
	}
	return entries
}
