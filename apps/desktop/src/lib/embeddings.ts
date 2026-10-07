/**
 * Embedding client for translation-memory retrieval.
 *
 * Inference runs in-process inside the app, so there is no endpoint to
 * configure and no extra server for the user to run.
 */

/**
 * Retrieval prefix for the EmbeddingGemma 2 document format.
 * The model is trained on titled documents, so paragraphs are labelled.
 */
export function toRetrievalDocument(text: string): string {
	return `title: none | text: ${text}`
}

/**
 * Embeds texts via the embedder worker.
 * Returns an empty array when embeddings are unavailable, so a missing or
 * failed model degrades translation instead of failing it.
 */
export async function embedTexts(input: string[]): Promise<number[][]> {
	if (input.length === 0) return []

	try {
		const result = await window.electron.embedText(input.map(toRetrievalDocument))
		return result.vectors ?? []
	} catch {
		return []
	}
}
