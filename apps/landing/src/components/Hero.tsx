import { track } from '@vercel/analytics'
import { ChevronDown, Download, FileText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Platform, useMachine } from '../hooks/usePlatform'
import { DownloadArch, downloadButtonLabel, downloadClick, downloadHref, otherDownloadChoices } from '../lib/downloads'
import { resolveDownloadChoice } from '../lib/machine'
import { GitHubIcon } from './Icons'

interface HeroProps {
	selectedPlatform: Platform | null
	onPlatformChange: (platform: Platform | null) => void
}

const originalText = 'Mom parked the car. Her favorite color is on the soccer jersey.'
const localizedText = 'Mum parked the car. Her favourite colour is on the football jersey.'

const changedOriginal = ['color', 'Mom', 'favorite', 'soccer']
const changedLocalized = ['colour', 'Mum', 'favourite', 'football']

function OriginalText() {
	return (
		<div className="font-mono text-sm leading-relaxed">
			{originalText.split(' ').map((word, i) => (
				<span
					key={i}
					className={`${changedOriginal.includes(word) ? 'bg-red-900/50 text-red-300 px-0.5 rounded mx-[-1px]' : ''}`}
				>
					{word}{' '}
				</span>
			))}
		</div>
	)
}

function LocalizedText() {
	return (
		<div className="font-mono text-sm leading-relaxed">
			{localizedText.split(' ').map((word, i) => {
				const isChanged = changedLocalized.includes(word)
				return (
					<span
						key={i}
						className={`${isChanged ? 'bg-green-900/50 text-green-300 px-0.5 rounded mx-[-1px]' : ''}`}
					>
						{word}{' '}
					</span>
				)
			})}
		</div>
	)
}

export default function Hero({ selectedPlatform, onPlatformChange }: HeroProps) {
	const detected = useMachine()
	const [macArchOverride, setMacArchOverride] = useState<DownloadArch | null>(null)
	const [menuOpen, setMenuOpen] = useState(false)
	const menuRef = useRef<HTMLDivElement>(null)
	const choice = resolveDownloadChoice(detected, selectedPlatform, macArchOverride)
	const platform = choice.platform
	const isSupported = platform === 'macos' || platform === 'windows' || platform === 'linux'
	const arch: DownloadArch | null = isSupported ? (choice.arch ?? 'arm64') : null
	const downloadLabel = downloadButtonLabel(platform, arch)
	const otherChoices = otherDownloadChoices(platform, arch)

	useEffect(() => {
		if (!menuOpen) return
		const onPointerDown = (event: PointerEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
		}
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setMenuOpen(false)
		}
		document.addEventListener('pointerdown', onPointerDown)
		document.addEventListener('keydown', onKeyDown)
		return () => {
			document.removeEventListener('pointerdown', onPointerDown)
			document.removeEventListener('keydown', onKeyDown)
		}
	}, [menuOpen])

	return (
		<section className="min-h-[calc(100vh-80px)] flex items-center px-6 md:px-12 py-16 relative overflow-hidden">
			{/* Background gradient */}
			<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
			<div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
			<div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow-delayed" />

			{/* Content */}
			<div className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-8 md:gap-12 items-center relative z-10">
				{/* Left: Text content */}
				<div className="space-y-4 md:space-y-6 text-center md:text-left">
					<h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
						<span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
							Localize PDFs and Markdown on your machine
						</span>
					</h1>
					<p className="text-lg md:text-xl text-muted-foreground">
						A private translator for 100+ locales. Your files stay on this computer.
					</p>

					<div className="flex flex-col gap-3 pt-4">
						<div className="relative z-20 flex h-12 w-full items-stretch gap-2">
							{isSupported && arch ? (
								<a
									href={downloadHref(platform, arch)}
									onClick={() => {
										const event = downloadClick(platform, arch)
										track(event.name, event.data)
									}}
									className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 animate-glow"
								>
									<Download className="h-5 w-5 shrink-0" />
									<span className="truncate">{downloadLabel}</span>
								</a>
							) : (
								<button
									type="button"
									disabled
									className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-muted px-4 font-medium text-muted-foreground cursor-not-allowed"
								>
									<Download className="h-5 w-5 shrink-0" />
									<span className="truncate">{downloadLabel}</span>
								</button>
							)}
							<div className="relative" ref={menuRef}>
								<button
									type="button"
									className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-card hover:border-primary"
									aria-haspopup="menu"
									aria-expanded={menuOpen}
									aria-label="Other downloads"
									onClick={() => setMenuOpen((open) => !open)}
								>
									<ChevronDown className={`h-5 w-5 ${menuOpen ? 'rotate-180' : ''}`} />
								</button>
								{menuOpen && (
									<div
										role="menu"
										className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-56 rounded-lg border border-border bg-card p-1 shadow-lg"
									>
										{otherChoices.map((option) => (
											<button
												key={`${option.platform}-${option.arch}`}
												type="button"
												role="menuitem"
												className="flex h-10 w-full items-center rounded-md px-3 text-left text-sm hover:bg-primary/10"
												onClick={() => {
													onPlatformChange(option.platform)
													setMacArchOverride(option.platform === 'macos' ? option.arch : null)
													setMenuOpen(false)
												}}
											>
												{option.label}
											</button>
										))}
									</div>
								)}
							</div>
						</div>
						<a
							href="https://github.com/zimablue-io/document-localizer"
							className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border px-4 font-medium hover:bg-card"
						>
							<GitHubIcon className="h-5 w-5 shrink-0" />
							View on GitHub
						</a>
						<p className="text-xs text-muted-foreground text-center md:text-left">
							Open source. Free for personal use.
						</p>
					</div>
				</div>

				{/* Right: Animated Demo */}
				<div className="relative">
					{/* Floating document icons */}
					<div className="absolute -top-8 -left-8 animate-float-delayed hidden md:block">
						<div className="w-16 h-20 bg-card rounded-lg border border-border shadow-lg flex items-center justify-center">
							<FileText className="w-8 h-8 text-primary" />
						</div>
					</div>
					<div className="absolute -top-4 right-4 animate-float hidden md:block">
						<div className="w-14 h-18 bg-card rounded-lg border border-border shadow-lg flex items-center justify-center">
							<FileText className="w-7 h-7 text-purple-400" />
						</div>
					</div>
					<div className="absolute bottom-0 -left-12 animate-float-delayed-2 hidden md:block">
						<div className="w-12 h-16 bg-card rounded-lg border border-border shadow-lg flex items-center justify-center">
							<FileText className="w-6 h-6 text-green-400" />
						</div>
					</div>

					{/* Vertical diff boxes */}
					<div className="bg-card/80 backdrop-blur rounded-2xl border border-border p-4 md:p-6 shadow-2xl">
						<div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
							<span className="w-2 h-2 rounded-full bg-red-400" />
							Original (American English)
						</div>
						<div className="bg-[#1a1a2e] rounded-lg p-3 md:p-4 mb-3 md:mb-4">
							<OriginalText />
						</div>

						<div className="flex justify-center my-3">
							<div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-bounce-slow gap-0">
								<svg
									className="w-5 h-5 text-primary"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path d="M12 5v14M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								<svg
									className="w-5 h-5 text-primary"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path d="M12 19V5M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>
						</div>

						<div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
							<span className="w-2 h-2 rounded-full bg-green-400" />
							Localized (British English)
						</div>
						<div className="bg-[#1a1a2e] rounded-lg p-3 md:p-4">
							<LocalizedText />
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
