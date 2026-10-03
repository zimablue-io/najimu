import { describe, expect, it } from 'vitest'
import { detectMachine, resolveDownloadChoice } from './machine'

const appleSiliconUa =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'
const windowsUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0'
const linuxUa = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128.0.0.0'
const iphoneUa =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'

describe('detectMachine', () => {
	it('treats a Windows browser as Windows', () => {
		expect(detectMachine({ userAgent: windowsUa, platform: 'Win32' })).toEqual({
			platform: 'windows',
			arch: 'x64',
		})
	})

	it('treats a Linux browser as Linux', () => {
		expect(detectMachine({ userAgent: linuxUa, platform: 'Linux x86_64' })).toEqual({
			platform: 'linux',
			arch: 'x64',
		})
	})

	it('treats an Intel Mac as Intel even though the user agent says Intel on every Mac', () => {
		expect(
			detectMachine({
				userAgent: appleSiliconUa,
				platform: 'MacIntel',
				architecture: 'x86',
			})
		).toEqual({ platform: 'macos', arch: 'x64' })
		expect(
			detectMachine({
				userAgent: appleSiliconUa,
				platform: 'MacIntel',
				gpuRenderer: 'Intel(R) Iris(TM) Plus Graphics',
			})
		).toEqual({ platform: 'macos', arch: 'x64' })
	})

	it('treats an Apple silicon Mac as Apple silicon when the user agent still says Intel', () => {
		expect(
			detectMachine({
				userAgent: appleSiliconUa,
				platform: 'MacIntel',
				architecture: 'arm',
			})
		).toEqual({ platform: 'macos', arch: 'arm64' })
		expect(
			detectMachine({
				userAgent: appleSiliconUa,
				platform: 'MacIntel',
				gpuRenderer: 'Apple M4',
			})
		).toEqual({ platform: 'macos', arch: 'arm64' })
	})

	it('does not treat an iPhone as a Mac', () => {
		expect(detectMachine({ userAgent: iphoneUa, platform: 'iPhone' })).toEqual({
			platform: 'unsupported',
			arch: null,
		})
	})
})

describe('resolveDownloadChoice', () => {
	it('shows the Intel disk on an Intel Mac', () => {
		expect(resolveDownloadChoice({ platform: 'macos', arch: 'x64' }, null, null)).toEqual({
			platform: 'macos',
			arch: 'x64',
		})
	})

	it('shows Windows on a Windows machine', () => {
		expect(resolveDownloadChoice({ platform: 'windows', arch: 'x64' }, null, null)).toEqual({
			platform: 'windows',
			arch: 'x64',
		})
	})

	it('returns to the machine arch when macOS is selected again', () => {
		expect(resolveDownloadChoice({ platform: 'macos', arch: 'arm64' }, 'macos', null)).toEqual({
			platform: 'macos',
			arch: 'arm64',
		})
		expect(resolveDownloadChoice({ platform: 'macos', arch: 'x64' }, 'macos', null)).toEqual({
			platform: 'macos',
			arch: 'x64',
		})
	})

	it('keeps an explicit processor choice while the visitor stays on macOS', () => {
		expect(resolveDownloadChoice({ platform: 'macos', arch: 'arm64' }, 'macos', 'x64')).toEqual({
			platform: 'macos',
			arch: 'x64',
		})
	})
})
