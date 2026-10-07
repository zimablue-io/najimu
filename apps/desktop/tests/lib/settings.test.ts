import { describe, expect, it } from 'vitest'
import { createDefaultSettings } from '../../src/lib/settings'

describe('createDefaultSettings', () => {
	it('should register the default translation model', () => {
		const settings = createDefaultSettings()
		expect(settings.models).toHaveLength(1)
		expect(settings.activeModelId).toBe(settings.models[0].id)
	})

	it('should default the API URL to the local server', () => {
		expect(createDefaultSettings().apiUrl).toBe('http://localhost:8080/v1')
	})

	it('should not expose an embedding model setting because embeddings run in-process', () => {
		expect('embeddingModel' in createDefaultSettings()).toBe(false)
	})

	it('should not expose an embedding URL setting because embeddings run in-process', () => {
		expect('embeddingUrl' in createDefaultSettings()).toBe(false)
	})

	it('should not expose a similarity threshold setting because it is built in', () => {
		expect('memorySimilarityThreshold' in createDefaultSettings()).toBe(false)
	})
})
