import { Button, Input, Label } from '@doclocalizer/ui'
import { useCallback, useEffect, useState } from 'react'
import {
	type CommercialCatalog,
	commercialCatalogReady,
	emptyCommercialCatalog,
	isPolarHttpsUrl,
	POLAR_PORTAL_URL,
	parseCommercialCatalog,
} from '../lib/commercial'
import type { GlossaryEntry } from '../lib/glossary'
import { parseGlossary } from '../lib/glossary'
import { decideLicense, type LicenseProbe } from '../lib/license'
import { ALL_LOCALES } from '../lib/locales'
import { parseMemory } from '../lib/memory'

interface CommercialPanelProps {
	onChanged: () => void
}

async function openPolar(url: string): Promise<void> {
	if (!isPolarHttpsUrl(url)) return
	await window.electron.openExternal(url)
}

export function CommercialPanel({ onChanged }: CommercialPanelProps) {
	const [probe, setProbe] = useState<LicenseProbe | null>(null)
	const [keyDraft, setKeyDraft] = useState('')
	const [glossary, setGlossary] = useState<GlossaryEntry[]>([])
	const [memoryCount, setMemoryCount] = useState(0)
	const [sourceTerm, setSourceTerm] = useState('')
	const [targetTerm, setTargetTerm] = useState('')
	const [sourceLocale, setSourceLocale] = useState('en-US')
	const [targetLocale, setTargetLocale] = useState('fr-FR')
	const [busy, setBusy] = useState(false)
	const [catalog, setCatalog] = useState<CommercialCatalog>(emptyCommercialCatalog())

	const load = useCallback(async () => {
		const [nextProbe, nextGlossary, nextMemory, nextCatalog] = await Promise.all([
			window.electron.licenseStatus(),
			window.electron.loadGlossary(),
			window.electron.loadMemory(),
			window.electron.commercialCatalog(),
		])
		setProbe(nextProbe)
		setKeyDraft(nextProbe.key ?? '')
		setGlossary(parseGlossary(nextGlossary))
		setMemoryCount(parseMemory(nextMemory).length)
		setCatalog(parseCommercialCatalog(nextCatalog))
	}, [])

	useEffect(() => {
		void load()
	}, [load])

	const decision = decideLicense({
		now: new Date(),
		commercialBenefitId: catalog.commercialBenefitId,
		response: probe?.response ?? null,
		networkError: probe?.networkError ?? false,
		cache: probe?.cache ?? null,
	})

	const saveGlossary = async (entries: GlossaryEntry[]) => {
		setGlossary(entries)
		await window.electron.saveGlossary(entries)
	}

	const activate = async () => {
		setBusy(true)
		try {
			const next = await window.electron.activateLicense(keyDraft)
			setProbe(next)
			onChanged()
		} finally {
			setBusy(false)
		}
	}

	const clear = async () => {
		await window.electron.clearLicense()
		setKeyDraft('')
		setProbe({ key: null, response: null, networkError: false, cache: null })
		onChanged()
	}

	const exportGlossary = async () => {
		const savePath = await window.electron.saveFile({
			defaultPath: 'glossary.json',
			filters: [{ name: 'JSON', extensions: ['json'] }],
		})
		if (!savePath) return
		await window.electron.writeTextFile(savePath, JSON.stringify(glossary, null, 2))
	}

	const importGlossary = async () => {
		const files = await window.electron.openFile({ multiple: false })
		const filePath = files?.[0]
		if (!filePath) return
		const text = await window.electron.readTextFile(filePath)
		const imported = parseGlossary(JSON.parse(text))
		await saveGlossary(imported)
	}

	const exportMemory = async () => {
		const savePath = await window.electron.saveFile({
			defaultPath: 'memory.json',
			filters: [{ name: 'JSON', extensions: ['json'] }],
		})
		if (!savePath) return
		const memory = await window.electron.loadMemory()
		await window.electron.writeTextFile(savePath, JSON.stringify(memory, null, 2))
	}

	const importMemory = async () => {
		const files = await window.electron.openFile({ multiple: false })
		const filePath = files?.[0]
		if (!filePath) return
		const text = await window.electron.readTextFile(filePath)
		const imported = parseMemory(JSON.parse(text))
		await window.electron.saveMemory(imported)
		setMemoryCount(imported.length)
	}

	const exportAudit = async () => {
		const savePath = await window.electron.exportAudit()
		if (savePath) onChanged()
	}

	return (
		<div className="space-y-8 pr-4">
			<section className="space-y-3">
				<h3 className="font-medium">Commercial license</h3>
				<p className="text-sm text-muted-foreground">
					Personal use stays free. A Commercial subscription unlocks the glossary, translation memory, batch
					runs, and the review record. Status: {decision.entitled ? 'Commercial' : 'Free'} ({decision.reason}
					).
				</p>
				{!commercialCatalogReady(catalog) && (
					<p className="text-sm text-muted-foreground">
						Checkout is not configured on this build. Run pnpm polar:catalog before packaging.
					</p>
				)}
				{probe?.error && <p className="text-sm text-red-500">{probe.error}</p>}
				<div className="space-y-2">
					<Label htmlFor="license-key">License key</Label>
					<Input
						id="license-key"
						value={keyDraft}
						onChange={(event) => setKeyDraft(event.target.value)}
						placeholder="DOCLZ_…"
						autoComplete="off"
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button onClick={() => void activate()} disabled={busy || keyDraft.trim().length === 0}>
						Activate
					</Button>
					<Button variant="outline" onClick={() => void clear()}>
						Remove key
					</Button>
					<Button
						variant="outline"
						onClick={() => void openPolar(catalog.checkoutCommercial)}
						disabled={!isPolarHttpsUrl(catalog.checkoutCommercial)}
					>
						Buy
					</Button>
					<Button variant="outline" onClick={() => void openPolar(POLAR_PORTAL_URL)}>
						Open portal
					</Button>
				</div>
			</section>

			<section className={`space-y-3 ${decision.entitled ? '' : 'opacity-70'}`}>
				<h3 className="font-medium">Glossary</h3>
				<p className="text-sm text-muted-foreground">
					Terms for a locale pair are inserted into the prompt. Export the file to hand it to someone else.
				</p>
				<div className="grid grid-cols-2 gap-2">
					<select
						className="bg-background border border-border rounded-md px-2 py-1 text-sm"
						value={sourceLocale}
						disabled={!decision.entitled}
						onChange={(event) => setSourceLocale(event.target.value)}
					>
						{ALL_LOCALES.map((locale) => (
							<option key={locale.code} value={locale.code}>
								{locale.name}
							</option>
						))}
					</select>
					<select
						className="bg-background border border-border rounded-md px-2 py-1 text-sm"
						value={targetLocale}
						disabled={!decision.entitled}
						onChange={(event) => setTargetLocale(event.target.value)}
					>
						{ALL_LOCALES.map((locale) => (
							<option key={locale.code} value={locale.code}>
								{locale.name}
							</option>
						))}
					</select>
					<Input
						value={sourceTerm}
						disabled={!decision.entitled}
						placeholder="Source term"
						onChange={(event) => setSourceTerm(event.target.value)}
					/>
					<Input
						value={targetTerm}
						disabled={!decision.entitled}
						placeholder="Target term"
						onChange={(event) => setTargetTerm(event.target.value)}
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						disabled={!decision.entitled || !sourceTerm.trim() || !targetTerm.trim()}
						onClick={() => {
							const entry: GlossaryEntry = {
								id: crypto.randomUUID(),
								sourceLocale,
								targetLocale,
								source: sourceTerm.trim(),
								target: targetTerm.trim(),
							}
							setSourceTerm('')
							setTargetTerm('')
							void saveGlossary([...glossary, entry])
						}}
					>
						Add term
					</Button>
					<Button variant="outline" disabled={!decision.entitled} onClick={() => void exportGlossary()}>
						Export
					</Button>
					<Button variant="outline" disabled={!decision.entitled} onClick={() => void importGlossary()}>
						Import
					</Button>
					{!decision.entitled && (
						<Button
							variant="outline"
							onClick={() => void openPolar(catalog.checkoutCommercial)}
							disabled={!isPolarHttpsUrl(catalog.checkoutCommercial)}
						>
							Buy Commercial
						</Button>
					)}
				</div>
				<ul className="space-y-1 text-sm">
					{glossary.map((entry) => (
						<li key={entry.id} className="flex items-center justify-between gap-2">
							<span>
								{entry.sourceLocale} → {entry.targetLocale}: {entry.source} → {entry.target}
							</span>
							<Button
								variant="ghost"
								size="sm"
								disabled={!decision.entitled}
								onClick={() => void saveGlossary(glossary.filter((item) => item.id !== entry.id))}
							>
								Remove
							</Button>
						</li>
					))}
				</ul>
			</section>

			<section className={`space-y-3 ${decision.entitled ? '' : 'opacity-70'}`}>
				<h3 className="font-medium">Translation memory</h3>
				<p className="text-sm text-muted-foreground">
					{memoryCount} approved paragraph{memoryCount === 1 ? '' : 's'} stored. An exact match is reused and
					the model is not called.
				</p>
				<div className="flex flex-wrap gap-2">
					<Button variant="outline" disabled={!decision.entitled} onClick={() => void exportMemory()}>
						Export
					</Button>
					<Button variant="outline" disabled={!decision.entitled} onClick={() => void importMemory()}>
						Import
					</Button>
				</div>
			</section>

			<section className={`space-y-3 ${decision.entitled ? '' : 'opacity-70'}`}>
				<h3 className="font-medium">Review record</h3>
				<p className="text-sm text-muted-foreground">
					Export the local record of processing, approvals, and second sign-off.
				</p>
				<Button variant="outline" disabled={!decision.entitled} onClick={() => void exportAudit()}>
					Export CSV
				</Button>
			</section>
		</div>
	)
}
