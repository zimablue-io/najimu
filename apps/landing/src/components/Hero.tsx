import { track } from '@vercel/analytics'
import { Download, FileText, Info } from 'lucide-react'
import { useState } from 'react'
import { Platform, useMachine } from '../hooks/usePlatform'
import { DownloadArch, downloadClick, downloadHref } from '../lib/downloads'
import { resolveDownloadChoice } from '../lib/machine'
import { GitHubIcon } from './Icons'

type PlatformKey = 'macos' | 'windows' | 'linux'

const macArchLabels: Record<DownloadArch, string> = {
	arm64: 'Apple silicon',
	x64: 'Intel',
}

interface HeroProps {
	selectedPlatform: Platform | null
	onPlatformChange: (platform: Platform | null) => void
}

const platformLabels: Record<PlatformKey, string> = {
	macos: 'macOS',
	windows: 'Windows',
	linux: 'Linux',
}

const originalText = 'The color of the car is parked in the garage. Mom made her favorite soccer jersey.'
const localizedText = 'The colour of the car is parked in the garage. Mum made her favourite football jersey.'

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
	const choice = resolveDownloadChoice(detected, selectedPlatform, macArchOverride)
	const platform = choice.platform
	const isSupported = platform === 'macos' || platform === 'windows' || platform === 'linux'
	const arch: DownloadArch = choice.arch ?? 'arm64'
	const macArch: DownloadArch = platform === 'macos' ? arch : 'arm64'
	const downloadLabel =
		platform === 'macos'
			? `Download for macOS (${macArchLabels[macArch]})`
			: platform === 'windows' || platform === 'linux'
				? `Download for ${platformLabels[platform]}`
				: 'Download'

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
							Localize PDFs &amp; Markdown with AI
						</span>
						<br />
						<span className="text-foreground">100% Offline, 100% Private</span>
					</h1>
					<p className="text-lg md:text-xl text-muted-foreground">
						Free offline document translator between 100+ locales. Runs entirely on your machine using
						Ollama, LM Studio, or llama.cpp - no cloud, no API keys, no data leaving your computer.
					</p>
					<p className="text-muted-foreground max-w-md mx-auto md:mx-0">
						Perfect for English variants (US, UK, AU, CA, IN), Spanish (ES, MX, AR), Portuguese (PT, BR),
						French (FR, CA), German (DE, AT, CH), and 90+ more locales. Free for personal use.
					</p>

					<nav
						aria-label="Page sections"
						className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 text-sm pt-1"
					>
						<a href="#features" className="text-primary hover:underline">
							Features
						</a>
						<span className="text-muted-foreground" aria-hidden="true">
							&middot;
						</span>
						<a href="#how-it-works" className="text-primary hover:underline">
							How It Works
						</a>
						<span className="text-muted-foreground" aria-hidden="true">
							&middot;
						</span>
						<a href="#setup" className="text-primary hover:underline">
							Setup Guide
						</a>
					</nav>

					<p className="text-xs text-muted-foreground">
						Open source on{' '}
						<a
							href="https://github.com/zimablue-io/document-localizer"
							className="text-primary hover:underline"
							rel="noopener"
						>
							GitHub
						</a>
						. Free for personal use.
					</p>

					<div className="flex flex-col gap-3 pt-4">
						{/* Platform Tabs */}
						<div className="flex border-b border-border">
							{(Object.keys(platformLabels) as PlatformKey[]).map((p) => (
								<button
									key={p}
									type="button"
									onClick={() => {
										if (p === 'macos' && platform !== 'macos') setMacArchOverride(null)
										onPlatformChange(p)
									}}
									className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
										platform === p
											? 'border-primary text-primary'
											: 'border-transparent text-muted-foreground hover:text-foreground'
									}`}
								>
									{platformLabels[p]}
								</button>
							))}
						</div>

						{platform === 'macos' && (
							<div className="flex gap-2" role="group" aria-label="Mac processor">
								{(Object.keys(macArchLabels) as DownloadArch[]).map((archOption) => (
									<button
										key={archOption}
										type="button"
										onClick={() => setMacArchOverride(archOption)}
										aria-pressed={macArch === archOption}
										className={`px-3 py-1 text-sm rounded-md border transition-colors ${
											macArch === archOption
												? 'border-primary text-primary'
												: 'border-border text-muted-foreground hover:text-foreground'
										}`}
									>
										{macArchLabels[archOption]}
									</button>
								))}
							</div>
						)}

						{isSupported ? (
							<a
								href={downloadHref(platform, arch)}
								onClick={() => {
									const event = downloadClick(platform, arch)
									track(event.name, event.data)
								}}
								className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/25 animate-glow"
							>
								<Download className="w-5 h-5" />
								{downloadLabel}
							</a>
						) : (
							<button
								disabled
								className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-muted text-muted-foreground rounded-lg font-medium cursor-not-allowed opacity-60"
							>
								<Info className="w-5 h-5" />
								Currently only macOS, Windows, and Linux are supported
							</button>
						)}
						<a
							href="https://github.com/zimablue-io/document-localizer"
							className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-lg font-medium hover:bg-card transition-all hover:scale-105"
						>
							<GitHubIcon className="w-5 h-5" />
							View on GitHub
						</a>
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
