import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'

const DESKTOP = join(__dirname, '..', '..')

function join(...parts: string[]): string {
	return path.join(...parts)
}

const pkg = JSON.parse(fs.readFileSync(join(DESKTOP, 'package.json'), 'utf-8')) as {
	name: string
	dependencies: Record<string, string>
	publish: { owner: string; repo: string }
	build: {
		productName: string
		appId: string
	}
}

/**
 * The product ships as "Najimu" (馴染む, "to fit in"). A stale name in the
 * packaging config surfaces as a wrong app name in the installer's
 * Applications folder and a wrong auto-update identity, neither of which the
 * bundle-integrity test can see.
 */
describe('Najimu bundle identity', () => {
	it('builds the desktop package under the Najimu scope', () => {
		expect(pkg.name).toBe('@najimu/desktop')
	})

	it('installs as Najimu', () => {
		expect(pkg.build.productName).toBe('Najimu')
	})

	it('uses the Najimu app id, which keys the macOS signing identity', () => {
		expect(pkg.build.appId).toBe('io.najimu.app')
	})

	it('publishes updates to the najimu repository', () => {
		expect(pkg.publish.owner).toBe('zimablue-io')
		expect(pkg.publish.repo).toBe('najimu')
	})

	it('depends on the workspace packages through the Najimu scope', () => {
		expect(pkg.dependencies['@najimu/core']).toBe('workspace:*')
		expect(pkg.dependencies['@najimu/ui']).toBe('workspace:*')
	})
})
