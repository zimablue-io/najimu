import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LANDING = join(dirname(fileURLToPath(import.meta.url)), '..')
const SEO_DIR = join(LANDING, 'seo')
const PUBLIC_DIR = join(LANDING, 'public')

/**
 * Vite substitutes `%VITE_*%` in index.html but copies `public/` verbatim, so the
 * files a crawler reads are rendered from `seo/` here. A placeholder with no
 * value throws: publishing a literal "%VITE_SITE_URL%" into a sitemap would
 * fail silently and rank nothing.
 *
 * Only `VITE_`-prefixed names are placeholders, so percent-encoded URL segments
 * such as `step%201%20-%20uploaded.png` pass through untouched.
 */
export function renderSeoTemplate(source, env) {
	return source.replace(/%VITE_[A-Z0-9_]+%/g, (match) => {
		const key = match.slice(1, -1)
		const value = env[key]
		if (value === undefined) {
			throw new Error(`${match} is referenced but ${key} is not set`)
		}
		return value
	})
}

function parseEnvFile(path) {
	let raw
	try {
		raw = readFileSync(path, 'utf8')
	} catch {
		return {}
	}
	const parsed = {}
	for (const line of raw.split('\n')) {
		const match = /^\s*([\w.]+)\s*=\s*(.*)\s*$/.exec(line)
		if (match && !match[1].startsWith('#')) {
			parsed[match[1]] = match[2].replace(/^["']|["']$/g, '')
		}
	}
	return parsed
}

/**
 * `.env.example` is onboarding documentation and lists every variable the landing
 * site reads, with the production values. It is the baseline a fresh clone builds
 * from, and nothing here treats it as a runtime override.
 *
 * Precedence, lowest to highest: `.env.example`, then a developer's `.env`, then
 * `.env.local`, then real environment variables (which is what CI and Vercel set
 * for a preview deploy).
 */
function resolveEnv() {
	const env = {
		...parseEnvFile(join(LANDING, '.env.example')),
		...parseEnvFile(join(LANDING, '.env')),
		...parseEnvFile(join(LANDING, '.env.local')),
		...process.env,
	}

	const missing = ['VITE_SITE_URL', 'VITE_REPO_URL'].filter((key) => !env[key])
	if (missing.length > 0) {
		throw new Error(
			`${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} unset.\n` +
				'Set them in .env, or run: cp apps/landing/.env.example apps/landing/.env'
		)
	}

	return env
}

function renderAll() {
	const env = resolveEnv()
	for (const name of readdirSync(SEO_DIR)) {
		const rendered = renderSeoTemplate(readFileSync(join(SEO_DIR, name), 'utf8'), env)
		writeFileSync(join(PUBLIC_DIR, name), rendered)
		console.log(`rendered ${name}`)
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	renderAll()
}
