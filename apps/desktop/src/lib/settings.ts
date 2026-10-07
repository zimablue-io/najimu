/**
 * Settings management - loading, saving, and defaults.
 */

import {
	DEFAULT_API_URL,
	DEFAULT_CHUNK_SIZE,
	DEFAULT_ENABLED_LOCALES,
	DEFAULT_MODEL,
	DEFAULT_OVERLAP_SIZE,
} from './config'
import type { ModelConfig, Settings } from './types'

/**
 * Loads settings from persistent storage.
 */
export async function loadSettings(): Promise<Settings> {
	try {
		const result = await window.electron.loadSettings()
		if (result && typeof result === 'object') {
			const r = result as Record<string, unknown>

			const existingModels = (r.models as ModelConfig[]) || []

			let activeModelId = (r.activeModelId as string) || ''

			if (existingModels.length > 0 && !activeModelId) {
				activeModelId = existingModels[0].id
			}

			return {
				apiUrl: (r.apiUrl as string) || DEFAULT_API_URL,
				models: existingModels,
				activeModelId,
				activePromptId: (r.activePromptId as string) || 'default.md',
				chunkSize: (r.chunkSize as string) || DEFAULT_CHUNK_SIZE,
				overlapSize: (r.overlapSize as string) || DEFAULT_OVERLAP_SIZE,
				sourceLocale: (r.sourceLocale as string) || '',
				targetLocale: (r.targetLocale as string) || '',
				enabledLocaleCodes: Array.isArray(r.enabledLocaleCodes)
					? (r.enabledLocaleCodes as string[])
					: typeof r.enabledLocaleCodes === 'string'
						? JSON.parse(r.enabledLocaleCodes as string)
						: DEFAULT_ENABLED_LOCALES,
			}
		}
	} catch (err) {
		console.error('Error loading settings:', err)
	}

	return createDefaultSettings()
}

/**
 * Saves settings to persistent storage.
 */
export async function saveSettings(settings: Settings): Promise<void> {
	await window.electron.saveSettings(settings)
}

/**
 * Creates default settings with one model.
 */
export function createDefaultSettings(): Settings {
	const defaultModel: ModelConfig = {
		id: crypto.randomUUID(),
		name: DEFAULT_MODEL,
	}
	return {
		apiUrl: DEFAULT_API_URL,
		models: [defaultModel],
		activeModelId: defaultModel.id,
		activePromptId: 'default.md',
		chunkSize: DEFAULT_CHUNK_SIZE,
		overlapSize: DEFAULT_OVERLAP_SIZE,
		sourceLocale: '',
		targetLocale: '',
		enabledLocaleCodes: DEFAULT_ENABLED_LOCALES,
	}
}
