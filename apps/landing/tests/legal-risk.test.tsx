/**
 * @vitest-environment jsdom
 *
 * The rendered landing page is the surface a plaintiff or a regulator reads. These
 * assertions run against the real component tree, so copy cannot reintroduce a
 * claim without turning this file red.
 *
 * Two classes of risk are covered:
 *
 * 1. Domain solicitation. Marketing Najimu as fit for legal, medical or financial
 *    translation is what a claim of negligent localization hangs on. A user who
 *    chooses a translator is partly choosing it for a stated domain, so the site
 *    must not state one it cannot stand behind.
 *
 * 2. Disparagement. Naming a competing product and asserting negatives about it is
 *    a factual claim about someone else's business, and the ones that were here
 *    ("cloud-only", "no diff view") were false as well as risky.
 *
 * The accuracy warning on the hero is deliberately not covered here. It is the
 * language that keeps a negligence claim hard, and `Hero.test.tsx` guards it.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import App from '../src/App'

beforeAll(() => {
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver
	globalThis.IntersectionObserver ??= class {
		readonly root = null
		readonly rootMargin = ''
		readonly thresholds: readonly number[] = []
		observe() {}
		unobserve() {}
		disconnect() {}
		takeRecords() {
			return []
		}
	} as unknown as typeof IntersectionObserver
})

afterEach(cleanup)

function renderedText(): string {
	const { container, unmount } = render(<App />)
	const text = container.textContent ?? ''
	unmount()
	return text
}

describe('the page does not solicit work in a regulated domain', () => {
	it.each([
		['legal', /\blegal\b/i],
		['contracts', /\bcontracts?\b/i],
		['NDA', /\bndas?\b/i],
		['regulatory', /\bregulatory\b/i],
		['compliance', /\bcompliance\b/i],
		['medical', /\bmedical\b/i],
		['financial', /\bfinancial\b/i],
	])('does not market %s documents', (_domain, pattern) => {
		expect(renderedText()).not.toMatch(pattern)
	})

	it('still tells the reader that output needs review', () => {
		// The reverse of the rows above: removing the solicitation must not remove the warning.
		expect(renderedText()).toMatch(/can contain errors/i)
	})
})

describe('the page makes no claims about competing products', () => {
	it.each([
		['DeepL', /deepl/i],
		['Google Translate', /google translate/i],
		['Microsoft Translator', /microsoft translator/i],
	])('does not name %s', (_product, pattern) => {
		expect(renderedText()).not.toMatch(pattern)
	})

	it('keeps no navigation entry pointing at a comparison section', () => {
		render(<App />)
		expect(document.getElementById('vs-competitors')).toBeNull()
		expect(screen.queryByTitle('Compare')).toBeNull()
	})
})

describe('the privacy notice is reachable from the page', () => {
	it('links the privacy policy from the footer', () => {
		render(<App />)
		const link = screen.getByRole('link', { name: /privacy/i })
		expect(link.getAttribute('href')).toMatch(/PRIVACY\.md$/)
	})

	it('links the license from the setup guide', () => {
		render(<App />)
		expect(screen.getAllByRole('link', { name: 'license' }).length).toBeGreaterThan(0)
	})
})
