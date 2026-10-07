/**
 * Translation memory: reusing approved translations for terminology consistency.
 */

import type { LocalePair, SimilarMatch } from './similarity'
import type { MemoryEntry } from './types'

/**
 * Renders retrieved approved translations as a prompt block.
 *
 * These are reviewer-approved outputs, not raw model guesses, so the model
 * can copy their terminology. Empty result means the prompt is unchanged.
 */
export function buildMemoryContext(matches: SimilarMatch[], targetLocale?: string): string {
	if (matches.length === 0) return ''

	const examples = matches
		.map(({ entry }, index) =>
			[
				`---EXAMPLE ${index + 1}---`,
				`Source (${entry.sourceLocale}):`,
				entry.sourceText,
				`Approved ${entry.targetLocale} translation:`,
				entry.translation,
			].join('\n')
		)
		.join('\n\n')

	return [
		'REFERENCE TRANSLATIONS (already reviewed and approved - reuse their terminology and phrasing):',
		...(targetLocale ? [`Target locale: ${targetLocale}`] : []),
		'',
		examples,
		'',
	].join('\n')
}

/**
 * Splits text into paragraphs on blank lines.
 *
 * Exported so the embedder and the entry builder derive paragraphs from the
 * exact same list; a divergent split silently pairs a vector with the wrong
 * paragraph.
 */
export function splitParagraphs(text: string): string[] {
	return text.split(/\n\n+/).filter((p) => p.trim())
}

/**
 * Normalizes a paragraph so formatting-only differences still match.
 *
 * Markdown emphasis, collapsed whitespace, and trailing newlines carry no
 * meaning for a translation, so they must not force a retranslation.
 */
export function normalizeParagraph(text: string): string {
	return text.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Paragraphs shorter than this are never reused automatically.
 *
 * Professional translation tools require confirmation on short exact
 * matches because the same short string can need a different translation
 * depending on what surrounds it. Reviewing them is cheaper than shipping a
 * wrong translation.
 */
const MIN_REUSABLE_WORDS = 5

/**
 * Finds an approved translation for a paragraph, if it can be reused as-is.
 *
 * Reuse is decided on the text itself rather than on embedding similarity.
 * Measured against the real model, a paragraph with one clause added scores
 * 0.985 cosine against the identical text it differs from, so no similarity
 * threshold separates "same paragraph" from "same paragraph plus a clause".
 * Exact comparison needs no threshold and cannot be fooled that way.
 */
export function findReusableTranslation(paragraph: string, entries: MemoryEntry[], locales: LocalePair): string | null {
	const target = normalizeParagraph(paragraph)
	if (target.split(/\s+/).length < MIN_REUSABLE_WORDS) return null

	for (const entry of entries) {
		if (entry.sourceLocale !== locales.source || entry.targetLocale !== locales.target) continue
		if (entry.translation.trim() === '') continue
		if (normalizeParagraph(entry.sourceText) === target) return entry.translation
	}
	return null
}

/**
 * Builds memory entries for a document by pairing its source paragraphs
 * with their approved translations.
 */
export function buildMemoryEntries(args: {
	documentId: string
	sourceText: string
	translatedText: string
	sourceLocale: string
	targetLocale: string
	embeddings: number[][]
	approvedAt: string
}): import('./types').MemoryEntry[] {
	const sources = splitParagraphs(args.sourceText)
	const translations = splitParagraphs(args.translatedText)

	return sources
		.map((sourceText, index) => ({
			sourceText,
			translation: translations[index] || '',
			embedding: args.embeddings[index] || [],
		}))
		.filter((entry) => entry.translation.trim() !== '' && entry.embedding.length > 0)
		.map((entry) => ({
			id: crypto.randomUUID(),
			documentId: args.documentId,
			sourceLocale: args.sourceLocale,
			targetLocale: args.targetLocale,
			approvedAt: args.approvedAt,
			...entry,
		}))
}
