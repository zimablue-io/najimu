export const COMMERCIAL_GRACE_MS = 14 * 24 * 60 * 60 * 1000

export interface LicenseSnapshot {
	status: string
	benefitId: string
	expiresAt: string | null
}

export interface LicenseCache {
	benefitId: string
	expiresAt: string | null
	lastValidatedAt: string
}

export type LicenseReason = 'granted' | 'revoked' | 'expired' | 'wrong_benefit' | 'grace' | 'none'

export interface LicenseDecision {
	entitled: boolean
	reason: LicenseReason
}

function benefitMatches(benefitId: string, commercialBenefitId: string): boolean {
	return commercialBenefitId.length > 0 && benefitId === commercialBenefitId
}

function isExpired(expiresAt: string | null, now: Date): boolean {
	if (!expiresAt) return false
	const time = Date.parse(expiresAt)
	if (Number.isNaN(time)) return true
	return time <= now.getTime()
}

/**
 * Decides whether a Polar license key unlocks commercial features.
 * A revoked or disabled response wins over a cached grant.
 * A network failure can keep a recent unexpired grant for 14 days.
 */
export function decideLicense(input: {
	now: Date
	commercialBenefitId: string
	response: LicenseSnapshot | null
	networkError: boolean
	cache: LicenseCache | null
}): LicenseDecision {
	if (input.response && !input.networkError) {
		const status = input.response.status
		if (status === 'revoked' || status === 'disabled') {
			return { entitled: false, reason: 'revoked' }
		}
		if (status === 'granted') {
			if (!benefitMatches(input.response.benefitId, input.commercialBenefitId)) {
				return { entitled: false, reason: 'wrong_benefit' }
			}
			if (isExpired(input.response.expiresAt, input.now)) {
				return { entitled: false, reason: 'expired' }
			}
			return { entitled: true, reason: 'granted' }
		}
		return { entitled: false, reason: 'none' }
	}

	if (input.networkError && input.cache) {
		if (!benefitMatches(input.cache.benefitId, input.commercialBenefitId)) {
			return { entitled: false, reason: 'wrong_benefit' }
		}
		if (isExpired(input.cache.expiresAt, input.now)) {
			return { entitled: false, reason: 'expired' }
		}
		const last = Date.parse(input.cache.lastValidatedAt)
		if (!Number.isNaN(last) && input.now.getTime() - last < COMMERCIAL_GRACE_MS) {
			return { entitled: true, reason: 'grace' }
		}
	}

	return { entitled: false, reason: 'none' }
}

export function snapshotFromPolar(body: unknown): LicenseSnapshot | null {
	if (!body || typeof body !== 'object') return null
	const record = body as Record<string, unknown>
	const nested = record.license_key
	const license = nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : record
	if (typeof license.status !== 'string' || typeof license.benefit_id !== 'string') return null
	return {
		status: license.status,
		benefitId: license.benefit_id,
		expiresAt: typeof license.expires_at === 'string' ? license.expires_at : null,
	}
}

export function activationIdFromPolar(body: unknown): string | null {
	if (!body || typeof body !== 'object') return null
	const record = body as Record<string, unknown>
	if (record.license_key && typeof record.id === 'string') return record.id
	const activation = record.activation
	if (activation && typeof activation === 'object') {
		const id = (activation as Record<string, unknown>).id
		if (typeof id === 'string') return id
	}
	return null
}

export interface StoredLicense {
	key: string
	activationId: string | null
	benefitId: string | null
	expiresAt: string | null
	status: string | null
	lastValidatedAt: string | null
}

export interface LicenseProbe {
	key: string | null
	response: LicenseSnapshot | null
	networkError: boolean
	cache: LicenseCache | null
	error?: string
}

export function cacheFromStored(stored: StoredLicense | null): LicenseCache | null {
	if (!stored?.benefitId || !stored.lastValidatedAt) return null
	if (stored.status === 'revoked' || stored.status === 'disabled') return null
	return {
		benefitId: stored.benefitId,
		expiresAt: stored.expiresAt,
		lastValidatedAt: stored.lastValidatedAt,
	}
}
