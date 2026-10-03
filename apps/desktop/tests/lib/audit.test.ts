import { describe, expect, it } from 'vitest'
import { applyReview, auditEventsToCsv, pairsFromApproval } from '../../src/lib/audit'
import { rememberPairs } from '../../src/lib/memory'

const document = {
	id: 'out-1',
	name: 'note.fr-FR.localized.md',
	sourceLocale: 'en-US',
	targetLocale: 'fr-FR',
}

describe('approval record', () => {
	it('stores a memory row for each approved paragraph', () => {
		const pairs = pairsFromApproval('Hello world\n\nSecond', 'Bonjour\n\nDeuxième', 'en-US', 'fr-FR')
		const stored = rememberPairs([], pairs)
		expect(stored).toEqual([
			{ sourceLocale: 'en-US', targetLocale: 'fr-FR', source: 'Hello world', target: 'Bonjour' },
			{ sourceLocale: 'en-US', targetLocale: 'fr-FR', source: 'Second', target: 'Deuxième' },
		])
	})
})

describe('applyReview', () => {
	it('records a confirmation and keeps the document approved', () => {
		const result = applyReview({
			...document,
			decision: 'confirmed',
			reviewerName: 'Ada',
			now: '2026-10-03T12:00:00.000Z',
		})
		expect(result.status).toBe('approved')
		expect(result.event.type).toBe('review_confirmed')
		expect(result.event.reviewerName).toBe('Ada')
	})

	it('records a return and sends the document back to review', () => {
		const result = applyReview({
			...document,
			decision: 'returned',
			reviewerName: 'Ada',
			now: '2026-10-03T12:00:00.000Z',
		})
		expect(result.status).toBe('review')
		expect(result.event.type).toBe('review_returned')
	})

	it('writes the review events as CSV rows', () => {
		const confirmed = applyReview({
			...document,
			decision: 'confirmed',
			reviewerName: 'Ada',
			now: '2026-10-03T12:00:00.000Z',
		})
		const csv = auditEventsToCsv([confirmed.event])
		expect(csv.split('\n')[0]).toContain('type')
		expect(csv).toContain('review_confirmed')
		expect(csv).toContain('Ada')
	})
})
