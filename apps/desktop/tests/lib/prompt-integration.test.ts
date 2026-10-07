import { describe, expect, it } from 'vitest'

import { buildPrompt, DEFAULT_LOCALIZATION_PROMPT } from '../../src/lib/prompts'

describe('prompt building integration', () => {
	describe('DEFAULT_LOCALIZATION_PROMPT', () => {
		it('should build base prompt with correct locales', () => {
			// This simulates what we do in processDocument
			const basePrompt = buildPrompt(DEFAULT_LOCALIZATION_PROMPT, {
				sourceLocale: 'en-US',
				targetLocale: 'de-DE',
				text: '{text}',
			})

			// Base prompt should have locales replaced but {text} kept
			expect(basePrompt).toContain('en-US')
			expect(basePrompt).toContain('de-DE')
			expect(basePrompt).toContain('{text}')
			expect(basePrompt).not.toContain('{sourceLocale}')
			expect(basePrompt).not.toContain('{targetLocale}')

			// en-US and de-DE should appear at least once (not zero)
			const enUSCount = (basePrompt.match(/en-US/g) || []).length
			const deDECount = (basePrompt.match(/de-DE/g) || []).length
			expect(enUSCount).toBeGreaterThanOrEqual(1) // At least one {sourceLocale} reference
			expect(deDECount).toBeGreaterThanOrEqual(1) // At least one {targetLocale} reference
		})

		it('should preserve prompt structure', () => {
			const basePrompt = buildPrompt(DEFAULT_LOCALIZATION_PROMPT, {
				sourceLocale: 'en-US',
				targetLocale: 'de-DE',
				text: '{text}',
			})

			// Should have OUTPUT marker
			expect(basePrompt).toContain('OUTPUT:')

			const paragraph = 'Hello world'
			const content = basePrompt.replace('{text}', paragraph)

			// After replacement, should have paragraph
			expect(content).toContain('Hello world')
			// Should have locale values
			expect(content).toContain('en-US')
			expect(content).toContain('de-DE')
		})
	})

	describe('edge cases', () => {
		it('should handle paragraphs with special characters', () => {
			const basePrompt = buildPrompt(DEFAULT_LOCALIZATION_PROMPT, {
				sourceLocale: 'en-US',
				targetLocale: 'de-DE',
				text: '{text}',
			})

			const specialParagraphs = [
				'Quotes: "Hello" and \'Hello\'',
				'Newlines:\nare\npreserved',
				'Special chars: àéïõü',
				'Unicode: 你好世界',
			]

			for (const p of specialParagraphs) {
				const content = basePrompt.replace('{text}', p)
				expect(content).toContain('en-US')
				expect(content).toContain('de-DE')
				expect(content).toContain(p)
			}
		})

		it('should handle empty placeholder if text is empty string', () => {
			const basePrompt = buildPrompt(DEFAULT_LOCALIZATION_PROMPT, {
				sourceLocale: 'en-US',
				targetLocale: 'de-DE',
				text: '',
			})

			// With empty text, {text} should be replaced with empty string
			expect(basePrompt).not.toContain('{text}')
			expect(basePrompt).toContain('en-US')
			expect(basePrompt).toContain('de-DE')
		})

		it('should handle different locale formats', () => {
			const locales = [
				{ source: 'en-US', target: 'de-DE' },
				{ source: 'en-GB', target: 'fr-FR' },
				{ source: 'ja-JP', target: 'ko-KR' },
			]

			for (const { source, target } of locales) {
				const basePrompt = buildPrompt(DEFAULT_LOCALIZATION_PROMPT, {
					sourceLocale: source,
					targetLocale: target,
					text: '{text}',
				})

				expect(basePrompt).toContain(source)
				expect(basePrompt).toContain(target)
				expect(basePrompt).not.toContain('{sourceLocale}')
				expect(basePrompt).not.toContain('{targetLocale}')
			}
		})
	})
})
