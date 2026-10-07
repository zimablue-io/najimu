import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', 'src')
const css = readFileSync(join(SRC, 'index.css'), 'utf8')

function sourceFiles(dir: string = SRC): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const full = join(dir, entry)
		if (statSync(full).isDirectory()) return sourceFiles(full)
		return full.endsWith('.tsx') ? [full] : []
	})
}

function fullBleedClass(source: string): string | null {
	return /<(?:section|footer)[^>]*className="([^"]*)"/.exec(source)?.[1] ?? null
}

describe('section horizontal padding has one source of truth', () => {
	it('defines the shared padding once as a utility', () => {
		expect(css).toMatch(/@utility\s+section-gutter/)
		expect(css).toMatch(/--nav-gutter:/)
	})

	it.each([
		'components/hero/Hero.tsx',
		'components/Features.tsx',
		'components/UseCases.tsx',
		'components/StepViewer.tsx',
		'components/SetupGuide.tsx',
		'components/Footer.tsx',
	])('%s uses the shared utility', (file) => {
		const classes = fullBleedClass(readFileSync(join(SRC, file), 'utf8'))
		expect(classes, `${file} has no full-bleed wrapper`).not.toBeNull()
		expect(classes).toContain('section-gutter')
	})

	it('leaves no hand-written horizontal padding on a full-bleed section', () => {
		const offenders = sourceFiles()
			.map((file) => [file, fullBleedClass(readFileSync(file, 'utf8'))] as const)
			.filter(([, classes]) => classes !== null)
			.filter(([, classes]) => /(?:^|\s)(?:px|pl|pr)-|(?:^|\s)md:(?:px|pl|pr)-/.test(classes as string))
			.map(([file]) => file)
		expect(offenders).toEqual([])
	})
})
