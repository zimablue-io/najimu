import { type CSSProperties, type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from 'react'

/** Per-part heights read out of the measuring pass, keyed by `data-part` value. */
type PartHeights = Record<string, number>

export interface StableHeight<T extends HTMLElement> {
	/** Attach to the container holding the active variant. It must be `relative`. */
	containerRef: RefObject<T>
	/** Pass to `MeasurePass` as `setRef`. */
	setMeasureRef: (element: HTMLDivElement | null) => void
	/** Apply to the container. */
	style: CSSProperties | undefined
	/** Renders the off-screen measuring pass. Mount it only while `measuring`. */
	MeasurePass: (props: { setRef: (element: HTMLDivElement | null) => void; children: ReactNode }) => ReactNode
	/** True while the measuring pass needs to be mounted. */
	measuring: boolean
}

function MeasurePass({ setRef, children }: { setRef: (element: HTMLDivElement | null) => void; children: ReactNode }) {
	return (
		<div
			ref={setRef}
			aria-hidden="true"
			// Absolute so the pass contributes nothing to the page, invisible so it never
			// paints, clipped so a variant's decorative offsets cannot extend the scrollable
			// area. The variants still lay out, so their heights are real.
			className="absolute inset-x-0 top-0 invisible overflow-clip"
		>
			{children}
		</div>
	)
}

/**
 /**
 * Reserves space so swapping between tabs of unequal content moves nothing.
 *
 * A hardcoded min-height goes stale the next time a sentence is edited; measuring
 * the real variants cannot. Reserving the container's total height is not enough
 * either, because a caption that wraps to an extra line still slides the card
 * below it inside the fixed box. So any descendant carrying `data-part="<name>"`
 * is measured too, and the tallest of each is published on the container as
 * `--demo-<name>-h`.
 *
 * Every variant is rendered once into an off-screen pass, the reservation is
 * applied to the visible container, and the pass is discarded in the same layout
 * cycle, before the browser paints. Only the active variant is ever in the
 * document, so switching leaves no stale text for assistive tech to read.
 *
 * `deps` names the inputs that change what the variants measure. A reservation is
 * only valid for the content it was taken from, so when `deps` changes the pass
 * runs again. Without this the first measurement wins forever, and content that
 * arrives later (a platform detected in an effect, a translated string) renders
 * into a box sized for something else.
 */
export function useStableHeight<T extends HTMLElement>(deps: readonly unknown[] = []): StableHeight<T> {
	const containerRef = useRef<T>(null)
	const measureRef = useRef<HTMLDivElement | null>(null)
	const [style, setStyle] = useState<CSSProperties | undefined>(undefined)
	const [measuring, setMeasuring] = useState(true)

	// Spread so the caller's list is the dependency array itself, which is what
	// makes a changed dep re-run this effect.
	useLayoutEffect(() => {
		setMeasuring(true)
	}, [...deps])

	// No dependency array: must run on the render that mounts the measuring pass.
	useLayoutEffect(() => {
		if (!measuring) return
		const pass = measureRef.current
		if (!pass) return

		let tallest = 0
		const partMaxima: PartHeights = {}

		for (const variant of Array.from(pass.children)) {
			tallest = Math.max(tallest, variant.getBoundingClientRect().height)

			for (const part of Array.from(variant.querySelectorAll('[data-part]'))) {
				const name = part.getAttribute('data-part')
				if (!name) continue
				partMaxima[name] = Math.max(partMaxima[name] ?? 0, part.getBoundingClientRect().height)
			}
		}

		// A zero tallest means there is no layout to read, as in jsdom.
		if (tallest <= 0) {
			setStyle(undefined)
		} else {
			// CSSProperties has no index signature for custom properties, so the key type is
			// widened here rather than asserting at the point of assignment.
			const next: CSSProperties & Record<`--${string}`, string> = { height: tallest }
			for (const [name, value] of Object.entries(partMaxima)) {
				next[`--demo-${name}-h`] = `${value}px`
			}
			setStyle(next)
		}
		setMeasuring(false)
	})

	// A width change invalidates the reservation, since the tallest variant wraps
	// differently at every breakpoint. Ignoring height stops the observer from
	// re-measuring in response to the height this hook just applied.
	useLayoutEffect(() => {
		const container = containerRef.current
		if (!container || typeof ResizeObserver === 'undefined') return

		let lastWidth = container.getBoundingClientRect().width
		const observer = new ResizeObserver((entries) => {
			const width = entries[0]?.contentRect.width ?? 0
			if (width > 0 && Math.abs(width - lastWidth) > 0.5) {
				lastWidth = width
				setMeasuring(true)
			}
		})
		observer.observe(container)
		return () => observer.disconnect()
	}, [])

	return {
		containerRef,
		setMeasureRef: (element) => {
			measureRef.current = element
		},
		style,
		MeasurePass,
		measuring,
	}
}
