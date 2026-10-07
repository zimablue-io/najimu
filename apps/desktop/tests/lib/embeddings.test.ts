import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockEmbedText = vi.fn()
vi.stubGlobal('window', {
	electron: {
		embedText: mockEmbedText,
	},
})

import { embedTexts, toRetrievalDocument } from '../../src/lib/embeddings'

describe('toRetrievalDocument', () => {
	it('should label the paragraph as an untitled document', () => {
		expect(toRetrievalDocument('Rent is payable monthly.')).toBe('title: none | text: Rent is payable monthly.')
	})

	it('should preserve the paragraph text exactly', () => {
		const paragraph = '# Heading\n\nBody with  spacing.'
		expect(toRetrievalDocument(paragraph)).toContain(paragraph)
	})
})

describe('embedTexts', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockEmbedText.mockResolvedValue({ vectors: [[0.1, 0.2]] })
	})

	it('should return the vectors the embedder produced', async () => {
		const vectors = await embedTexts(['hello'])
		expect(vectors).toEqual([[0.1, 0.2]])
	})

	it('should send paragraphs in the retrieval document format', async () => {
		await embedTexts(['Rent is payable monthly.'])
		expect(mockEmbedText).toHaveBeenCalledWith(['title: none | text: Rent is payable monthly.'])
	})

	it('should not call the embedder when there is nothing to embed', async () => {
		expect(await embedTexts([])).toEqual([])
		expect(mockEmbedText).not.toHaveBeenCalled()
	})

	it('should return no vectors when the embedder reports an error', async () => {
		mockEmbedText.mockResolvedValue({ error: 'model failed to load' })
		expect(await embedTexts(['hello'])).toEqual([])
	})

	it('should return no vectors when the embedder throws', async () => {
		mockEmbedText.mockRejectedValue(new Error('worker died'))
		expect(await embedTexts(['hello'])).toEqual([])
	})

	it('should return no vectors when the embedder responds without vectors', async () => {
		mockEmbedText.mockResolvedValue({})
		expect(await embedTexts(['hello'])).toEqual([])
	})
})
