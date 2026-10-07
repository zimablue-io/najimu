/**
 * The desktop sidebar is `fixed`, so it sits outside the document flow and the
 * content has to reserve room for it. `tests/section-gutter.test.tsx` covers the
 * sections applying that reservation; this file covers the sidebar staying
 * inside the gutter it reserves.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', 'src')
const nav = readFileSync(join(SRC, 'components', 'Navigation.tsx'), 'utf8')
const css = readFileSync(join(SRC, 'index.css'), 'utf8')

describe('the fixed sidebar stays inside its reserved gutter', () => {
	it('caps the expanded pill instead of sizing it from its label', () => {
		expect(nav).toMatch(/hover:w-\[7\.5rem\]/)
		expect(nav).not.toMatch(/hover:w-auto/)
	})

	it('reserves more than the expanded pill occupies', () => {
		const gutter = /--nav-gutter:\s*([\d.]+)rem/.exec(css)?.[1]
		const offset = /fixed left-(\d+)/.exec(nav)?.[1]
		const pill = /hover:w-\[([\d.]+)rem\]/.exec(nav)?.[1]
		expect(gutter).toBeTruthy()
		expect(offset).toBeTruthy()
		expect(pill).toBeTruthy()

		// Equal would leave content flush against the expanded pill.
		const rightEdge = Number(offset) + Number(pill) * 16
		expect(Number(gutter) * 16).toBeGreaterThan(rightEdge)
	})

	it('keeps the mobile hamburger top-right, where no left gutter applies', () => {
		expect(nav).toMatch(/fixed top-4 right-4/)
		expect(nav).toMatch(/hidden md:flex/)
	})
})
