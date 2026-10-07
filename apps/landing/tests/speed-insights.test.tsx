/**
 * @vitest-environment jsdom
 *
 * Speed Insights reports Core Web Vitals from a script injected into document.head
 * by the component mounted in `src/main.tsx`. Asserting on the injected tag rather
 * than on the source text keeps this a check of the real app entry: if the
 * component is dropped from the render tree, the tag never appears.
 *
 * `src/main.tsx` renders on import and exports nothing, so the import is the action
 * under test and `#root` has to exist before it runs.
 *
 * jsdom implements neither ResizeObserver nor IntersectionObserver, which
 * `useActiveSection` and `StepViewer` construct while mounting App. Stubbing them
 * covers that platform gap and does not affect the assertion, since the script
 * injection happens in SpeedInsights' own effect.
 */
import { act } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

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

describe('landing app entry', () => {
	it('injects the Speed Insights script', async () => {
		const root = document.createElement('div')
		root.id = 'root'
		document.body.appendChild(root)

		await act(async () => {
			await import('../src/main')
		})

		expect(document.head.querySelector('script[src*="speed-insights"]')).not.toBeNull()

		root.remove()
	})
})
