/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DEMO_EXAMPLES } from '../src/components/hero/examples'
import Hero from '../src/components/hero/Hero'

afterEach(cleanup)

/** Concatenated text of every highlighted span, i.e. what the diff marks as changed. */
function highlightedText(container: HTMLElement, hue: 'green' | 'red'): string {
	return Array.from(container.querySelectorAll(`span[class*="${hue}"]`))
		.map((el) => el.textContent ?? '')
		.join('')
}

describe('demo examples table', () => {
	it('offers three distinct examples', () => {
		expect(DEMO_EXAMPLES).toHaveLength(3)
		expect(new Set(DEMO_EXAMPLES.map((e) => e.id)).size).toBe(3)
	})

	it.each(
		DEMO_EXAMPLES.map((example) => [example.id, example] as const)
	)('example %s is complete', (_id, example) => {
		expect(example.label.trim()).not.toBe('')
		expect(example.useCase.trim()).not.toBe('')
		expect(example.sourceLocale.trim()).not.toBe('')
		expect(example.targetLocale.trim()).not.toBe('')
		expect(example.sourceName.trim()).not.toBe('')
		expect(example.targetName.trim()).not.toBe('')
		expect(example.source.length).toBeGreaterThan(0)
		expect(example.target.length).toBeGreaterThan(0)
	})

	it.each(
		DEMO_EXAMPLES.map((example) => [example.id, example] as const)
	)('example %s marks at least one changed segment on each side', (_id, example) => {
		expect(example.source.some((s) => s.changed)).toBe(true)
		expect(example.target.some((s) => s.changed)).toBe(true)
	})
})

describe('Hero demo', () => {
	it('leads with one sentence and leaves the locale list off the first screen', () => {
		render(<Hero selectedPlatform={null} onPlatformChange={() => {}} />)
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Localize PDFs and Markdown on your machine')
		expect(
			screen.getByText('A private translator for 100+ locales. Your files stay on this computer.')
		).toBeTruthy()
		expect(screen.queryByText(/100% Offline/)).toBeNull()
		expect(screen.queryByText(/Ollama/)).toBeNull()
		expect(screen.queryByText(/US, UK, AU/)).toBeNull()
		expect(screen.queryByRole('navigation', { name: 'Page sections' })).toBeNull()
	})

	it('renders one tab per example', () => {
		render(<Hero selectedPlatform={null} onPlatformChange={() => {}} />)
		expect(screen.getAllByRole('tab')).toHaveLength(3)
	})

	// Output quality depends on the user's local model, so the page must not imply the
	// translation is fit for purpose on its own.
	it('warns that AI output needs review before it is relied on', () => {
		render(<Hero selectedPlatform={null} onPlatformChange={() => {}} />)
		expect(screen.getByText(/can contain errors/i)).toBeTruthy()
		expect(screen.getByText(/before relying on the output/i)).toBeTruthy()
	})

	it('does not market the legal example as fit to sign off on', () => {
		expect(DEMO_EXAMPLES.map((e) => e.useCase).join(' ')).not.toMatch(
			/counsel|without review|no review needed|ready to sign|final/i
		)
	})

	it('shows the first example locale pair on load', () => {
		render(<Hero selectedPlatform={null} onPlatformChange={() => {}} />)
		expect(
			screen.getByRole('tab', { name: new RegExp(DEMO_EXAMPLES[0].label) }).getAttribute('aria-selected')
		).toBe('true')
		expect(screen.getByText(`Original (${DEMO_EXAMPLES[0].sourceName})`)).toBeTruthy()
		expect(screen.getByText(`Localized (${DEMO_EXAMPLES[0].targetName})`)).toBeTruthy()
	})

	it('switches the rendered example when a tab is clicked', () => {
		const { container } = render(<Hero selectedPlatform={null} onPlatformChange={() => {}} />)

		const secondTab = screen.getByRole('tab', { name: new RegExp(DEMO_EXAMPLES[1].label) })
		fireEvent.click(secondTab)

		expect(secondTab.getAttribute('aria-selected')).toBe('true')
		expect(screen.getByText(`Original (${DEMO_EXAMPLES[1].sourceName})`)).toBeTruthy()
		expect(screen.getByText(`Localized (${DEMO_EXAMPLES[1].targetName})`)).toBeTruthy()

		// The previous example's target locale must be gone, not merely restyled.
		expect(screen.queryByText(`Localized (${DEMO_EXAMPLES[0].targetName})`)).toBeNull()

		// The diff highlight must follow the example, not linger from the previous one.
		const changed = highlightedText(container, 'green')
		expect(changed.length).toBeGreaterThan(0)
		expect(container.textContent).not.toContain(DEMO_EXAMPLES[0].targetName)
	})

	it('renders the non-space-delimited example with its full text highlighted', () => {
		const { container } = render(<Hero selectedPlatform={null} onPlatformChange={() => {}} />)

		fireEvent.click(screen.getByRole('tab', { name: new RegExp(DEMO_EXAMPLES[2].label) }))

		const example = DEMO_EXAMPLES[2]
		const rendered = Array.from(container.querySelectorAll('[role="tabpanel"] p')).map((p) => p.textContent ?? '')
		expect(rendered.join('|')).toContain(example.source.map((s) => s.text).join(''))
		expect(rendered.join('|')).toContain(example.target.map((s) => s.text).join(''))

		// A script without spaces still diffs: the highlights cover the whole line.
		expect(highlightedText(container, 'green').replace(/\s/g, '')).toBe(
			example.target
				.map((s) => s.text)
				.join('')
				.replace(/\s/g, '')
		)
	})
})
