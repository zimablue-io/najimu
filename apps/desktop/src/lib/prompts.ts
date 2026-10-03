export const DEFAULT_LOCALIZATION_PROMPT = `You are a professional translator. Your task is to convert text from {sourceLocale} to {targetLocale}.

RULES:
1. Output language: {targetLocale} ONLY - never output {sourceLocale}
2. Convert words to match {targetLocale} spelling/grammar conventions
3. Keep sentence structure and punctuation identical
4. Do not add, remove, or change any words except for locale-specific conversions
5. Do not explain or comment on the translation

TEXT TO CONVERT:
{text}

OUTPUT:`

/**
 * Prompt for AI-based locale detection (source mismatch detection only).
 * Returns just the locale code (e.g., en-US, fr-FR, zh-CN).
 */
export const LOCALE_DETECTION_PROMPT = `Detect the locale of the following text. Reply with ONLY the locale code (e.g., en-US, fr-FR, zh-CN). If unsure, reply with "unknown".

---BEGIN TEXT---
{text}
---END TEXT---

Locale code:`

export function buildPrompt(
	template: string,
	params: { sourceLocale?: string; targetLocale?: string; text: string; termsBlock?: string }
): string {
	if (!params.sourceLocale || !params.targetLocale) {
		console.warn('buildPrompt called without locale values', {
			sourceLocale: params.sourceLocale,
			targetLocale: params.targetLocale,
			hasSourcePlaceholder: template.includes('{sourceLocale}'),
			hasTargetPlaceholder: template.includes('{targetLocale}'),
		})
	}
	const prompt = template
		.replace(/{sourceLocale}/g, params.sourceLocale || '')
		.replace(/{targetLocale}/g, params.targetLocale || '')
		.replace('{text}', params.text)
	const terms = params.termsBlock?.trim()
	if (!terms) return prompt
	return `TERMS:\n${terms}\n\n${prompt}`
}

const REQUIRED_PROMPT_VARS = ['{sourceLocale}', '{targetLocale}', '{text}'] as const

export function validatePromptTemplate(template: string): { valid: boolean; missingVars: string[] } {
	const missingVars = REQUIRED_PROMPT_VARS.filter((v) => !template.includes(v))
	return { valid: missingVars.length === 0, missingVars }
}
