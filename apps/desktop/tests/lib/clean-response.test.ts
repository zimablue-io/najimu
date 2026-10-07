import { describe, expect, it } from 'vitest'
import { cleanResponse } from '../../src/lib/processing'

/**
 * These assert the real stripper the app uses, so a change to
 * cleanResponse breaks these tests instead of a stale local copy.
 */
describe('cleanResponse', () => {
	describe('marker removal', () => {
		it('should remove the begin and end markers', () => {
			const input = '---BEGIN TEXT---\nTranslated text here\n---END TEXT---'
			expect(cleanResponse(input)).toBe('Translated text here')
		})

		it('should strip everything after the first end marker', () => {
			const input = 'Some translated text\n---END TEXT---\nMore text\n---END TEXT---'
			expect(cleanResponse(input)).toBe('Some translated text')
		})

		it('should leave text without markers untouched', () => {
			expect(cleanResponse('Just plain translated text')).toBe('Just plain translated text')
		})
	})

	describe('commentary removal', () => {
		it('should remove a leading "Here\'s the translation:" line', () => {
			const input = "Here's the translation:\n\nTranslated text"
			expect(cleanResponse(input)).toBe('Translated text')
		})

		it('should remove "Here is the translation of the markdown:"', () => {
			const input = 'Here is the translation of the markdown:\n\nTranslated text'
			expect(cleanResponse(input)).toBe('Translated text')
		})

		it('should remove "Translate the text above..."', () => {
			const input = 'Translate the text above and return only the translation.\n\nTranslated text'
			expect(cleanResponse(input)).toBe('Translated text')
		})
	})

	describe('code fence removal', () => {
		it('should remove a markdown code fence', () => {
			expect(cleanResponse('```markdown\nTranslated text\n```')).toBe('Translated text')
		})

		it('should remove a plain code fence', () => {
			expect(cleanResponse('```\nTranslated text\n```')).toBe('Translated text')
		})
	})

	describe('real-world responses', () => {
		it('should drop trailing commentary after the end marker', () => {
			const input = `---BEGIN TEXT---
Paragraph one content here.

Paragraph two content here.
---END TEXT---

I hope this translation meets your expectations!`

			const result = cleanResponse(input)
			expect(result).not.toContain('---BEGIN TEXT---')
			expect(result).not.toContain('---END TEXT---')
			expect(result).not.toContain('translation meets your expectations')
			expect(result).toContain('Paragraph one')
			expect(result).toContain('Paragraph two')
		})

		it('should remove commentary that precedes the markers', () => {
			const input = `Here's the translation to British English:

---BEGIN TEXT---
Colour instead of color.
---END TEXT---`

			expect(cleanResponse(input)).toBe('Colour instead of color.')
		})

		it('should remove a full prompt echo from the model', () => {
			const input = `Translate the text above and return ONLY the translated content with the exact same formatting:

---BEGIN TEXT---
Some text to translate.
---END TEXT---

I have translated the text above while preserving all formatting.`

			expect(cleanResponse(input)).toBe('Some text to translate.')
		})

		it('should preserve paragraph breaks between translated blocks', () => {
			const input = `---BEGIN TEXT---
First paragraph here.

Second paragraph here.
---END TEXT---`

			expect(cleanResponse(input)).toContain('\n\n')
		})
	})

	describe('edge cases', () => {
		it('should handle an empty response', () => {
			expect(cleanResponse('')).toBe('')
		})

		it('should return empty when only markers are present', () => {
			expect(cleanResponse('---BEGIN TEXT---\n\n---END TEXT---')).toBe('')
		})

		it('should preserve quotes and punctuation', () => {
			const input = `---BEGIN TEXT---
"Hello," she said.
---END TEXT---`
			expect(cleanResponse(input)).toBe('"Hello," she said.')
		})

		it('should preserve markdown formatting inside the content', () => {
			const input = `---BEGIN TEXT---
# Title

**Bold text** and *italic*.

## Subtitle
---END TEXT---`

			const result = cleanResponse(input)
			expect(result).toContain('# Title')
			expect(result).toContain('**Bold text**')
			expect(result).toContain('## Subtitle')
		})
	})
})
