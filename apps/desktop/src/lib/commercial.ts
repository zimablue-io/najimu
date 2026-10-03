/**
 * Public Polar endpoints. Organization ids, benefit ids, and checkout URLs
 * come from the gitignored catalog file produced by scripts/polar-catalog.js.
 * An access token never belongs in this file or in the desktop binary.
 */
export const POLAR_API_BASE = 'https://api.polar.sh/v1'

export const POLAR_PORTAL_URL = 'https://polar.sh/purchases'

export const COMMERCIAL_PRICE_USD = 240

export interface CommercialCatalog {
	organizationId: string
	commercialBenefitId: string
	checkoutCommercial: string
}

export function emptyCommercialCatalog(): CommercialCatalog {
	return {
		organizationId: '',
		commercialBenefitId: '',
		checkoutCommercial: '',
	}
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : ''
}

export function isPolarHttpsUrl(value: string): boolean {
	try {
		const url = new URL(value)
		if (url.protocol !== 'https:') return false
		return url.hostname === 'polar.sh' || url.hostname.endsWith('.polar.sh')
	} catch {
		return false
	}
}

function polarUrl(value: unknown): string {
	const url = text(value)
	return isPolarHttpsUrl(url) ? url : ''
}

export function parseCommercialCatalog(value: unknown): CommercialCatalog {
	const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
	return {
		organizationId: text(record.organizationId),
		commercialBenefitId: text(record.commercialBenefitId),
		checkoutCommercial: polarUrl(record.checkoutCommercial),
	}
}

export function commercialCatalogReady(catalog: CommercialCatalog): boolean {
	return (
		catalog.organizationId.length > 0 &&
		catalog.commercialBenefitId.length > 0 &&
		isPolarHttpsUrl(catalog.checkoutCommercial)
	)
}
