import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const landingEnv = (() => {
	const declared: Record<string, string> = {}
	for (const line of readFileSync('apps/landing/.env.example', 'utf8').split('\n')) {
		const match = /^\s*([\w.]+)\s*=\s*(.*)\s*$/.exec(line)
		if (match && !match[1].startsWith('#')) {
			declared[match[1]] = match[2].replace(/^["']|["']$/g, '')
		}
	}
	return declared
})()

/**
 * Tests import `apps/landing/src/lib/site.ts`, which reads VITE_SITE_URL and
 * VITE_REPO_URL. Inject the same values `apps/landing/vite.config.ts` injects at
 * build time, from the single declared list in `.env.example`, so the suite runs
 * on a fresh clone where `.env` does not exist.
 */
export default defineConfig({
	define: {
		'import.meta.env.VITE_SITE_URL': JSON.stringify(landingEnv.VITE_SITE_URL),
		'import.meta.env.VITE_REPO_URL': JSON.stringify(landingEnv.VITE_REPO_URL),
	},
	test: {
		include: [
			'apps/desktop/tests/**/*.test.ts',
			'apps/landing/tests/**/*.test.ts',
			'apps/landing/tests/**/*.test.tsx',
			'packages/core/src/**/__tests__/**/*.test.ts',
		],
		environment: 'node',
		alias: {
			// Mock electron API for tests
		},
	},
})
