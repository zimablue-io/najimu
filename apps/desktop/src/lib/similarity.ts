/**
 * Vector similarity for translation-memory retrieval.
 */

import type { MemoryEntry } from './types'

export interface SimilarMatch {
	entry: MemoryEntry
	score: number
}

export interface LocalePair {
	source: string
	target: string
}

/**
 * Cosine similarity between two vectors.
 * Returns 0 for mismatched or zero-length vectors so a malformed
 * embedding can never rank above a real match.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length === 0 || a.length !== b.length) return 0

	let dot = 0
	let magA = 0
	let magB = 0
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i]
		magA += a[i] * a[i]
		magB += b[i] * b[i]
	}

	if (magA === 0 || magB === 0) return 0
	return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

/**
 * Finds memory entries similar to the query vector, best first.
 * Entries are scoped to the locale pair being processed so an approved
 * German translation never informs a French run.
 */
export function findSimilar(
	query: number[],
	entries: MemoryEntry[],
	threshold: number,
	limit: number,
	locales?: LocalePair
): SimilarMatch[] {
	return entries
		.filter((entry) => !locales || (entry.sourceLocale === locales.source && entry.targetLocale === locales.target))
		.map((entry) => ({ entry, score: cosineSimilarity(query, entry.embedding) }))
		.filter((match) => match.score >= threshold)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
}
