import { useEffect, useState } from 'react'
import { DetectedMachine, detectMachine, MachineSignals, Platform } from '../lib/machine'

export type { Platform }

type UserAgentData = {
	getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }>
}

function readGpuRenderer(): string | null {
	if (typeof document === 'undefined') return null
	try {
		const canvas = document.createElement('canvas')
		const gl = canvas.getContext('webgl')
		if (!gl) return null
		const ext = gl.getExtension('WEBGL_debug_renderer_info')
		if (!ext) return null
		const value = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
		return typeof value === 'string' ? value : null
	} catch {
		return null
	}
}

function readSignals(architecture?: string | null): MachineSignals {
	if (typeof navigator === 'undefined') {
		return { userAgent: '', platform: '', architecture, gpuRenderer: null }
	}
	return {
		userAgent: navigator.userAgent,
		platform: navigator.platform,
		architecture,
		gpuRenderer: readGpuRenderer(),
	}
}

export function useMachine(): DetectedMachine {
	const [machine, setMachine] = useState<DetectedMachine>(() => detectMachine(readSignals()))

	useEffect(() => {
		let cancelled = false
		setMachine(detectMachine(readSignals()))
		const uaData = (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData
		if (!uaData?.getHighEntropyValues) return
		uaData.getHighEntropyValues(['architecture']).then((hints) => {
			if (cancelled) return
			setMachine(detectMachine(readSignals(hints.architecture)))
		})
		return () => {
			cancelled = true
		}
	}, [])

	return machine
}

export function usePlatform(): Platform {
	return useMachine().platform
}
