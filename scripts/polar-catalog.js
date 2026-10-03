import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const defaultCatalogPath = path.join(repoRoot, 'apps/desktop/commercial.public.json')
const packedCatalogPath = path.join(repoRoot, 'apps/desktop/dist-electron/commercial.public.json')
const successUrl = 'https://document-localizer.vercel.app'

export const POLAR_CLI_VERSION = '2.0.2'

export const POLAR_CLI_ARCHIVES = {
	'darwin-arm64': {
		name: 'polar-darwin-arm64.zip',
		sha256: 'f0ee8b657b8139b7eb1b8bdbeb9cf9132ac5cbfe00a642e77aee33eee6aa3154',
	},
	'darwin-x64': {
		name: 'polar-darwin-x64.zip',
		sha256: '54b52834719d5aff1aa4c96440048f4c1985337537097b6e15b30eb4028fbfb6',
	},
	'linux-arm64': {
		name: 'polar-linux-arm64.tar.gz',
		sha256: 'cd85d56a930249611413f88ee1b3beaf6e0d82e82acb509e62fa27d8a4590557',
	},
	'linux-x64': {
		name: 'polar-linux-x64.tar.gz',
		sha256: '34ce280180779cc9e69504a566e474cecb71f20d7367be2beabc93112ba39b9a',
	},
	'windows-x64': {
		name: 'polar-windows-x64.zip',
		sha256: '1a28c0d5c148d20b962169d0b3be3eb86c90b6a69272df67d296d70b53ed86c2',
	},
}

export const OFFERS = [
	{
		slug: 'commercial',
		name: 'Document Localizer Commercial',
		description: 'Annual commercial seat for two devices.',
		priceCents: 24000,
		recurring: true,
	},
]

export function polarPlatform(osPlatform, arch) {
	const osName =
		osPlatform === 'darwin' ? 'darwin' : osPlatform === 'linux' ? 'linux' : osPlatform === 'win32' ? 'windows' : ''
	const cpu = arch === 'arm64' || arch === 'x64' ? arch : ''
	const key = `${osName}-${cpu}`
	if (!POLAR_CLI_ARCHIVES[key]) throw new Error(`No Polar CLI build for ${osPlatform} ${arch}`)
	return key
}

export function findBySlug(items, slug) {
	if (!Array.isArray(items)) return null
	return (
		items.find(
			(item) => item?.metadata?.doclocalizer === slug && item.is_archived !== true && item.is_deleted !== true
		) ?? null
	)
}

export function licenseBenefitArgs() {
	return [
		'benefits',
		'create',
		'--type',
		'license_keys',
		'--description',
		'Commercial license',
		'--visibility',
		'public',
		'--metadata',
		JSON.stringify({ doclocalizer: 'commercial' }),
		'--properties',
		JSON.stringify({
			prefix: 'DOCLZ_',
			expires: { ttl: 1, timeframe: 'year' },
			activations: { limit: 2, enable_customer_admin: true },
		}),
	]
}

export function productCreateArgs(offer) {
	const args = [
		'products',
		'create',
		'--name',
		offer.name,
		'--description',
		offer.description,
		'--visibility',
		'public',
		'--metadata',
		JSON.stringify({ doclocalizer: offer.slug }),
		'--prices',
		JSON.stringify([{ amount_type: 'fixed', price_amount: offer.priceCents, price_currency: 'usd' }]),
	]
	if (offer.recurring) args.push('--recurring-interval', 'year', '--recurring-interval-count', '1')
	return args
}

export function checkoutCreateArgs(slug, productId) {
	return [
		'checkout_links',
		'create',
		'--payment-processor',
		'stripe',
		'--label',
		`doclocalizer-${slug}`,
		'--products',
		JSON.stringify([productId]),
		'--success-url',
		successUrl,
		'--metadata',
		JSON.stringify({ doclocalizer: slug }),
	]
}

function linkUrl(value) {
	if (typeof value === 'string') return value
	if (value && typeof value === 'object' && typeof value.url === 'string') return value.url
	return ''
}

export function catalogFromPolar({ organizationId, benefitId, linksBySlug }) {
	const links = linksBySlug ?? {}
	return {
		organizationId: typeof organizationId === 'string' ? organizationId : '',
		commercialBenefitId: typeof benefitId === 'string' ? benefitId : '',
		checkoutCommercial: linkUrl(links.commercial),
	}
}

export function parseCliJson(stdout) {
	const text = String(stdout)
	const start = text.search(/[{[]/)
	if (start < 0) throw new Error('Polar CLI did not return JSON')
	return JSON.parse(text.slice(start))
}

export function itemsOf(payload) {
	if (Array.isArray(payload)) return payload
	if (payload && Array.isArray(payload.items)) return payload.items
	return []
}

function cliBinaryName(platformKey) {
	return platformKey.startsWith('windows') ? 'polar.exe' : 'polar'
}

function extractArchive(platformKey, archivePath, dest) {
	let result
	if (platformKey.startsWith('darwin')) {
		result = spawnSync('ditto', ['-x', '-k', archivePath, dest], { encoding: 'utf8' })
	} else if (platformKey.startsWith('linux')) {
		result = spawnSync('tar', ['-xzf', archivePath, '-C', dest], { encoding: 'utf8' })
	} else {
		result = spawnSync(
			'powershell',
			[
				'-NoProfile',
				'-Command',
				'Expand-Archive -LiteralPath $env:POLAR_ARCHIVE -DestinationPath $env:POLAR_EXTRACT -Force',
			],
			{ encoding: 'utf8', env: { ...process.env, POLAR_ARCHIVE: archivePath, POLAR_EXTRACT: dest } }
		)
	}
	if (result.status !== 0) throw new Error(result.stderr || 'Failed to extract Polar CLI')
}

async function ensureCli() {
	const platformKey = polarPlatform(process.platform, process.arch)
	const archive = POLAR_CLI_ARCHIVES[platformKey]
	const binDir = path.join(repoRoot, '.polar-cli')
	const binPath = path.join(binDir, cliBinaryName(platformKey))
	if (existsSync(binPath)) {
		const version = spawnSync(binPath, ['--version'], { encoding: 'utf8' })
		const output = `${version.stdout || ''}${version.stderr || ''}`
		if (output.includes(POLAR_CLI_VERSION)) return binPath
	}
	mkdirSync(binDir, { recursive: true })
	const response = await fetch(
		`https://github.com/polarsource/polar/releases/download/@polar-sh/cli@${POLAR_CLI_VERSION}/${archive.name}`
	)
	if (!response.ok) throw new Error(`Polar CLI download failed (${response.status})`)
	const bytes = Buffer.from(await response.arrayBuffer())
	const digest = createHash('sha256').update(bytes).digest('hex')
	if (digest !== archive.sha256) throw new Error('Polar CLI checksum mismatch')
	const archivePath = path.join(binDir, archive.name)
	const extractDir = path.join(binDir, 'extract')
	writeFileSync(archivePath, bytes)
	rmSync(extractDir, { recursive: true, force: true })
	mkdirSync(extractDir, { recursive: true })
	extractArchive(platformKey, archivePath, extractDir)
	const extracted = path.join(extractDir, cliBinaryName(platformKey))
	if (!existsSync(extracted)) throw new Error('Polar CLI archive did not contain the binary')
	copyFileSync(extracted, binPath)
	chmodSync(binPath, 0o755)
	rmSync(extractDir, { recursive: true, force: true })
	rmSync(archivePath, { force: true })
	return binPath
}

function runPolar(bin, args) {
	const result = spawnSync(bin, args, { encoding: 'utf8', env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
	if (result.error) throw result.error
	if (result.status !== 0) {
		const detail = `${result.stderr || ''}${result.stdout || ''}`.trim()
		throw new Error(detail || `polar exited ${result.status}`)
	}
	return parseCliJson(result.stdout || '')
}

function ensureListed(bin, kind, slug, createArgs) {
	const listArgs =
		kind === 'benefits'
			? ['benefits', 'list', '--metadata', JSON.stringify({ doclocalizer: slug }), '--limit', '20']
			: ['products', 'list', '--metadata', JSON.stringify({ doclocalizer: slug }), '--limit', '20']
	const existing = findBySlug(itemsOf(runPolar(bin, listArgs)), slug)
	if (existing) return existing
	return runPolar(bin, createArgs)
}

function benefitIds(product) {
	if (!Array.isArray(product?.benefits)) return []
	return product.benefits.map((benefit) => benefit?.id).filter((id) => typeof id === 'string')
}

function ensureBenefitAttached(bin, product, benefitId) {
	const ids = benefitIds(product)
	if (ids.includes(benefitId)) return
	runPolar(bin, ['products', 'update_benefits', product.id, '--benefits', JSON.stringify([...ids, benefitId])])
}

function ensureCheckout(bin, slug, productId) {
	for (let page = 1; page <= 10; page++) {
		const payload = runPolar(bin, ['checkout_links', 'list', '--page', String(page), '--limit', '100'])
		const items = itemsOf(payload)
		const existing = findBySlug(items, slug)
		if (existing) return existing
		const maxPage = payload?.pagination?.max_page
		if (items.length === 0 || (typeof maxPage === 'number' && page >= maxPage)) break
	}
	return runPolar(bin, checkoutCreateArgs(slug, productId))
}

function syncCatalog(bin) {
	const benefit = ensureListed(bin, 'benefits', 'commercial', licenseBenefitArgs())
	const links = {}
	let organizationId = ''
	for (const offer of OFFERS) {
		const product = ensureListed(bin, 'products', offer.slug, productCreateArgs(offer))
		if (!organizationId && typeof product.organization_id === 'string') organizationId = product.organization_id
		ensureBenefitAttached(bin, product, benefit.id)
		links[offer.slug] = ensureCheckout(bin, offer.slug, product.id).url
	}
	if (!organizationId) throw new Error('Polar did not return an organization id')
	if (typeof benefit.id !== 'string' || benefit.id.length === 0) throw new Error('Polar did not return a benefit id')
	return catalogFromPolar({ organizationId, benefitId: benefit.id, linksBySlug: links })
}

function catalogOutputPath() {
	const index = process.argv.indexOf('--out')
	if (index !== -1 && process.argv[index + 1]) return path.resolve(process.argv[index + 1])
	return defaultCatalogPath
}

function copyCatalogIntoBuild() {
	if (!existsSync(defaultCatalogPath)) return
	mkdirSync(path.dirname(packedCatalogPath), { recursive: true })
	copyFileSync(defaultCatalogPath, packedCatalogPath)
}

function printUsage() {
	console.log(`Usage:
  pnpm polar:catalog auth [--sandbox|--production]
  pnpm polar:catalog
  pnpm polar:catalog -- --dry-run
  pnpm polar:catalog -- --copy-if-present

Signs in with Polar CLI ${POLAR_CLI_VERSION}, stored in .polar-cli/ and the OS keychain.
The access token is not written. The Commercial checkout URL goes to
apps/desktop/commercial.public.json, which is gitignored.
Stripe must already be connected on the Polar organization.`)
}

function printDryRun() {
	const lines = [licenseBenefitArgs(), ...OFFERS.map((offer) => productCreateArgs(offer))]
	for (const offer of OFFERS) lines.push(checkoutCreateArgs(offer.slug, '<product-id>'))
	for (const line of lines) console.log(`polar ${line.join(' ')}`)
}

async function main() {
	const args = process.argv.slice(2)
	if (args.includes('--help') || args.includes('-h')) {
		printUsage()
		return
	}
	if (args.includes('--copy-if-present')) {
		copyCatalogIntoBuild()
		return
	}
	if (args[0] === 'auth') {
		const bin = await ensureCli()
		const result = spawnSync(bin, ['auth', ...args.slice(1)], { stdio: 'inherit' })
		process.exit(result.status ?? 1)
	}
	if (args.includes('--dry-run')) {
		printDryRun()
		return
	}
	const bin = await ensureCli()
	const catalog = syncCatalog(bin)
	const output = catalogOutputPath()
	mkdirSync(path.dirname(output), { recursive: true })
	writeFileSync(output, `${JSON.stringify(catalog, null, '\t')}\n`)
	console.log(`Wrote ${path.relative(repoRoot, output)}`)
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invoked === fileURLToPath(import.meta.url)) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error))
		process.exit(1)
	})
}
