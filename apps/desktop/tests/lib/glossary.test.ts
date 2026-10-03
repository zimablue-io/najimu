import { describe, expect, it } from 'vitest'
import { type GlossaryEntry, renderTermsBlock, termsForLocale } from '../../src/lib/glossary'
import { buildPrompt } from '../../src/lib/prompts'

const entries: GlossaryEntry[] = [
	{ id: '1', sourceLocale: 'en-US', targetLocale: 'fr-FR', source: 'invoice', target: 'facture' },
	{ id: '2', sourceLocale: 'en-US', targetLocale: 'ja-JP', source: 'invoice', target: '請求書' },
]

describe('glossary', () => {
	it('includes a terms block only when terms are passed', () => {
		const template = 'From {sourceLocale} to {targetLocale}: {text}'
		const plain = buildPrompt(template, {
			sourceLocale: 'en-US',
			targetLocale: 'fr-FR',
			text: 'Pay the invoice',
		})
		const block = renderTermsBlock(termsForLocale(entries, 'en-US', 'fr-FR'))
		const withTerms = buildPrompt(template, {
			sourceLocale: 'en-US',
			targetLocale: 'fr-FR',
			text: 'Pay the invoice',
			termsBlock: block,
		})

		expect(plain).not.toContain('facture')
		expect(withTerms).toContain('invoice → facture')
		expect(withTerms).toContain('Pay the invoice')
	})

	it('omits a term that belongs to another locale pair', () => {
		const block = renderTermsBlock(termsForLocale(entries, 'en-US', 'fr-FR'))
		expect(block).toContain('facture')
		expect(block).not.toContain('請求書')
	})
})
