/**
 * @vitest-environment jsdom
 *
 * The How It Works screenshots have three different intrinsic ratios, and the
 * scroll-driven step switch used to unmount the inactive panel. Both move the
 * page. The fix is structural, so it can be asserted here without a layout engine:
 *
 * - every image declares its intrinsic width and height, which is what lets the
 *   browser reserve the aspect-ratio box before the file decodes
 * - the three panels share one grid cell, so the column is always as tall as the
 *   tallest step rather than as tall as whichever step happens to be active
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import StepViewer from '../src/components/StepViewer'

// jsdom implements no IntersectionObserver, and the viewer constructs one on mount.
// The stub covers the platform gap; it reports nothing, so the active step stays 0.
beforeAll(() => {
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

const IMAGE_DIR = join(__dirname, '..', 'public', 'images')

/**
 * Reads the real dimensions out of the PNG IHDR chunk, so replacing or resizing a
 * screenshot turns this red instead of leaving the declared size quietly wrong.
 */
function pngSize(file: string): { width: number; height: number } {
	const buffer = readFileSync(join(IMAGE_DIR, file))
	expect(buffer.subarray(1, 4).toString()).toBe('PNG')
	return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

describe('How It Works screenshots reserve their space', () => {
	it('gives every image an intrinsic width and height', () => {
		const { container } = render(<StepViewer />)
		const images = Array.from(container.querySelectorAll('img'))

		expect(images).toHaveLength(3)
		for (const image of images) {
			expect(image.getAttribute('width')).toMatch(/^\d+$/)
			expect(image.getAttribute('height')).toMatch(/^\d+$/)
		}
	})

	it('declares the real pixel size of each file on disk', () => {
		const { container } = render(<StepViewer />)

		for (const image of Array.from(container.querySelectorAll('img'))) {
			const file = (image.getAttribute('src') ?? '').replace('/images/', '')
			const actual = pngSize(file)
			expect(image.getAttribute('width')).toBe(String(actual.width))
			expect(image.getAttribute('height')).toBe(String(actual.height))
		}
	})

	it('stacks the step panels in one grid cell so the column height is constant', () => {
		const { container } = render(<StepViewer />)
		const panels = Array.from(container.querySelectorAll('[aria-hidden]'))

		expect(panels).toHaveLength(3)
		for (const panel of panels) {
			expect(panel.className).toContain('col-start-1')
			expect(panel.className).toContain('row-start-1')
		}
		// `hidden` would drop the panel out of layout and resize the column on switch.
		for (const panel of panels) {
			expect(panel.className).not.toContain('hidden')
		}
	})
})
