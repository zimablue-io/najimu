import type { DownloadArch } from './downloads'

export type Platform = 'macos' | 'windows' | 'linux' | 'unsupported'

export interface MachineSignals {
	userAgent: string
	platform: string
	architecture?: string | null
	gpuRenderer?: string | null
}

export interface DetectedMachine {
	platform: Platform
	arch: DownloadArch | null
}

const WINDOWS = /windows|win32|win64/i
const LINUX = /linux|x11/i
const ANDROID = /android/i
const IOS = /iphone|ipad|ipod/i
const MAC = /mac/i
const CROS = /cros/i

export function detectMachine(signals: MachineSignals): DetectedMachine {
	const userAgent = signals.userAgent ?? ''
	const platform = signals.platform ?? ''
	const blob = `${userAgent} ${platform}`

	if (ANDROID.test(blob) || IOS.test(blob) || CROS.test(blob)) {
		return { platform: 'unsupported', arch: null }
	}
	if (WINDOWS.test(blob)) {
		return { platform: 'windows', arch: 'x64' }
	}
	if (LINUX.test(blob)) {
		return { platform: 'linux', arch: 'x64' }
	}
	if (MAC.test(blob)) {
		return { platform: 'macos', arch: macArch(signals) }
	}
	return { platform: 'unsupported', arch: null }
}

export function resolveDownloadChoice(
	detected: DetectedMachine,
	selectedPlatform: Platform | null,
	macArchOverride: DownloadArch | null
): { platform: Platform; arch: DownloadArch | null } {
	const platform = selectedPlatform ?? detected.platform
	if (platform === 'windows' || platform === 'linux') {
		return { platform, arch: 'x64' }
	}
	if (platform === 'macos') {
		const detectedMacArch = detected.platform === 'macos' ? detected.arch : null
		return { platform, arch: macArchOverride ?? detectedMacArch ?? 'arm64' }
	}
	return { platform: 'unsupported', arch: null }
}

function macArch(signals: MachineSignals): DownloadArch {
	const architecture = (signals.architecture ?? '').toLowerCase()
	if (architecture === 'arm' || architecture === 'arm64' || architecture === 'aarch64') return 'arm64'
	if (architecture === 'x86' || architecture === 'x86_64' || architecture === 'ia32') return 'x64'

	if (/arm|aarch64/i.test(signals.platform ?? '')) return 'arm64'

	const gpu = signals.gpuRenderer ?? ''
	if (/apple m\d|apple gpu/i.test(gpu)) return 'arm64'
	if (/intel|amd|radeon/i.test(gpu)) return 'x64'

	if (/aarch64|arm64/i.test(signals.userAgent)) return 'arm64'
	return 'arm64'
}
