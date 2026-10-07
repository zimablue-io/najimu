import { readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Vite substitutes `%VITE_*%` in index.html only for variables it can see, and it
 * silently skips a placeholder it cannot resolve rather than failing. Seed the
 * `define` map from `.env.example`, which lists every variable the landing site
 * reads, so a fresh clone with no `.env` still produces correct canonical and og
 * tags. A local `.env` or a real environment variable overrides these, matching
 * the precedence `scripts/render-seo.mjs` applies to the seo/ templates.
 */
function declaredEnv(): Record<string, string> {
	const declared: Record<string, string> = {}
	for (const line of readFileSync(path.resolve(__dirname, '.env.example'), 'utf8').split('\n')) {
		const match = /^\s*([\w.]+)\s*=\s*(.*)\s*$/.exec(line)
		if (match && !match[1].startsWith('#')) {
			declared[match[1]] = match[2].replace(/^["']|["']$/g, '')
		}
	}

	const missing = ['VITE_SITE_URL', 'VITE_REPO_URL'].filter((key) => !declared[key])
	if (missing.length > 0) {
		throw new Error(`${missing.join(', ')} must be declared in apps/landing/.env.example`)
	}

	return declared
}

export default defineConfig({
	define: Object.fromEntries(
		Object.entries(declaredEnv()).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])
	),
	plugins: [react(), tailwindcss()],
	server: {
		port: 1421,
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@najimu/ui': path.resolve(__dirname, '../../packages/ui/src'),
		},
	},
})
