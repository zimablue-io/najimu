import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['apps/desktop/tests/**/*.test.ts', 'apps/landing/src/**/*.test.ts'],
		environment: 'node',
		alias: {
			// Mock electron API for tests
		},
	},
})
