import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock window.electron before importing
const mockGenerateAI = vi.fn()
vi.stubGlobal('window', {
	electron: {
		generateAI: mockGenerateAI,
	},
})

// Import after mocking
import { processParagraph } from '../../src/lib/processing'
import { buildPrompt, DEFAULT_LOCALIZATION_PROMPT } from '../../src/lib/prompts'

describe('processParagraph', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGenerateAI.mockResolvedValue({
			content: 'Translated text',
			error: null,
		})
	})

	it('should process with pre-built content and return cleaned response', async () => {
		const content = buildPrompt('Translate from en-US to ja-JP:\n\n---BEGIN TEXT---\n{text}\n---END TEXT---', {
			sourceLocale: 'en-US',
			targetLocale: 'ja-JP',
			text: 'Hello world',
		})

		const result = await processParagraph({
			apiUrl: 'http://localhost:11434',
			model: 'llama3',
			content,
		})

		expect(result).toBe('Translated text')
		expect(mockGenerateAI).toHaveBeenCalledWith(
			expect.objectContaining({
				url: 'http://localhost:11434/chat/completions',
				body: expect.objectContaining({
					model: 'llama3',
					messages: expect.arrayContaining([
						expect.objectContaining({
							role: 'user',
						}),
					]),
				}),
			})
		)
	})

	it('should throw error when AI returns error', async () => {
		mockGenerateAI.mockResolvedValue({
			content: '',
			error: 'Model not found',
		})

		await expect(
			processParagraph({
				apiUrl: 'http://localhost:11434',
				model: 'llama3',
				content: 'Translate this',
			})
		).rejects.toThrow('Model not found')
	})
})

describe('buildPrompt', () => {
	it('should replace all placeholders', () => {
		const result = buildPrompt('From {sourceLocale} to {targetLocale}: {text}', {
			sourceLocale: 'en-US',
			targetLocale: 'ja-JP',
			text: 'Hello',
		})

		expect(result).toBe('From en-US to ja-JP: Hello')
		expect(result).not.toContain('{sourceLocale}')
		expect(result).not.toContain('{targetLocale}')
		expect(result).not.toContain('{text}')
	})

	it('should replace ALL occurrences of placeholders (not just first)', () => {
		const template = '{targetLocale} → Use {targetLocale} spelling. Never use {targetLocale} variants.'
		const result = buildPrompt(template, {
			sourceLocale: 'en-US',
			targetLocale: 'de-DE',
			text: 'test',
		})

		// Should have no placeholders left
		expect(result).not.toContain('{targetLocale}')
		// Should have replaced all 3 occurrences
		expect(result.match(/de-DE/g)?.length).toBe(3)
	})

	it('should work with DEFAULT_LOCALIZATION_PROMPT', () => {
		const result = buildPrompt(DEFAULT_LOCALIZATION_PROMPT, {
			sourceLocale: 'en-US',
			targetLocale: 'de-DE',
			text: 'Colour is spelled with "ou".',
		})

		expect(result).not.toContain('{sourceLocale}')
		expect(result).not.toContain('{targetLocale}')
		expect(result).toContain('en-US')
		expect(result).toContain('de-DE')
	})
})

describe('integration: prompt building for multiple paragraphs', () => {
	it('keeps the same locale text when each paragraph replaces {text}', () => {
		const paragraphs = [
			'The harbour was quiet.',
			'A second paragraph with "quotes", accents àéï, and 你好.',
			`Long ${'paragraph '.repeat(60)}end.`,
		]
		expect(paragraphs[2]?.length).toBeGreaterThan(500)

		const basePrompt = buildPrompt(DEFAULT_LOCALIZATION_PROMPT, {
			sourceLocale: 'en-US',
			targetLocale: 'de-DE',
			text: '{text}',
		})
		expect(basePrompt).toContain('{text}')
		expect(basePrompt).not.toContain('{sourceLocale}')
		expect(basePrompt).not.toContain('{targetLocale}')

		const contents = paragraphs.map((paragraph) => basePrompt.replace('{text}', paragraph))
		const enUSCounts = contents.map((content) => content.match(/en-US/g)?.length)
		const deDECounts = contents.map((content) => content.match(/de-DE/g)?.length)
		expect(new Set(enUSCounts).size).toBe(1)
		expect(new Set(deDECounts).size).toBe(1)

		for (const [index, content] of contents.entries()) {
			expect(content).toContain(paragraphs[index])
			expect(content).not.toContain('{text}')
			expect(content).not.toContain('{sourceLocale}')
			expect(content).not.toContain('{targetLocale}')
		}
	})

	it('should handle locale with hyphens like de-DE', () => {
		const promptTemplate = 'Convert from {sourceLocale} to {targetLocale}'
		const result = buildPrompt(promptTemplate, {
			sourceLocale: 'en-US',
			targetLocale: 'de-DE',
			text: 'test',
		})

		expect(result).toContain('de-DE')
		expect(result).not.toContain('{targetLocale}')
	})
})
