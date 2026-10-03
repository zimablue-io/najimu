export interface BatchPair {
	documentId: string
	targetLocale: string
}

/**
 * Commercial runs every selected document into every selected locale.
 * Free keeps the single-document, single-locale run.
 */
export function planBatch(input: { entitled: boolean; documentIds: string[]; targetLocales: string[] }): BatchPair[] {
	const documentIds = input.documentIds.filter((id) => id.length > 0)
	const targetLocales = input.targetLocales.filter((locale) => locale.length > 0)
	if (documentIds.length === 0 || targetLocales.length === 0) return []
	if (!input.entitled) {
		return [{ documentId: documentIds[0], targetLocale: targetLocales[0] }]
	}
	const pairs: BatchPair[] = []
	for (const documentId of documentIds) {
		for (const targetLocale of targetLocales) {
			pairs.push({ documentId, targetLocale })
		}
	}
	return pairs
}
