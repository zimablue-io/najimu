import { describe, expect, it } from 'vitest'
import { cosineSimilarity, findSimilar } from '../../src/lib/similarity'
import type { MemoryEntry } from '../../src/lib/types'

function entry(overrides: Partial<MemoryEntry> & { id: string }): MemoryEntry {
	return {
		sourceText: 'source',
		translation: 'translation',
		sourceLocale: 'en-US',
		targetLocale: 'de-DE',
		embedding: [1, 0],
		documentId: 'doc-1',
		approvedAt: '2026-10-07T00:00:00.000Z',
		...overrides,
	}
}

describe('cosineSimilarity', () => {
	it('should return 1 when vectors point the same direction', () => {
		expect(cosineSimilarity([1, 0, 0], [2, 0, 0])).toBeCloseTo(1, 6)
	})

	it('should return 0 when vectors are perpendicular', () => {
		expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6)
	})

	it('should return -1 when vectors point opposite directions', () => {
		expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 6)
	})

	it('should be unaffected by vector magnitude', () => {
		expect(cosineSimilarity([0.1, 0.2, 0.3], [1, 2, 3])).toBeCloseTo(1, 6)
	})

	it('should return 0 when either vector is all zeros', () => {
		expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
		expect(cosineSimilarity([1, 1], [0, 0])).toBe(0)
	})

	it('should return 0 when vector dimensions do not match', () => {
		expect(cosineSimilarity([1, 0, 0], [1, 0])).toBe(0)
	})
})

describe('findSimilar', () => {
	const entries = [
		entry({ id: 'close', embedding: [1, 0], translation: 'close hit' }),
		entry({ id: 'far', embedding: [0, 1], translation: 'far hit' }),
	]

	it('should return entries at or above the similarity threshold', () => {
		const results = findSimilar([1, 0], entries, 0.8)
		expect(results).toHaveLength(1)
		expect(results[0].entry.id).toBe('close')
	})

	it('should exclude an entry that falls below the threshold', () => {
		const results = findSimilar([1, 0], entries, 0.95)
		expect(results).toHaveLength(1)
		expect(results[0].entry.id).toBe('close')
	})

	it('should return nothing when no entry clears the threshold', () => {
		expect(findSimilar([1, 0], entries, 1.01)).toEqual([])
	})

	it('should order results by descending similarity', () => {
		const many = [
			entry({ id: 'a', embedding: [0.9, 0.1] }),
			entry({ id: 'b', embedding: [1, 0] }),
			entry({ id: 'c', embedding: [0.8, 0.2] }),
		]
		const results = findSimilar([1, 0], many, 0)
		expect(results.map((r) => r.entry.id)).toEqual(['b', 'a', 'c'])
	})

	it('should return at most the requested number of results', () => {
		const many = [
			entry({ id: 'a', embedding: [1, 0] }),
			entry({ id: 'b', embedding: [0.99, 0.01] }),
			entry({ id: 'c', embedding: [0.98, 0.02] }),
		]
		expect(findSimilar([1, 0], many, 0, 2)).toHaveLength(2)
	})

	it('should exclude entries whose locale pair does not match', () => {
		const mismatched = [entry({ id: 'fr', embedding: [1, 0], targetLocale: 'fr-FR' })]
		expect(findSimilar([1, 0], mismatched, 0, 5, { source: 'en-US', target: 'de-DE' })).toEqual([])
	})

	it('should include entries whose locale pair matches', () => {
		const matching = [entry({ id: 'de', embedding: [1, 0] })]
		const results = findSimilar([1, 0], matching, 0, 5, { source: 'en-US', target: 'de-DE' })
		expect(results).toHaveLength(1)
	})

	it('should expose the similarity score for each result', () => {
		const results = findSimilar([1, 0], entries, 0.8)
		expect(results[0].score).toBeCloseTo(1, 6)
	})

	it('should return nothing when there are no entries', () => {
		expect(findSimilar([1, 0], [], 0)).toEqual([])
	})
})
