import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { downloadButtonLabel, downloadClick, downloadHref, otherDownloadChoices } from './downloads'

const BASE = 'https://github.com/zimablue-io/document-localizer/releases/latest/download'

describe('download click', () => {
	it('records an Apple silicon Mac download', () => {
		expect(downloadClick('macos', 'arm64')).toEqual({
			name: 'Download click',
			data: { platform: 'macos', arch: 'arm64' },
		})
		expect(downloadHref('macos', 'arm64')).toBe(`${BASE}/Document-Localizer-mac-arm64.dmg`)
	})

	it('records an Intel Mac download', () => {
		expect(downloadClick('macos', 'x64')).toEqual({
			name: 'Download click',
			data: { platform: 'macos', arch: 'x64' },
		})
		expect(downloadHref('macos', 'x64')).toBe(`${BASE}/Document-Localizer-mac-x64.dmg`)
	})

	it('records a Windows download', () => {
		expect(downloadClick('windows', 'x64')).toEqual({
			name: 'Download click',
			data: { platform: 'windows', arch: 'x64' },
		})
		expect(downloadHref('windows', 'x64')).toBe(`${BASE}/Document-Localizer-win-x64.exe`)
	})

	it('records a Linux download', () => {
		expect(downloadClick('linux', 'x64')).toEqual({
			name: 'Download click',
			data: { platform: 'linux', arch: 'x64' },
		})
		expect(downloadHref('linux', 'x64')).toBe(`${BASE}/Document-Localizer-linux-x86_64.AppImage`)
	})

	it('rejects a platform or arch that has no file', () => {
		expect(() => downloadClick('unsupported', 'x64')).toThrow(/platform/)
		expect(() => downloadHref('macos', 'arm')).toThrow(/arch/)
		expect(() => downloadHref('windows', 'arm64')).toThrow(/arch/)
	})

	it('keeps the detected build on the button and lists the other builds beside it', () => {
		expect(downloadButtonLabel('macos', 'arm64')).toBe('Download for macOS (Apple silicon)')
		expect(otherDownloadChoices('macos', 'arm64').map((choice) => `${choice.platform}:${choice.arch}`)).toEqual([
			'macos:x64',
			'windows:x64',
			'linux:x64',
		])
		expect(downloadButtonLabel('windows', 'x64')).toBe('Download for Windows')
		expect(otherDownloadChoices('windows', 'x64').map((choice) => choice.label)).toEqual([
			'macOS (Apple silicon)',
			'macOS (Intel)',
			'Linux',
		])
		expect(downloadButtonLabel('unsupported', null)).toBe('Download')
		expect(otherDownloadChoices('unsupported', null)).toHaveLength(4)
	})

	it('uses the same file names electron-builder writes', () => {
		const pkg = JSON.parse(readFileSync('apps/desktop/package.json', 'utf8')) as {
			build: {
				artifactName: string
				mac: { identity: null; target: { target: string; arch: string[] }[] }
			}
			scripts: { 'electron:build': string }
		}
		expect(pkg.build.artifactName).toBe(['Document-Localizer-', '{os}-', '{arch}.', '{ext}'].join('$'))
		expect(pkg.build.mac.identity).toBeNull()
		expect(pkg.build.mac.target).toEqual([{ target: 'dmg', arch: ['arm64', 'x64'] }])
		expect(pkg.scripts['electron:build']).toContain('--publish never')
	})
})
