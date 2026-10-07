import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGenerateAI = vi.fn()
const mockEmbed = vi.fn()
const mockReadFile = vi.fn()
const mockWriteTextFile = vi.fn()
const mockLoadMemory = vi.fn()

vi.stubGlobal('window', {
	electron: {
		generateAI: mockGenerateAI,
		embedText: mockEmbed,
		readFile: mockReadFile,
		writeTextFile: mockWriteTextFile,
		loadMemory: mockLoadMemory,
	},
})

import { processDocument } from '../../src/lib/processing'
import { DEFAULT_LOCALIZATION_PROMPT } from '../../src/lib/prompts'

const SOURCE_DOC = '/docs/lease.md'

function base64Of(text: string): string {
	return Buffer.from(text, 'utf-8').toString('base64')
}

function options() {
	return {
		sourceDoc: { id: 'd1', name: 'lease.md', path: SOURCE_DOC },
		apiUrl: 'http://localhost:8080/v1',
		model: 'gemma3n:e2b-it',
		customPrompt: DEFAULT_LOCALIZATION_PROMPT,
		sourceLocale: 'en-US',
		targetLocale: 'de-DE',
		onStatusChange: () => {},
		onProgress: () => {},
		onIntermediateWrite: async () => {},
	}
}

function memoryEntry(overrides: Record<string, unknown> = {}) {
	return {
		id: 'm1',
		sourceText: 'Rent is payable monthly in advance.',
		translation: 'Die Miete ist monatlich im Voraus fällig.',
		sourceLocale: 'en-US',
		targetLocale: 'de-DE',
		embedding: [1, 0],
		documentId: 'doc-1',
		approvedAt: '2026-10-07T00:00:00.000Z',
		...overrides,
	}
}

describe('processDocument with translation memory', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockReadFile.mockResolvedValue(
			base64Of('The tenant shall pay rent monthly.\n\nUtilities are billed separately.')
		)
		mockWriteTextFile.mockResolvedValue(undefined)
		mockGenerateAI.mockResolvedValue({ content: 'Translated paragraph.' })
		mockEmbed.mockResolvedValue({ vectors: [[1, 0]] })
		mockLoadMemory.mockResolvedValue([])
	})

	it('should include a matched approved translation in the prompt sent to the model', async () => {
		mockLoadMemory.mockResolvedValue([memoryEntry()])

		await processDocument(options())

		const firstPrompt = mockGenerateAI.mock.calls[0][0].body.messages[0].content
		expect(firstPrompt).toContain('Die Miete ist monatlich im Voraus fällig.')
	})

	it('should send the paragraph unchanged when nothing clears the threshold', async () => {
		mockLoadMemory.mockResolvedValue([
			memoryEntry({
				sourceText: 'Completely unrelated clause about parking spaces.',
				translation: 'Vollständig unzusammenhängende Klausel.',
				embedding: [0, 1],
			}),
		])

		await processDocument(options())

		const firstPrompt = mockGenerateAI.mock.calls[0][0].body.messages[0].content
		expect(firstPrompt).not.toContain('Vollständig unzusammenhängende Klausel.')
		expect(firstPrompt).toContain('The tenant shall pay rent monthly.')
	})

	it('should not embed anything when no approved memory exists yet', async () => {
		await processDocument(options())

		expect(mockLoadMemory).toHaveBeenCalled()
		expect(mockEmbed).not.toHaveBeenCalled()
		expect(mockGenerateAI).toHaveBeenCalled()
	})

	it('should still produce translations when the embedder reports an error', async () => {
		mockLoadMemory.mockResolvedValue([memoryEntry()])
		mockEmbed.mockResolvedValue({ error: 'model failed to load' })

		const result = await processDocument(options())

		expect(result.success).toBe(true)
		expect(result.localizedText).toContain('Translated paragraph.')
	})

	it('should retrieve matches only for the locale pair being processed', async () => {
		mockLoadMemory.mockResolvedValue([
			memoryEntry({
				targetLocale: 'fr-FR',
				translation: 'Le locataire paie le loyer mensuellement.',
			}),
		])

		await processDocument(options())

		const firstPrompt = mockGenerateAI.mock.calls[0][0].body.messages[0].content
		expect(firstPrompt).not.toContain('Le locataire paie le loyer mensuellement.')
	})

	it('should translate every paragraph even when the first has a memory match', async () => {
		mockLoadMemory.mockResolvedValue([memoryEntry()])

		const result = await processDocument(options())

		expect(result.paragraphsProcessed).toBe(2)
		expect(mockGenerateAI).toHaveBeenCalledTimes(2)
	})
})

describe('processDocument with approved translation reuse', () => {
	const LONG_SOURCE = 'The tenant shall pay rent monthly in advance to the landlord.'

	beforeEach(() => {
		vi.clearAllMocks()
		mockReadFile.mockResolvedValue(base64Of(LONG_SOURCE))
		mockWriteTextFile.mockResolvedValue(undefined)
		mockGenerateAI.mockResolvedValue({ content: 'Freshly translated paragraph.' })
		mockEmbed.mockResolvedValue({ vectors: [[1, 0]] })
		mockLoadMemory.mockResolvedValue([
			memoryEntry({ sourceText: LONG_SOURCE, translation: 'Der Mieter zahlt die Miete monatlich im Voraus.' }),
		])
	})

	it('should reuse the approved translation without calling the model', async () => {
		const result = await processDocument(options())

		expect(mockGenerateAI).not.toHaveBeenCalled()
		expect(result.localizedText).toBe('Der Mieter zahlt die Miete monatlich im Voraus.')
	})

	it('should still translate when the paragraph differs by a single added word', async () => {
		// Cosine similarity scores this 0.985 against the stored paragraph,
		// which is indistinguishable from identical text. Reuse must therefore
		// be decided on the text itself, never on the embedding score.
		mockReadFile.mockResolvedValue(
			base64Of('The tenant shall pay rent monthly in advance to the landlord of the property.')
		)

		const result = await processDocument(options())

		expect(mockGenerateAI).toHaveBeenCalledTimes(1)
		expect(result.localizedText).toBe('Freshly translated paragraph.')
	})

	it('should reuse when the paragraph differs only in surrounding whitespace', async () => {
		mockReadFile.mockResolvedValue(base64Of(`  ${LONG_SOURCE}  `))

		const result = await processDocument(options())

		expect(mockGenerateAI).not.toHaveBeenCalled()
		expect(result.localizedText).toBe('Der Mieter zahlt die Miete monatlich im Voraus.')
	})

	it('should not reuse a short exact match, which is too ambiguous to trust', async () => {
		// Short strings are where identical wording means different things
		// depending on context, so they are sent to the model for review.
		mockReadFile.mockResolvedValue(base64Of('Utilities included.'))
		mockLoadMemory.mockResolvedValue([
			memoryEntry({ sourceText: 'Utilities included.', translation: 'Nebenkosten inklusive.' }),
		])

		const result = await processDocument(options())

		expect(mockGenerateAI).toHaveBeenCalledTimes(1)
		expect(result.localizedText).toBe('Freshly translated paragraph.')
	})

	it('should not reuse an approved translation from a different locale pair', async () => {
		mockLoadMemory.mockResolvedValue([
			memoryEntry({
				sourceText: LONG_SOURCE,
				translation: 'Le locataire paie le loyer mensuellement.',
				targetLocale: 'fr-FR',
			}),
		])

		const result = await processDocument(options())

		expect(mockGenerateAI).toHaveBeenCalledTimes(1)
		expect(result.localizedText).toBe('Freshly translated paragraph.')
	})

	it('should embed every paragraph in a single batched call', async () => {
		mockReadFile.mockResolvedValue(base64Of('First paragraph here.\n\nSecond paragraph here.\n\nThird one.'))

		await processDocument(options())

		expect(mockEmbed).toHaveBeenCalledTimes(1)
		expect(mockEmbed.mock.calls[0][0]).toHaveLength(3)
	})
})
