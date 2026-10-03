import { describe, expect, it } from 'vitest'
import { commercialCatalogReady, parseCommercialCatalog } from '../../src/lib/commercial'

const ready = {
	organizationId: 'org-1',
	commercialBenefitId: 'benefit-1',
	checkoutCommercial: 'https://buy.polar.sh/commercial',
	checkoutGlossary: 'https://buy.polar.sh/glossary',
	client_secret: 'polar_cl_secret',
	accessToken: 'polar_oat_secret',
}

describe('parseCommercialCatalog', () => {
	it('stays closed when the catalog file is missing', () => {
		const catalog = parseCommercialCatalog(null)
		expect(catalog.organizationId).toBe('')
		expect(catalog.checkoutCommercial).toBe('')
		expect(commercialCatalogReady(catalog)).toBe(false)
	})

	it('keeps public Polar ids and drops secrets', () => {
		const catalog = parseCommercialCatalog(ready)
		expect(commercialCatalogReady(catalog)).toBe(true)
		expect(catalog.checkoutCommercial).toBe('https://buy.polar.sh/commercial')
		expect(Object.keys(catalog)).toEqual(['organizationId', 'commercialBenefitId', 'checkoutCommercial'])
		expect(JSON.stringify(catalog)).not.toContain('glossary')
		expect(JSON.stringify(catalog)).not.toContain('polar_oat_')
		expect(JSON.stringify(catalog)).not.toContain('polar_cl_')
	})

	it('blanks checkout URLs that are not Polar https links', () => {
		const catalog = parseCommercialCatalog({
			...ready,
			checkoutCommercial: 'https://polar.sh.evil.com/checkout',
		})
		expect(catalog.checkoutCommercial).toBe('')
		expect(commercialCatalogReady(catalog)).toBe(false)
	})
})
