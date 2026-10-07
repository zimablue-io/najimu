/**
 * @vitest-environment node
 *
 * Claims that ship in files no component test renders: the crawler's llms.txt, the
 * social meta tags, the docs a visitor reads on GitHub, and the file extensions the
 * exporter actually writes.
 *
 * Each assertion here maps to a way the published product could be wrong:
 *
 * - "100% offline" is false on first run. `apps/desktop/electron/embedder/worker.ts`
 *   downloads the embedding model from the Hugging Face hub before it can embed, so
 *   a claim of "no internet connection required" is contradicted by the code.
 * - The privacy policy has to describe the analytics the site actually loads, and
 *   has to be reachable, or the disclosure is worth nothing.
 * - A public support doc that contradicts the shipped build matrix is a false
 *   statement about the product, published under the owner's name.
 * - llms.txt must not advertise an output format the exporter does not write.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const REPO = join(__dirname, '..', '..', '..')
const LANDING = join(__dirname, '..')

const readLanding = (rel: string) => readFileSync(join(LANDING, rel), 'utf8')
const readRepo = (rel: string) => readFileSync(join(REPO, rel), 'utf8')

/** Every surface a visitor or crawler reads the marketing copy from. */
const COPY_SURFACES = [
	'index.html',
	'seo/llms.txt',
	'src/components/Features.tsx',
	'src/components/UseCases.tsx',
	'src/components/StepViewer.tsx',
	'src/components/SetupGuide.tsx',
	'src/components/hero/Hero.tsx',
	'src/components/hero/examples.ts',
] as const

describe('offline claims match what the app actually does', () => {
	// Model weights come from the Hugging Face hub on first use, so the absolute
	// claim is untrue until they are cached.
	it.each(COPY_SURFACES)('%s makes no unconditional offline claim', (file) => {
		const source = readLanding(file)
		expect(source).not.toMatch(/100% offline/i)
		expect(source).not.toMatch(/no internet connection required/i)
		expect(source).not.toMatch(/air-?gapped/i)
		expect(source).not.toMatch(/works entirely offline/i)
	})

	it('still claims the document text stays on the machine', () => {
		// The claim that is actually true, and the one worth keeping.
		expect(readLanding('seo/llms.txt')).toMatch(/documents never leave/i)
		expect(readLanding('src/components/Features.tsx')).toMatch(/nothing leaves your device/i)
	})
})

// Crawlers read llms.txt directly, so the rendered-page assertions do not reach it.
describe('llms.txt does not solicit work in a regulated domain', () => {
	it.each([
		['legal', /\blegal\b/i],
		['contracts', /\bcontracts?\b/i],
		['medical', /\bmedical\b/i],
		['financial', /\bfinancial\b/i],
		['regulatory', /\bregulatory\b/i],
	])('does not market %s documents', (_domain, pattern) => {
		expect(readLanding('seo/llms.txt')).not.toMatch(pattern)
	})
})

describe('llms.txt describes the output formats the exporter writes', () => {
	// `contentToDocx` produces an OOXML package, so the extension and mime are .docx.
	it('advertises Word as .docx', () => {
		expect(readLanding('seo/llms.txt')).toMatch(/\.docx/)
		expect(readLanding('seo/llms.txt')).not.toMatch(/\.doc\b(?!x)/)
	})

	it('keeps the export caveat that PDF flattens formatting', () => {
		expect(readLanding('seo/llms.txt')).toMatch(/export caveat/i)
	})
})

describe('the privacy policy matches the tracking the site loads', () => {
	const policy = readRepo('docs/PRIVACY.md')

	it('names both Vercel products the landing entry point mounts', () => {
		expect(readLanding('src/main.tsx')).toMatch(/@vercel\/analytics/)
		expect(readLanding('src/main.tsx')).toMatch(/@vercel\/speed-insights/)
		expect(policy).toMatch(/Vercel Analytics/i)
		expect(policy).toMatch(/Speed Insights/i)
	})

	it('does not claim no personal data is collected while analytics is running', () => {
		expect(policy).not.toMatch(/do(?:es)? not collect any (?:personal )?data/i)
		expect(policy).not.toMatch(/there is no data to access, correct, or delete/i)
	})

	it('identifies the processor and offers a route to exercise rights', () => {
		expect(policy).toMatch(/vercel\.com\/legal/i)
		expect(policy).toMatch(/access, correct,? or delete/i)
	})
})

describe('published docs agree with the shipped build', () => {
	it('does not claim a single-platform release', () => {
		const support = readRepo('docs/SUPPORT.md')
		expect(support).not.toMatch(/macOS only/i)
		expect(support).toMatch(/macOS/i)
		expect(support).toMatch(/Windows/i)
		expect(support).toMatch(/Linux/i)
	})

	// Two license files drift, and only the root one is linked from the readme.
	it('leaves a single license file in the repository', () => {
		expect(readdirSync(REPO).filter((f) => /^licen[sc]e\.md$/i.test(f))).toEqual(['LICENSE.md'])
		expect(readdirSync(join(REPO, 'docs')).filter((f) => /^licen[sc]e\.md$/i.test(f))).toEqual([])
	})
})
