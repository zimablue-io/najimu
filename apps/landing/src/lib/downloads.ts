const DOWNLOAD_PLATFORMS = ['macos', 'windows', 'linux'] as const

export type DownloadPlatform = (typeof DOWNLOAD_PLATFORMS)[number]

export const RELEASES_LATEST_URL = 'https://github.com/zimablue-io/document-localizer/releases/latest'

export function downloadClick(platform: string): {
	name: 'Download click'
	data: { platform: DownloadPlatform }
} {
	return {
		name: 'Download click',
		data: { platform: requireDownloadPlatform(platform) },
	}
}

export function downloadHref(platform: string): string {
	requireDownloadPlatform(platform)
	return RELEASES_LATEST_URL
}

function requireDownloadPlatform(platform: string): DownloadPlatform {
	if ((DOWNLOAD_PLATFORMS as readonly string[]).includes(platform)) {
		return platform as DownloadPlatform
	}
	throw new Error(`Unsupported download platform: ${platform}`)
}
