import { describe, expect, it } from 'vitest'
import {
	catalogFromPolar,
	checkoutCreateArgs,
	findBySlug,
	licenseBenefitArgs,
	OFFERS,
	POLAR_CLI_ARCHIVES,
	POLAR_CLI_VERSION,
	parseCliJson,
	polarPlatform,
	productCreateArgs,
} from '../../../../scripts/polar-catalog.js'

describe('polar catalog script', () => {
	it('pins Polar CLI 2 checksums for every shipped archive', () => {
		expect(POLAR_CLI_VERSION.startsWith('2.')).toBe(true)
		expect(polarPlatform('darwin', 'arm64')).toBe('darwin-arm64')
		for (const archive of Object.values(POLAR_CLI_ARCHIVES)) {
			expect(archive.sha256).toMatch(/^[0-9a-f]{64}$/)
		}
	})

	it('reuses an existing catalog row with the same slug', () => {
		const existing = findBySlug(
			[
				{ id: 'old', metadata: { doclocalizer: 'commercial' }, is_archived: true },
				{ id: 'keep', metadata: { doclocalizer: 'commercial' } },
				{ id: 'other', metadata: { doclocalizer: 'glossary' } },
			],
			'commercial'
		)
		expect(existing?.id).toBe('keep')
	})

	it('creates the commercial license benefit and yearly price without a token', () => {
		const benefit = licenseBenefitArgs().join(' ')
		const product = productCreateArgs({
			slug: 'commercial',
			name: 'Document Localizer Commercial',
			description: 'Annual commercial seat for two devices.',
			priceCents: 24000,
			recurring: true,
		}).join(' ')
		expect(benefit).toContain('license_keys')
		expect(benefit).toContain('DOCLZ_')
		expect(benefit).toContain('"timeframe":"year"')
		expect(benefit).toContain('"limit":2')
		expect(product).toContain('24000')
		expect(product).toContain('--recurring-interval')
		expect(product).toContain('year')
		expect(`${benefit} ${product}`).not.toContain('polar_oat_')
	})

	it('sells only the Commercial subscription', () => {
		expect(OFFERS.map((offer) => offer.slug)).toEqual(['commercial'])
		const rendered = OFFERS.map((offer) => productCreateArgs(offer).join(' ')).join('\n')
		expect(rendered).not.toMatch(/Glossary build|Prompt pack|Setup session/)
	})

	it('opens a Polar checkout link and stores only the public URL', () => {
		const args = checkoutCreateArgs('commercial', 'prod-1')
		expect(args).toContain('stripe')
		expect(args).toContain('["prod-1"]')
		const catalog = catalogFromPolar({
			organizationId: 'org-1',
			benefitId: 'benefit-1',
			linksBySlug: {
				commercial: { url: 'https://buy.polar.sh/commercial', client_secret: 'polar_cl_secret' },
			},
		})
		expect(catalog).toEqual({
			organizationId: 'org-1',
			commercialBenefitId: 'benefit-1',
			checkoutCommercial: 'https://buy.polar.sh/commercial',
		})
		expect(JSON.stringify(catalog)).not.toContain('client_secret')
		expect(JSON.stringify(catalog)).not.toContain('polar_cl_')
	})

	it('reads JSON that follows CLI log lines', () => {
		expect(parseCliJson('notice\n{"items":[{"id":"1"}]}\n')).toEqual({ items: [{ id: '1' }] })
	})
})
