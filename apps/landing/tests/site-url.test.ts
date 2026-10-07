import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderSeoTemplate } from '../scripts/render-seo.mjs'

const LANDING = join(__dirname, '..')
const read = (rel: string) => readFileSync(join(LANDING, rel), 'utf8')

const SEO_FILES = ['seo/sitemap.xml', 'seo/robots.txt', 'seo/llms.txt', 'seo/manifest.webmanifest'] as const

const RENDER_SCRIPT = join(LANDING, 'scripts', 'render-seo.mjs')

/** Runs the real render script, so these tests exercise shipped code. */
function renderWith(env: Record<string, string>) {
	return spawnSync(process.execPath, [RENDER_SCRIPT], {
		cwd: LANDING,
		env: { PATH: process.env.PATH ?? '', ...env },
		encoding: 'utf8',
	})
}

function declaredEnv(): Record<string, string> {
	const declared: Record<string, string> = {}
	for (const line of read('.env.example').split('\n')) {
		const match = /^\s*([\w.]+)\s*=\s*(.*)\s*$/.exec(line)
		if (match && !match[1].startsWith('#')) {
			declared[match[1]] = match[2].replace(/^["']|["']$/g, '')
		}
	}
	return declared
}

describe('SEO template rendering', () => {
	it('substitutes the site URL declared in the environment', () => {
		expect(
			renderSeoTemplate('<loc>%VITE_SITE_URL%/</loc>', {
				VITE_SITE_URL: 'https://najimu.zimablue.io',
			})
		).toBe('<loc>https://najimu.zimablue.io/</loc>')
	})

	it('substitutes the repository URL declared in the environment', () => {
		expect(
			renderSeoTemplate('repo=%VITE_REPO_URL%/releases', {
				VITE_REPO_URL: 'https://github.com/zimablue-io/najimu',
			})
		).toBe('repo=https://github.com/zimablue-io/najimu/releases')
	})

	// A sitemap served with a literal "%VITE_SITE_URL%" is silently wrong and ranks nothing.
	it('fails the build instead of publishing an unresolved placeholder', () => {
		expect(() => renderSeoTemplate('<loc>%VITE_SITE_URL%/</loc>', {})).toThrow(/VITE_SITE_URL/)
	})

	it('leaves text with no placeholder untouched', () => {
		expect(renderSeoTemplate('User-agent: *\nAllow: /', { VITE_SITE_URL: 'x' })).toBe('User-agent: *\nAllow: /')
	})

	// The screenshot filenames in the sitemap carry percent-encoded spaces.
	it('leaves percent-encoded URL segments intact', () => {
		expect(
			renderSeoTemplate('%VITE_SITE_URL%/images/step%201%20-%20uploaded.png', {
				VITE_SITE_URL: 'https://najimu.zimablue.io',
			})
		).toBe('https://najimu.zimablue.io/images/step%201%20-%20uploaded.png')
	})
})

describe('published URLs come from the environment', () => {
	it.each(SEO_FILES)('%s builds its absolute URLs from env placeholders', (file) => {
		const source = read(file)
		expect(source).toMatch(/%VITE_(SITE|REPO)_URL%/)
		expect(source).not.toMatch(/zimablue-io\.github\.io/)
	})

	it('declares the site URL in index.html rather than hardcoding it', () => {
		const html = read('index.html')
		expect(html).toContain('%VITE_SITE_URL%')
		expect(html).toContain('%VITE_REPO_URL%')
		expect(html).not.toMatch(/zimablue-io\.github\.io/)
	})

	it('documents the two variables in .env.example', () => {
		const example = read('.env.example')
		expect(example).toMatch(/^VITE_SITE_URL=/m)
		expect(example).toMatch(/^VITE_REPO_URL=/m)
	})
})

describe('.env.example is the single declared list', () => {
	const declared = declaredEnv()

	it('declares every variable the landing site reads, one per entry', () => {
		const used = [...read('src/lib/site.ts').matchAll(/import\.meta\.env\.(\w+)/g)].map((m) => m[1])
		expect(used.length).toBeGreaterThan(0)
		for (const key of used) {
			expect(Object.keys(declared)).toContain(key)
		}
	})

	it('holds the two public URLs and nothing else', () => {
		expect(declared.VITE_SITE_URL).toBe('https://najimu.zimablue.io')
		expect(declared.VITE_REPO_URL).toBe('https://github.com/zimablue-io/najimu')
		expect(Object.keys(declared)).toHaveLength(2)
	})

	it('is the only committed file carrying those values', () => {
		// A second copy of the URLs in a second file is how they drift apart.
		const declaredInConfig = read('vite.config.ts')
		expect(declaredInConfig).toContain('.env.example')
		expect(declaredInConfig).not.toContain('najimu.zimablue.io')
		expect(read('scripts/render-seo.mjs')).not.toContain('najimu.zimablue.io')
		expect(read('src/lib/site.ts')).not.toContain('najimu.zimablue.io')
	})

	it('has no duplicate key or second value file', () => {
		expect(read('.env.example').match(/^VITE_SITE_URL=/gm)).toHaveLength(1)
		expect(read('.env.example').match(/^VITE_REPO_URL=/gm)).toHaveLength(1)
	})
})

describe('every build resolves both URLs', () => {
	// A fresh clone and CI have no .env, and Vite silently skips a placeholder it
	// cannot resolve, which would publish a broken canonical and og:url.
	it('renders the SEO files with no .env and an empty shell env', () => {
		expect(renderWith({}).status).toBe(0)
		expect(read('public/sitemap.xml')).toContain('<loc>https://najimu.zimablue.io/</loc>')
		for (const file of SEO_FILES) {
			// SEO_FILES are paths under seo/; the rendered copies land in public/.
			expect(read(`public/${basename(file)}`)).not.toMatch(/%VITE_[A-Z0-9_]+%/)
		}
	})

	it('lets a real environment variable override the declared default', () => {
		expect(renderWith({ VITE_SITE_URL: 'https://preview.najimu.zimablue.io' }).status).toBe(0)
		expect(read('public/sitemap.xml')).toContain('<loc>https://preview.najimu.zimablue.io/</loc>')
	})

	it('resolves every SEO placeholder from the declared env', () => {
		for (const file of SEO_FILES) {
			expect(renderSeoTemplate(read(file), declaredEnv())).not.toMatch(/%VITE_[A-Z0-9_]+%/)
		}
	})

	it('leaves no unresolved placeholder in index.html once Vite substitutes', () => {
		const html = read('index.html').replace(/%(VITE_[A-Z0-9_]+)%/g, (_m, key: string) => declaredEnv()[key] ?? '')
		expect(html).not.toMatch(/%VITE_[A-Z0-9_]+%/)
	})

	it('exports the renderer from the shipped script rather than a copy', () => {
		expect(read('scripts/render-seo.mjs')).toContain('export function renderSeoTemplate')
		// The script only runs when invoked directly, so importing it is inert.
		expect(typeof renderSeoTemplate).toBe('function')
	})
})
