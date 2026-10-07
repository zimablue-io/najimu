import { describe, expect, it } from 'vitest'
import {
	buildMemoryContext,
	buildMemoryEntries,
	findReusableTranslation,
	normalizeParagraph,
	splitParagraphs,
} from '../../src/lib/memory'
import type { SimilarMatch } from '../../src/lib/similarity'
import type { MemoryEntry } from '../../src/lib/types'

function entry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
	return {
		id: 'm1',
		sourceText: 'The tenant shall pay rent monthly.',
		translation: 'Der Mieter zahlt monatlich Miete.',
		sourceLocale: 'en-US',
		targetLocale: 'de-DE',
		embedding: [1, 0],
		documentId: 'doc-1',
		approvedAt: '2026-10-07T00:00:00.000Z',
		...overrides,
	}
}

function match(overrides: Partial<MemoryEntry> = {}): SimilarMatch {
	return { entry: entry(overrides), score: 0.9 }
}

describe('buildMemoryContext', () => {
	it('should return an empty string when there are no matches', () => {
		expect(buildMemoryContext([])).toBe('')
	})

	it('should include the approved translation for each match', () => {
		const context = buildMemoryContext([match()])
		expect(context).toContain('Der Mieter zahlt monatlich Miete.')
	})

	it('should include the original source text for each match', () => {
		const context = buildMemoryContext([match()])
		expect(context).toContain('The tenant shall pay rent monthly.')
	})

	it('should state the target locale so terminology matches the request', () => {
		const context = buildMemoryContext([match()], 'de-DE')
		expect(context).toContain('de-DE')
	})

	it('should separate multiple matches so the model can tell them apart', () => {
		const context = buildMemoryContext([
			match({ id: 'a', sourceText: 'First source', translation: 'Erste Übersetzung' }),
			match({ id: 'b', sourceText: 'Second source', translation: 'Zweite Übersetzung' }),
		])
		expect(context).toContain('First source')
		expect(context).toContain('Second source')
		expect(context).toContain('Erste Übersetzung')
		expect(context).toContain('Zweite Übersetzung')
	})

	it('should never emit the placeholder that the caller substitutes per paragraph', () => {
		const context = buildMemoryContext([match()])
		expect(context).not.toContain('{text}')
	})
})

describe('splitParagraphs', () => {
	it('should treat runs of blank lines as one separator', () => {
		expect(splitParagraphs('First\n\n\n\nSecond')).toEqual(['First', 'Second'])
	})

	it('should drop blank blocks so paragraphs stay index-aligned', () => {
		expect(splitParagraphs('First\n\n   \n\nSecond')).toEqual(['First', 'Second'])
	})

	it('should keep single newlines inside a paragraph', () => {
		expect(splitParagraphs('Line one\nLine two')).toEqual(['Line one\nLine two'])
	})
})

describe('normalizeParagraph', () => {
	it('should collapse runs of whitespace', () => {
		expect(normalizeParagraph('Rent is   payable\nmonthly.')).toBe('Rent is payable monthly.')
	})

	it('should drop markdown emphasis that carries no meaning', () => {
		expect(normalizeParagraph('**Rent** is _payable_ `monthly`')).toBe('Rent is payable monthly')
	})

	it('should trim surrounding whitespace', () => {
		expect(normalizeParagraph('  Rent is payable monthly.  ')).toBe('Rent is payable monthly.')
	})

	it('should leave the words themselves untouched', () => {
		expect(normalizeParagraph("The tenant's rent is payable.")).toBe("The tenant's rent is payable.")
	})
})

describe('findReusableTranslation', () => {
	const locales = { source: 'en-US', target: 'de-DE' }
	const long = 'The tenant shall pay rent monthly in advance to the landlord.'

	it('should reuse an approved translation for identical text', () => {
		const found = findReusableTranslation(
			long,
			[entry({ sourceText: long, translation: 'Der Mieter zahlt monatlich im Voraus.' })],
			locales
		)
		expect(found).toBe('Der Mieter zahlt monatlich im Voraus.')
	})

	it('should reuse when only whitespace or emphasis differs', () => {
		const found = findReusableTranslation(
			`  **${long}**  `,
			[entry({ sourceText: long, translation: 'Der Mieter zahlt monatlich im Voraus.' })],
			locales
		)
		expect(found).toBe('Der Mieter zahlt monatlich im Voraus.')
	})

	it('should refuse to reuse when a clause was added', () => {
		const found = findReusableTranslation(
			`${long} The landlord retains the keys.`,
			[entry({ sourceText: long, translation: 'Der Mieter zahlt monatlich im Voraus.' })],
			locales
		)
		expect(found).toBeNull()
	})

	it('should refuse to reuse when a clause was removed', () => {
		const found = findReusableTranslation(
			'The tenant shall pay rent monthly.',
			[entry({ sourceText: long, translation: 'Der Mieter zahlt monatlich im Voraus.' })],
			locales
		)
		expect(found).toBeNull()
	})

	it('should refuse to reuse a short exact match, which is context dependent', () => {
		expect(
			findReusableTranslation('Utilities included.', [entry({ sourceText: 'Utilities included.' })], locales)
		).toBeNull()
	})

	it('should reuse a long exact match', () => {
		const found = findReusableTranslation(long, [entry({ sourceText: long })], locales)
		expect(found).not.toBeNull()
	})

	it('should not reuse an entry from a different target locale', () => {
		const found = findReusableTranslation(long, [entry({ sourceText: long, targetLocale: 'fr-FR' })], locales)
		expect(found).toBeNull()
	})

	it('should not reuse an entry from a different source locale', () => {
		const found = findReusableTranslation(long, [entry({ sourceText: long, sourceLocale: 'en-GB' })], locales)
		expect(found).toBeNull()
	})

	it('should ignore an entry whose approved translation is blank', () => {
		expect(findReusableTranslation(long, [entry({ sourceText: long, translation: '   ' })], locales)).toBeNull()
	})

	it('should ignore a differently-worded entry even when the meaning matches', () => {
		expect(
			findReusableTranslation(
				'The tenant shall pay rent monthly in advance to the landlord.',
				[entry({ sourceText: long })],
				locales
			)
		).not.toBeNull()
	})
})

describe('buildMemoryEntries', () => {
	const base = {
		documentId: 'doc-1',
		sourceLocale: 'en-US',
		targetLocale: 'de-DE',
		approvedAt: '2026-10-07T00:00:00.000Z',
	}

	it('should pair each source paragraph with its translation and vector by index', () => {
		const entries = buildMemoryEntries({
			...base,
			sourceText: 'First source\n\nSecond source',
			translatedText: 'Erste Übersetzung\n\nZweite Übersetzung',
			embeddings: [
				[1, 0],
				[0, 1],
			],
		})

		expect(entries).toHaveLength(2)
		expect(entries[0].sourceText).toBe('First source')
		expect(entries[0].translation).toBe('Erste Übersetzung')
		expect(entries[0].embedding).toEqual([1, 0])
		expect(entries[1].sourceText).toBe('Second source')
		expect(entries[1].translation).toBe('Zweite Übersetzung')
		expect(entries[1].embedding).toEqual([0, 1])
	})

	it('should pair vectors with the same paragraph list the embedder received', () => {
		// A blank block shifts splitParagraphs but not a naive split, which
		// would silently attach the wrong vector to the wrong paragraph.
		const sourceText = 'First source\n\n\n\nSecond source'
		const paragraphs = splitParagraphs(sourceText)

		const entries = buildMemoryEntries({
			...base,
			sourceText,
			translatedText: 'Erste Übersetzung\n\nZweite Übersetzung',
			embeddings: paragraphs.map((_, index) => [index, 0]),
		})

		expect(entries).toHaveLength(2)
		expect(entries[0].embedding).toEqual([0, 0])
		expect(entries[1].embedding).toEqual([1, 0])
	})

	it('should drop a paragraph with no matching translation', () => {
		const entries = buildMemoryEntries({
			...base,
			sourceText: 'First source\n\nSecond source',
			translatedText: 'Nur eine Übersetzung',
			embeddings: [
				[1, 0],
				[0, 1],
			],
		})

		expect(entries).toHaveLength(1)
		expect(entries[0].sourceText).toBe('First source')
	})

	it('should drop a paragraph that has no vector', () => {
		const entries = buildMemoryEntries({
			...base,
			sourceText: 'First source\n\nSecond source',
			translatedText: 'Erste Übersetzung\n\nZweite Übersetzung',
			embeddings: [[1, 0]],
		})

		expect(entries).toHaveLength(1)
		expect(entries[0].sourceText).toBe('First source')
	})

	it('should stamp the document, locale pair, and approval time on every entry', () => {
		const entries = buildMemoryEntries({
			...base,
			sourceText: 'First source',
			translatedText: 'Erste Übersetzung',
			embeddings: [[1, 0]],
		})

		expect(entries[0].documentId).toBe('doc-1')
		expect(entries[0].sourceLocale).toBe('en-US')
		expect(entries[0].targetLocale).toBe('de-DE')
		expect(entries[0].approvedAt).toBe('2026-10-07T00:00:00.000Z')
		expect(entries[0].id).toBeTruthy()
	})
})
