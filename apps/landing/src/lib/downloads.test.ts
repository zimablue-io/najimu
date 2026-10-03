import { describe, expect, it } from 'vitest'
import { downloadClick, downloadHref } from './downloads'

const RELEASES_LATEST = 'https://github.com/zimablue-io/document-localizer/releases/latest'

describe('download click', () => {
	it.each(['macos', 'windows', 'linux'] as const)('records a %s download click', (platform) => {
		expect(downloadClick(platform)).toEqual({
			name: 'Download click',
			data: { platform },
		})
		expect(downloadHref(platform)).toBe(RELEASES_LATEST)
	})

	it('rejects a platform that has no download', () => {
		expect(() => downloadClick('unsupported')).toThrow(/platform/)
		expect(() => downloadHref('unsupported')).toThrow(/platform/)
	})
})
