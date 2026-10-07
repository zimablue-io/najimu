/**
 * @vitest-environment jsdom
 *
 * The hook measures its variants once and pins the container to the tallest. That
 * reservation is only valid for the content it measured. jsdom reports every box as
 * zero-height, so heights are stubbed here to assert the re-measure contract; the
 * real numbers come from `scripts/check-cls.mjs` in a browser.
 *
 * The bug this guards: `usePlatform` resolves in an effect, so the first measurement
 * runs against the placeholder platform. When the real platform renders more steps,
 * the stale reservation is shorter than the content and the steps below overlap.
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useStableHeight } from '../src/hooks/useStableHeight'

afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
})

/** Height per `data-test-h` value, so a variant can report its own size. */
function stubHeights() {
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
		const raw = this.getAttribute('data-test-h')
		const height = Number(raw ?? 0)
		return {
			height,
			width: 500,
			top: 0,
			left: 0,
			right: 500,
			bottom: height,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		} as DOMRect
	})
}

// The measuring pass renders the same content the visible slot will, so it is
// sized from the platform the way the real component's variants are.
function Harness({ platform }: { platform: string }) {
	const height = useStableHeight<HTMLDivElement>([platform])
	const size = platform === 'resolved' ? '250' : '100'

	if (height.measuring) {
		return (
			<div ref={height.containerRef} style={height.style}>
				<height.MeasurePass setRef={height.setMeasureRef}>
					<div data-test-h={size}>pass</div>
				</height.MeasurePass>
			</div>
		)
	}

	return (
		<div ref={height.containerRef} style={height.style}>
			<div data-test-h={size}>{platform}</div>
		</div>
	)
}

describe('useStableHeight re-measures when its content changes', () => {
	it('reserves the new, taller content instead of the height it first measured', () => {
		stubHeights()
		const { container, rerender } = render(<Harness platform="placeholder" />)

		const measured = container.firstElementChild as HTMLElement
		expect(measured.style.height).toBe('100px')

		// The placeholder platform resolving to a platform with taller content.
		rerender(<Harness platform="resolved" />)

		const updated = container.firstElementChild as HTMLElement
		expect(updated.style.height).toBe('250px')
	})
})
