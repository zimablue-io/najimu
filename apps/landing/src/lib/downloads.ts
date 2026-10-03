const DOWNLOAD_PLATFORMS = ['macos', 'windows', 'linux'] as const
const DOWNLOAD_ARCHS = ['arm64', 'x64'] as const

export type DownloadPlatform = (typeof DOWNLOAD_PLATFORMS)[number]
export type DownloadArch = (typeof DOWNLOAD_ARCHS)[number]

export const DOWNLOAD_CHOICES: { platform: DownloadPlatform; arch: DownloadArch; label: string }[] = [
	{ platform: 'macos', arch: 'arm64', label: 'macOS (Apple silicon)' },
	{ platform: 'macos', arch: 'x64', label: 'macOS (Intel)' },
	{ platform: 'windows', arch: 'x64', label: 'Windows' },
	{ platform: 'linux', arch: 'x64', label: 'Linux' },
]

export function downloadButtonLabel(platform: string, arch: string | null): string {
	const choice = DOWNLOAD_CHOICES.find((item) => item.platform === platform && item.arch === arch)
	return choice ? `Download for ${choice.label}` : 'Download'
}

export function otherDownloadChoices(platform: string, arch: string | null) {
	return DOWNLOAD_CHOICES.filter((choice) => choice.platform !== platform || choice.arch !== arch)
}

const RELEASE_DOWNLOAD_BASE = 'https://github.com/zimablue-io/document-localizer/releases/latest/download'

// electron-builder writes x64 AppImage files as x86_64.
const DOWNLOAD_FILES: Record<DownloadPlatform, Partial<Record<DownloadArch, string>>> = {
	macos: {
		arm64: 'Document-Localizer-mac-arm64.dmg',
		x64: 'Document-Localizer-mac-x64.dmg',
	},
	windows: {
		x64: 'Document-Localizer-win-x64.exe',
	},
	linux: {
		x64: 'Document-Localizer-linux-x86_64.AppImage',
	},
}

export function downloadClick(
	platform: string,
	arch: string
): { name: 'Download click'; data: { platform: DownloadPlatform; arch: DownloadArch } } {
	const file = resolveDownload(platform, arch)
	return {
		name: 'Download click',
		data: { platform: file.platform, arch: file.arch },
	}
}

export function downloadHref(platform: string, arch: string): string {
	const file = resolveDownload(platform, arch)
	return `${RELEASE_DOWNLOAD_BASE}/${DOWNLOAD_FILES[file.platform][file.arch]}`
}

function resolveDownload(platform: string, arch: string): { platform: DownloadPlatform; arch: DownloadArch } {
	if (!(DOWNLOAD_PLATFORMS as readonly string[]).includes(platform)) {
		throw new Error(`Unsupported download platform: ${platform}`)
	}
	if (!(DOWNLOAD_ARCHS as readonly string[]).includes(arch)) {
		throw new Error(`Unsupported download arch: ${arch}`)
	}
	const downloadPlatform = platform as DownloadPlatform
	const downloadArch = arch as DownloadArch
	if (!DOWNLOAD_FILES[downloadPlatform][downloadArch]) {
		throw new Error(`Unsupported download arch: ${arch}`)
	}
	return { platform: downloadPlatform, arch: downloadArch }
}
