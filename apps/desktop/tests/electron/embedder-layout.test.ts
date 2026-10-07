import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
	app: { getPath: () => '/tmp/dl-test-userdata' },
}))

import path from 'node:path'
import { workerScriptPath } from '../../electron/embedder'

/**
 * The embedder manager compiles to dist-electron/embedder/index.js, so the
 * worker must be a sibling. Getting this wrong makes the worker silently
 * fail to spawn, which disables translation memory with no visible error.
 */
describe('embedder worker path', () => {
	it('should resolve the worker as a sibling of the manager module', () => {
		expect(workerScriptPath('/app/dist-electron/embedder')).toBe('/app/dist-electron/embedder/worker.js')
	})

	it('should not nest the embedder directory twice', () => {
		const resolved = workerScriptPath('/app/dist-electron/embedder')
		expect(resolved).not.toContain(`${path.sep}embedder${path.sep}embedder${path.sep}`)
	})

	it('should point at a file that the electron build actually emits', () => {
		// tsconfig.electron.json has rootDir "electron" and outDir "dist-electron",
		// so electron/embedder/worker.ts must compile to embedder/worker.js.
		const built = path.join(__dirname, '../../dist-electron/embedder/worker.js')
		expect(path.basename(built)).toBe('worker.js')
		expect(path.basename(path.dirname(built))).toBe('embedder')
	})
})
