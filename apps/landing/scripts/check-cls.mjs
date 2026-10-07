#!/usr/bin/env node
/**
 * Layout-shift gate for the landing page.
 *
 * jsdom reports every box as zero-height, so no unit test can tell whether the page
 * actually jumps when a tab changes. This drives the real page in Chromium and
 * fails when a tab switch moves any section.
 *
 * What it asserts, and why each part:
 *
 * 1. No shift on load. A shift that is not caused by input is the real-world CLS
 *    score, and it is the one a visitor cannot dismiss as their own fault.
 * 2. No section moves when the hero demo or the setup provider tab changes. The demo
 *    text itself is supposed to change, so the check is on every section's offset
 *    and on the document height, which is what the reader actually perceives as a
 *    jump. Anything below the reserved box staying put is the whole requirement.
 *
 * Input-triggered shift entries are excluded deliberately: switching a tab is user
 * input, and Chrome's own metric discards those. Counting them would flag the
 * intended content change.
 *
 * Usage: start the dev server on port 1421, then `node scripts/check-cls.mjs`.
 * Exits non-zero on failure so it can gate CI.
 */
import { chromium } from 'playwright'

const BASE_URL = process.env.CLS_BASE_URL ?? 'http://localhost:1421/'
const VIEWPORTS = [
	{ name: 'narrowest', width: 320, height: 700 },
	{ name: 'mobile', width: 390, height: 844 },
	{ name: 'tablet', width: 768, height: 1024 },
	{ name: 'laptop', width: 1024, height: 800 },
	{ name: 'desktop', width: 1440, height: 900 },
	{ name: 'wide', width: 1920, height: 1080 },
]

const installObserver = () => {
	window.__cls = { loadTotal: 0, loadEntries: [] }
	new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) {
			// hadRecentInput entries are user-initiated and excluded from the metric.
			if (entry.hadRecentInput) continue
			window.__cls.loadTotal += entry.value
			window.__cls.loadEntries.push({
				value: entry.value,
				sources: (entry.sources ?? []).map((s) =>
					s.node && s.node.nodeType === 1 ? s.node.tagName.toLowerCase() : 'text'
				),
			})
		}
	}).observe({ type: 'layout-shift', buffered: true })
}

/** Offsets the reader perceives. Nothing here is allowed to move on a tab switch. */
const readAnchors = () => {
	const anchors = {}
	for (const section of document.querySelectorAll('section, footer')) {
		const key = section.id || section.tagName.toLowerCase()
		const rect = section.getBoundingClientRect()
		anchors[`${key}:top`] = Math.round(rect.top + window.scrollY)
		const heading = section.querySelector('h1, h2')
		if (heading) anchors[`${key}:headingLeft`] = Math.round(heading.getBoundingClientRect().left)
	}
	anchors[':documentHeight'] = document.body.scrollHeight
	return anchors
}

async function checkViewport(browser, viewport) {
	const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })
	await page.addInitScript(installObserver)
	await page.goto(BASE_URL, { waitUntil: 'networkidle' })
	await page.waitForTimeout(800)

	const failures = []

	const load = await page.evaluate(() => window.__cls)
	if (load.loadTotal > 0) {
		failures.push(
			`shift on load: ${load.loadTotal.toFixed(5)} across ${load.loadEntries.length} entries ` +
				`(${load.loadEntries
					.slice(0, 3)
					.map((e) => e.sources.join(','))
					.join(' | ')})`
		)
	}

	const baseline = await page.evaluate(readAnchors)
	const drifted = []
	const compare = async (label) => {
		const now = await page.evaluate(readAnchors)
		for (const key of Object.keys(baseline)) {
			if (baseline[key] !== now[key]) {
				drifted.push(`${label}: ${key} moved ${baseline[key]} -> ${now[key]}`)
			}
		}
	}

	const demoTabs = page.locator('[role="tablist"][aria-label="Localization examples"] [role="tab"]')
	for (let i = 0; i < (await demoTabs.count()); i++) {
		await demoTabs.nth(i).click()
		await page.waitForTimeout(250)
		await compare(`demo tab ${i}`)
	}

	const providerTabs = page.locator('button:text-is("LM Studio"), button:text-is("llama.cpp")')
	for (let i = 0; i < (await providerTabs.count()); i++) {
		await providerTabs.nth(i).click()
		await page.waitForTimeout(250)
		await compare(`provider tab ${i}`)
	}

	// The expanded sidebar must not reach into the content.
	if (viewport.width >= 768) {
		await page.locator('nav.fixed button').first().hover()
		await page.waitForTimeout(400)
		await compare('sidebar hover')
		const clash = await page.evaluate(() => {
			const rail = document.querySelector('nav.fixed').getBoundingClientRect()
			const hits = []
			for (const el of document.querySelectorAll('h1, h2, h3, p, li, article, img')) {
				const rect = el.getBoundingClientRect()
				if (rect.width === 0 || rect.height === 0) continue
				if (getComputedStyle(el).position === 'absolute') continue
				if (rect.left < rail.right) {
					hits.push(
						`${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 24)}" at x=${Math.round(rect.left)}`
					)
				}
			}
			return { railRight: Math.round(rail.right), hits: hits.slice(0, 5) }
		})
		if (clash.hits.length > 0) {
			failures.push(`sidebar overlaps content (rail right edge ${clash.railRight}): ${clash.hits.join('; ')}`)
		}
	}

	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth > document.documentElement.clientWidth
	)
	if (overflow) failures.push('page scrolls horizontally')

	if (drifted.length > 0) failures.push(`section drift: ${drifted.slice(0, 5).join('; ')}`)

	await page.close()
	return failures
}

const browser = await chromium.launch()
let failed = 0

for (const viewport of VIEWPORTS) {
	const failures = await checkViewport(browser, viewport)
	if (failures.length > 0) {
		failed += 1
		console.error(`FAIL ${viewport.name} (${viewport.width}x${viewport.height})`)
		for (const failure of failures) console.error(`  - ${failure}`)
	} else {
		console.log(`ok   ${viewport.name} (${viewport.width}x${viewport.height})`)
	}
}

await browser.close()

if (failed > 0) {
	console.error(`\n${failed} viewport(s) shifted.`)
	process.exit(1)
}
console.log('\nNo layout shift at any viewport.')
