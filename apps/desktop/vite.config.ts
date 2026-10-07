import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/// <reference types="vitest" />

export default defineConfig({
	plugins: [react(), tailwindcss()],
	clearScreen: false,
	base: './',
	server: {
		port: 1420,
		strictPort: true,
		fs: {
			allow: ['../../packages/ui', '../../packages/core', '.'],
		},
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@najimu/core': path.resolve(__dirname, '../../packages/core/src'),
			'@najimu/ui': path.resolve(__dirname, '../../packages/ui/src'),
		},
	},
	build: {
		target: ['es2022', 'chrome130', 'safari18'],
		outDir: 'dist',
		rollupOptions: {
			output: {
				manualChunks: undefined,
			},
		},
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: './src/test-setup.ts',
	},
})
