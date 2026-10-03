import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lookupMemory, type MemoryEntry, normalizeParagraph } from '../../src/lib/memory'

const memory: MemoryEntry[] = [
	{ sourceLocale: 'en-US', targetLocale: 'fr-FR', source: 'Hello world', target: 'Bonjour le monde' },
]

describe('lookupMemory', () => {
	it('returns the stored translation for an exact paragraph', () => {
		expect(lookupMemory(memory, 'en-US', 'fr-FR', 'Hello world')).toBe('Bonjour le monde')
	})

	it('hits when the only difference is whitespace', () => {
		expect(normalizeParagraph('  Hello   world \n')).toBe('Hello world')
		expect(lookupMemory(memory, 'en-US', 'fr-FR', '  Hello   world \n')).toBe('Bonjour le monde')
	})

	it('misses a different locale pair', () => {
		expect(lookupMemory(memory, 'en-US', 'ja-JP', 'Hello world')).toBeNull()
	})
})

const generateAI = vi.fn()
const readFile = vi.fn()
const writeTextFile = vi.fn()

vi.stubGlobal('window', {
	electron: {
		generateAI,
		readFile,
		writeTextFile,
	},
})

describe('processDocument memory', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		readFile.mockResolvedValue(btoa('Hello world\n\nSecond paragraph'))
		writeTextFile.mockResolvedValue(undefined)
		generateAI.mockResolvedValue({ content: 'Deuxième paragraphe' })
	})

	it('reuses an exact memory hit and does not call the model for that paragraph', async () => {
		const { processDocument } = await import('../../src/lib/processing')
		const result = await processDocument({
			sourceDoc: { id: 'doc-1', name: 'note.md', path: '/tmp/note.md' },
			apiUrl: 'http://localhost:8080/v1',
			model: 'local',
			customPrompt: 'From {sourceLocale} to {targetLocale}: {text}',
			sourceLocale: 'en-US',
			targetLocale: 'fr-FR',
			memory,
			onStatusChange: () => {},
			onProgress: () => {},
			onIntermediateWrite: async () => {},
		})

		expect(result.success).toBe(true)
		expect(result.localizedText).toBe('Bonjour le monde\n\nDeuxième paragraphe')
		expect(result.memoryHits).toBe(1)
		expect(generateAI).toHaveBeenCalledTimes(1)
	})
})
