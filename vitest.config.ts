import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: [
			'apps/desktop/tests/**/*.test.ts',
			'apps/landing/tests/**/*.test.ts',
			'apps/landing/tests/**/*.test.tsx',
		],
		environment: 'node',
		alias: {
			// Mock electron API for tests
		},
	},
})
