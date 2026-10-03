import { describe, expect, it } from 'vitest'
import {
	COMMERCIAL_GRACE_MS,
	cacheFromStored,
	decideLicense,
	type LicenseCache,
	type LicenseSnapshot,
	type StoredLicense,
} from '../../src/lib/license'

const BENEFIT = 'benefit-commercial'
const now = new Date('2026-10-03T12:00:00.000Z')

function granted(overrides: Partial<LicenseSnapshot> = {}): LicenseSnapshot {
	return {
		status: 'granted',
		benefitId: BENEFIT,
		expiresAt: '2027-10-03T12:00:00.000Z',
		...overrides,
	}
}

function cache(overrides: Partial<LicenseCache> = {}): LicenseCache {
	return {
		benefitId: BENEFIT,
		expiresAt: '2027-10-03T12:00:00.000Z',
		lastValidatedAt: new Date(now.getTime() - 60_000).toISOString(),
		...overrides,
	}
}

describe('decideLicense', () => {
	it('entitles a granted key for the commercial benefit', () => {
		expect(
			decideLicense({
				now,
				commercialBenefitId: BENEFIT,
				response: granted(),
				networkError: false,
				cache: null,
			})
		).toEqual({ entitled: true, reason: 'granted' })
	})

	it('rejects a revoked key even when a cache exists', () => {
		expect(
			decideLicense({
				now,
				commercialBenefitId: BENEFIT,
				response: granted({ status: 'revoked' }),
				networkError: false,
				cache: cache(),
			})
		).toEqual({ entitled: false, reason: 'revoked' })
	})

	it('rejects a disabled key', () => {
		expect(
			decideLicense({
				now,
				commercialBenefitId: BENEFIT,
				response: granted({ status: 'disabled' }),
				networkError: false,
				cache: cache(),
			})
		).toEqual({ entitled: false, reason: 'revoked' })
	})

	it('rejects an expired grant', () => {
		expect(
			decideLicense({
				now,
				commercialBenefitId: BENEFIT,
				response: granted({ expiresAt: '2026-10-02T12:00:00.000Z' }),
				networkError: false,
				cache: null,
			})
		).toEqual({ entitled: false, reason: 'expired' })
	})

	it('rejects a key for a different benefit', () => {
		expect(
			decideLicense({
				now,
				commercialBenefitId: BENEFIT,
				response: granted({ benefitId: 'benefit-other' }),
				networkError: false,
				cache: null,
			})
		).toEqual({ entitled: false, reason: 'wrong_benefit' })
	})

	it('rejects a network error when nothing has been validated', () => {
		expect(
			decideLicense({
				now,
				commercialBenefitId: BENEFIT,
				response: null,
				networkError: true,
				cache: null,
			})
		).toEqual({ entitled: false, reason: 'none' })
	})

	it('keeps a grant during the offline grace period', () => {
		expect(
			decideLicense({
				now,
				commercialBenefitId: BENEFIT,
				response: null,
				networkError: true,
				cache: cache({ lastValidatedAt: new Date(now.getTime() - COMMERCIAL_GRACE_MS + 1000).toISOString() }),
			})
		).toEqual({ entitled: true, reason: 'grace' })
	})

	it('drops the grant when the grace period has elapsed', () => {
		expect(
			decideLicense({
				now,
				commercialBenefitId: BENEFIT,
				response: null,
				networkError: true,
				cache: cache({ lastValidatedAt: new Date(now.getTime() - COMMERCIAL_GRACE_MS - 1000).toISOString() }),
			})
		).toEqual({ entitled: false, reason: 'none' })
	})
})

function stored(overrides: Partial<StoredLicense> = {}): StoredLicense {
	return {
		key: 'DOCLZ_00000000-0000-0000-0000-000000000001',
		activationId: 'activation-1',
		benefitId: BENEFIT,
		expiresAt: '2027-10-03T12:00:00.000Z',
		status: 'granted',
		lastValidatedAt: new Date(now.getTime() - 60_000).toISOString(),
		...overrides,
	}
}

describe('cacheFromStored', () => {
	it('does not grant offline grace from a stored revoked key', () => {
		expect(
			decideLicense({
				now,
				commercialBenefitId: BENEFIT,
				response: null,
				networkError: true,
				cache: cacheFromStored(stored({ status: 'revoked' })),
			})
		).toEqual({ entitled: false, reason: 'none' })
	})

	it('does not grant offline grace from a stored disabled key', () => {
		expect(
			decideLicense({
				now,
				commercialBenefitId: BENEFIT,
				response: null,
				networkError: true,
				cache: cacheFromStored(stored({ status: 'disabled' })),
			})
		).toEqual({ entitled: false, reason: 'none' })
	})

	it('keeps offline grace for a stored granted key', () => {
		expect(
			decideLicense({
				now,
				commercialBenefitId: BENEFIT,
				response: null,
				networkError: true,
				cache: cacheFromStored(stored({ status: 'granted' })),
			})
		).toEqual({ entitled: true, reason: 'grace' })
	})

	it('keeps offline grace when an older file has no status', () => {
		expect(
			decideLicense({
				now,
				commercialBenefitId: BENEFIT,
				response: null,
				networkError: true,
				cache: cacheFromStored(stored({ status: null })),
			})
		).toEqual({ entitled: true, reason: 'grace' })
	})
})
