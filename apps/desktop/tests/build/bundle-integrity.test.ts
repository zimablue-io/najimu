import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')) as {
	dependencies: Record<string, string>
	build: {
		files: string[]
		asarUnpack?: string[]
	}
}

/**
 * These assert the packaging configuration rather than a built artifact,
 * so they run on every `pnpm test` instead of quietly passing when the
 * asar happens to be absent.
 */
describe('Electron bundle configuration', () => {
	it('should ship the renderer and main-process output', () => {
		expect(pkg.build.files).toContain('dist/**/*')
		expect(pkg.build.files).toContain('dist-electron/**/*')
	})

	it('should declare transformers as a runtime dependency for the embedder', () => {
		expect(pkg.dependencies['@huggingface/transformers']).toBeDefined()
	})

	it('should unpack the onnxruntime native binaries, which cannot load from inside an asar', () => {
		const unpacked = pkg.build.asarUnpack ?? []
		expect(unpacked).toContain('**/node_modules/onnxruntime-node/bin/**')
	})
})
