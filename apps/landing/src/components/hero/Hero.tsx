import { Download, Info } from 'lucide-react'
import { useRef, useState } from 'react'
import { Platform, usePlatform } from '../../hooks/usePlatform'
import { GitHubIcon } from '../Icons'
import { DEMO_EXAMPLES } from './examples'
import LocaleDemo from './LocaleDemo'

type PlatformKey = 'macos' | 'windows' | 'linux'

interface HeroProps {
	selectedPlatform: Platform | null
	onPlatformChange: (platform: Platform | null) => void
}

const platformLabels: Record<PlatformKey, string> = {
	macos: 'macOS',
	windows: 'Windows',
	linux: 'Linux',
}

const platformDownloadUrls: Record<PlatformKey, string> = {
	macos: 'https://github.com/zimablue-io/document-localizer/releases/latest',
	windows: 'https://github.com/zimablue-io/document-localizer/releases/latest',
	linux: 'https://github.com/zimablue-io/document-localizer/releases/latest',
}

function DemoTabs() {
	const [activeIndex, setActiveIndex] = useState(0)
	const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

	const focusTab = (index: number) => {
		const bounded = (index + DEMO_EXAMPLES.length) % DEMO_EXAMPLES.length
		setActiveIndex(bounded)
		tabRefs.current[bounded]?.focus()
	}

	const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault()
			focusTab(index + 1)
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault()
			focusTab(index - 1)
		} else if (event.key === 'Home') {
			event.preventDefault()
			focusTab(0)
		} else if (event.key === 'End') {
			event.preventDefault()
			focusTab(DEMO_EXAMPLES.length - 1)
		}
	}

	const active = DEMO_EXAMPLES[activeIndex]

	return (
		<div>
			<div role="tablist" aria-label="Localization examples" className="flex border-b border-border">
				{DEMO_EXAMPLES.map((example, index) => (
					<button
						key={example.id}
						ref={(el) => {
							tabRefs.current[index] = el
						}}
						role="tab"
						id={`demo-tab-${example.id}`}
						aria-controls={`demo-panel-${example.id}`}
						aria-selected={index === activeIndex}
						tabIndex={index === activeIndex ? 0 : -1}
						onClick={() => setActiveIndex(index)}
						onKeyDown={(e) => onKeyDown(e, index)}
						className={`px-3 py-2 text-xs md:text-sm font-medium border-b-2 transition-colors ${
							index === activeIndex
								? 'border-primary text-primary'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						}`}
					>
						{example.label}
					</button>
				))}
			</div>

			<p className="text-xs text-muted-foreground mt-2">{active.useCase}</p>

			<div
				role="tabpanel"
				id={`demo-panel-${active.id}`}
				aria-labelledby={`demo-tab-${active.id}`}
				className="mt-3"
			>
				<LocaleDemo example={active} />
			</div>

			<p className="text-xs text-muted-foreground mt-3">
				AI translations can contain errors. Review every change in the diff view and approve it before relying
				on the output.
			</p>
		</div>
	)
}

export default function Hero({ selectedPlatform, onPlatformChange }: HeroProps) {
	const detectedPlatform = usePlatform()
	const platform =
		selectedPlatform ?? ((detectedPlatform !== 'unsupported' ? detectedPlatform : 'macos') as PlatformKey)
	const isSupported = platform !== 'unsupported'

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
						{/* Platform Tabs */}
						<div className="flex border-b border-border">
							{(Object.keys(platformLabels) as PlatformKey[]).map((p) => (
								<button
									key={p}
									onClick={() => onPlatformChange(p)}
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

						{/* Download Button */}
						{isSupported ? (
							<a
								href={platformDownloadUrls[platform]}
								className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/25 animate-glow"
							>
								<Download className="w-5 h-5" />
								Download for {platformLabels[platform]}
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
						<p className="text-xs text-muted-foreground text-center md:text-left">
							Open source. Free for personal use.
						</p>
					</div>
				</div>

				{/* Right: Animated Demo */}
				<div className="relative">
					<DemoTabs />
				</div>
			</div>
		</section>
	)
}
