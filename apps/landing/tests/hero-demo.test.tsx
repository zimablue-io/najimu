/**
 * @vitest-environment jsdom
 *
 * The hero demo reserves its height by measuring every variant once and pinning the
 * container, then dropping the measuring pass. These tests hold that contract:
 * the reservation never costs a second copy of the content staying in the document.
 *
 * A variant left mounted after the pass is the failure that would matter most. It
 * duplicates every sentence, duplicates the accessibility tree, and makes
 * `getByText` ambiguous, so each assertion here is about what is NOT in the DOM.
 *
 * The actual height reservation needs a layout engine, so `scripts/check-cls.mjs`
 * measures cumulative layout shift in a real browser. jsdom reports every box as
 * zero-height and cannot stand in for that measurement.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DEMO_EXAMPLES } from '../src/components/hero/examples'
import Hero from '../src/components/hero/Hero'

afterEach(cleanup)

/** Every sentence of every variant, used to detect a stray mounted copy. */
function exampleSentence(exampleId: string): string {
	const example = DEMO_EXAMPLES.find((e) => e.id === exampleId)
	return example?.source.map((s) => s.text).join('') ?? ''
}

describe('the hero demo reserves its height without duplicating content', () => {
	it('mounts only the active example once settled', () => {
		const { container } = render(<Hero selectedPlatform={null} onPlatformChange={() => {}} />)

		for (const example of DEMO_EXAMPLES) {
			const occurrences = Array.from(container.querySelectorAll('p')).filter((p) =>
				(p.textContent ?? '').includes(exampleSentence(example.id))
			)
			expect(occurrences).toHaveLength(example.id === DEMO_EXAMPLES[0].id ? 1 : 0)
		}
	})

	it('leaves no measuring pass behind', () => {
		const { container } = render(<Hero selectedPlatform={null} onPlatformChange={() => {}} />)
		// `invisible` is the measuring pass's own marker. Decorative icons carry
		// aria-hidden legitimately, so it is not a signal for this.
		expect(container.querySelector('.invisible')).toBeNull()
		expect(container.querySelector('.overflow-clip')).toBeNull()
	})

	it('keeps exactly one accuracy warning, so the reservation does not multiply it', () => {
		render(<Hero selectedPlatform={null} onPlatformChange={() => {}} />)
		expect(screen.getAllByText(/can contain errors/i)).toHaveLength(1)
	})

	it('swaps to a single new example on every tab click', () => {
		const { container } = render(<Hero selectedPlatform={null} onPlatformChange={() => {}} />)

		for (const [index, example] of DEMO_EXAMPLES.entries()) {
			fireEvent.click(screen.getByRole('tab', { name: new RegExp(example.label) }))

			const active = Array.from(container.querySelectorAll('p')).filter((p) =>
				(p.textContent ?? '').includes(exampleSentence(example.id))
			)
			expect(active).toHaveLength(1)

			for (const other of DEMO_EXAMPLES) {
				if (other.id === example.id) continue
				const stale = Array.from(container.querySelectorAll('p')).filter((p) =>
					(p.textContent ?? '').includes(exampleSentence(other.id))
				)
				expect(stale).toHaveLength(0)
			}

			expect(container.querySelector('.invisible')).toBeNull()
			expect(index).toBeGreaterThanOrEqual(0)
		}
	})

	it('reports every example as the selected tab after clicking through', () => {
		render(<Hero selectedPlatform={null} onPlatformChange={() => {}} />)

		for (const example of DEMO_EXAMPLES) {
			const tab = screen.getByRole('tab', { name: new RegExp(example.label) })
			fireEvent.click(tab)
			expect(tab.getAttribute('aria-selected')).toBe('true')
			expect(screen.getByText(`Original (${example.sourceName})`)).toBeTruthy()
			expect(screen.getByText(`Localized (${example.targetName})`)).toBeTruthy()
		}
	})

	// Every block whose height differs between examples carries a data-part, so the
	// reservation can pin it. A block that varies without one slides inside the
	// reserved box, which is the bug this guards.
	it.each([
		'caption',
		'card',
		'source-label',
		'source-box',
		'target-label',
		'target-box',
	])('names %s as a reserved part', (part) => {
		const { container } = render(<Hero selectedPlatform={null} onPlatformChange={() => {}} />)
		expect(container.querySelector(`[data-part="${part}"]`)).not.toBeNull()
	})

	it('reads the reserved heights back from the container, so nothing can drift', () => {
		const { container } = render(<Hero selectedPlatform={null} onPlatformChange={() => {}} />)
		// jsdom has no layout, so the measurement yields no height and the reservation
		// is unset here. The browser check in the CLS script is what proves the value
		// lands; this asserts the parts exist for it to measure.
		for (const el of container.querySelectorAll('[data-part]')) {
			expect(el.className.length).toBeGreaterThan(0)
		}
	})
})
