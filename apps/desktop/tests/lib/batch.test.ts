import { describe, expect, it } from 'vitest'
import { planBatch } from '../../src/lib/batch'

describe('planBatch', () => {
	it('pairs every selected document with every selected locale when commercial', () => {
		expect(
			planBatch({
				entitled: true,
				documentIds: ['a', 'b'],
				targetLocales: ['fr-FR', 'ja-JP'],
			})
		).toEqual([
			{ documentId: 'a', targetLocale: 'fr-FR' },
			{ documentId: 'a', targetLocale: 'ja-JP' },
			{ documentId: 'b', targetLocale: 'fr-FR' },
			{ documentId: 'b', targetLocale: 'ja-JP' },
		])
	})

	it('yields one pair when the status is free', () => {
		expect(
			planBatch({
				entitled: false,
				documentIds: ['a', 'b'],
				targetLocales: ['fr-FR', 'ja-JP'],
			})
		).toEqual([{ documentId: 'a', targetLocale: 'fr-FR' }])
	})
})
