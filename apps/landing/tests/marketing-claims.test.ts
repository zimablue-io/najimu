/**
 * @vitest-environment jsdom
 *
 * Marketing copy is a product surface: every capability claim here is checked against
 * what the export and rendering code actually does. See apps/desktop/src/lib/export.ts
 * (markdownToPlainText strips code blocks on PDF export) and the absence of any syntax
 * highlighter in apps/desktop.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const LANDING = join(__dirname, '..')
const read = (rel: string) => readFileSync(join(LANDING, rel), 'utf8')

const useCases = read('src/components/UseCases.tsx')
const llms = read('public/llms.txt')

const allCopy = `${useCases}\n${llms}`

describe('capability claims match the implementation', () => {
	it('does not claim syntax highlighting, which the app does not implement', () => {
		// No syntax highlighter exists in apps/desktop or packages/core.
		expect(allCopy).not.toMatch(/syntax highlight/i)
	})

	it('does not promise unbroken code snippets', () => {
		expect(allCopy).not.toMatch(/no broken code/i)
	})

	it('does not claim code blocks survive PDF export', () => {
		// markdownToPlainText() removes ``` blocks before writing the PDF.
		expect(allCopy).not.toMatch(/preserves?[^.]*\bcode blocks?\b/i)
	})

	it('does not claim layout structure is retained', () => {
		expect(allCopy).not.toMatch(/layout structure/i)
	})

	it('does not claim tables survive, since the parser returns plain text', () => {
		expect(allCopy).not.toMatch(/preserves?[^.]*\btables\b/i)
	})
})

describe('unverifiable quality and numeric claims', () => {
	it('does not assert output is "professional"', () => {
		expect(allCopy).not.toMatch(/output professional/i)
	})

	it('does not quote an unsupported cost-saving percentage', () => {
		// There is no benchmark, study, or data behind a "70%" figure.
		expect(allCopy).not.toMatch(/\b\d{1,3}%\s*(?:cheaper|less|cost saving)/i)
		expect(useCases).not.toMatch(/up to \d+%/i)
	})

	it('does not quote competitor per-user subscription prices', () => {
		expect(llms).not.toMatch(/\$\d+\s*[–-]\s*\$\d+/i)
	})
})

describe('accuracy disclaimer', () => {
	it('is present on the page that shows example output', () => {
		expect(read('src/components/hero/Hero.tsx')).toMatch(/can contain errors/i)
	})

	it('is present in the AI crawler summary', () => {
		expect(llms).toMatch(/can contain errors|review/i)
	})
})

describe('comparative claims stay verifiable', () => {
	it('states that output quality depends on the local model', () => {
		expect(llms).toMatch(/quality depends on the local (?:AI )?model/i)
	})
})
