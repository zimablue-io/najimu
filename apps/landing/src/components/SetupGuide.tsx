import { useState } from 'react'
import { type Platform, usePlatform } from '../hooks/usePlatform'
import { useStableHeight } from '../hooks/useStableHeight'
import { licenseUrl } from '../lib/site'
import { type Provider, type ProviderStep, providers } from './providers'

function TerminalBlock({ command }: { command: string }) {
	return (
		<code className="block bg-[#1a1a2e] text-green-400 px-4 py-3 rounded-lg font-mono text-sm break-all">
			{command}
		</code>
	)
}

function StepItem({
	step,
	isLast,
	platform,
	index,
}: {
	step: ProviderStep
	isLast: boolean
	platform: Platform
	index: number
}) {
	// Skip steps that don't apply to current platform
	if (step.platforms && !step.platforms.includes(platform)) {
		return null
	}

	// Reserved per index, so a provider with a taller step 1 cannot push step 2
	// down even though the column as a whole is pinned.
	const reserved = `var(--demo-step-${index}-h)`

	return (
		<div data-part={`step-${index}`} style={{ minHeight: reserved }} className="flex gap-4">
			<div className="flex flex-col items-center">
				<div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold">
					{step.title.charAt(0)}
				</div>
				{!isLast && <div className="w-px h-full min-h-[3rem] bg-border mt-2" />}
			</div>
			<div className="flex-1 pb-8">
				<h4 className="font-semibold mb-2">{step.title}</h4>
				{step.command && <TerminalBlock command={step.command} />}
				<p className="text-muted-foreground text-sm mt-2">{step.description}</p>
			</div>
		</div>
	)
}

// The provider-dependent block. Step count and the Quick Reference card both vary
// by provider, and the platform filter changes the count again on first paint.
function ProviderBody({ provider, platform }: { provider: Provider; platform: Platform }) {
	const steps = provider.steps.filter((step) => !step.platforms || step.platforms.includes(platform))

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
			{/* grid-cols-1 is not redundant: it is repeat(1, minmax(0, 1fr)), and the 0
			    minimum is what stops a long URL in Quick Reference from sizing the
			    track to max-content and pushing the page into a sideways scroll. */}
			<div className="min-w-0">
				<div data-part="provider-head" className="flex items-center gap-3 mb-6">
					<h3 className="text-xl font-semibold min-w-0 break-words">{provider.name}</h3>
					<span className="ml-auto shrink-0 text-center text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
						Port {provider.defaultPort}
					</span>
				</div>

				<div>
					{steps.map((step, index) => (
						<StepItem
							key={step.title}
							step={step}
							isLast={index === steps.length - 1}
							platform={platform}
							index={index}
						/>
					))}
				</div>
			</div>

			<div
				data-part="quickref"
				style={{ minHeight: 'var(--demo-quickref-h)' }}
				className="bg-card rounded-xl p-6 border border-border h-fit"
			>
				<h4 className="font-semibold mb-4">Quick Reference</h4>

				<div className="space-y-4">
					<div>
						<p className="text-xs text-muted-foreground mb-1">API URL</p>
						<TerminalBlock command={provider.defaultApiUrl} />
					</div>

					<div className="border-t border-border pt-4">
						<p className="text-xs text-muted-foreground mb-2">Install</p>
						<a
							href={provider.installUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-primary hover:underline break-all"
						>
							{provider.installUrl}
						</a>
					</div>
				</div>

				<div className="mt-6 p-4 bg-secondary/50 rounded-lg">
					<p className="text-sm">
						<strong>Note:</strong> Any OpenAI-compatible API works. The app sends text to your local server
						and receives translations back.
					</p>
				</div>
			</div>
		</div>
	)
}

interface SetupGuideProps {
	selectedPlatform: Platform | null
}

export default function SetupGuide({ selectedPlatform }: SetupGuideProps) {
	const [activeTab, setActiveTab] = useState('ollama')
	const detectedPlatform = usePlatform()
	const platform = selectedPlatform ?? detectedPlatform
	const activeProvider = providers.find((p) => p.id === activeTab)!
	// The platform decides how many steps each provider lists, so it is part of
	// what gets measured.
	const height = useStableHeight<HTMLDivElement>([platform])

	return (
		<section className="section-gutter py-20 border-t border-border">
			<div className="max-w-4xl mx-auto">
				<h2 className="text-3xl font-bold text-center mb-4">Setup Your AI Backend</h2>
				<p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
					Najimu works with any OpenAI-compatible API. Choose your preferred backend below and follow the
					steps to get started.
				</p>

				{/* Horizontal Tab List */}
				<div className="flex border-b border-border mb-8 overflow-x-auto">
					{providers.map((provider) => (
						<button
							key={provider.id}
							onClick={() => setActiveTab(provider.id)}
							className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
								activeTab === provider.id
									? 'border-primary text-primary'
									: 'border-transparent text-muted-foreground hover:text-foreground'
							}`}
						>
							{provider.name}
						</button>
					))}
				</div>

				{/* Tab Content */}
				<div ref={height.containerRef} className="relative" style={height.style}>
					{height.measuring && (
						<height.MeasurePass setRef={height.setMeasureRef}>
							{providers.map((provider) => (
								<ProviderBody key={provider.id} provider={provider} platform={platform} />
							))}
						</height.MeasurePass>
					)}
					<ProviderBody provider={activeProvider} platform={platform} />
				</div>

				{/* System Requirements Footer */}
				<div className="mt-12 pt-8 border-t border-border">
					<h4 className="text-sm font-semibold text-muted-foreground mb-4 text-center">
						System Requirements
					</h4>
					<div className="flex flex-wrap justify-center gap-6 text-sm">
						<div className="flex items-center gap-2">
							<svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
								/>
							</svg>
							<span>macOS, Windows, or Linux</span>
						</div>
						<div className="flex items-center gap-2">
							<svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
								/>
							</svg>
							<span>4GB+ RAM (8GB recommended)</span>
						</div>
						<div className="flex items-center gap-2">
							<svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z"
								/>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6" />
							</svg>
							<span>~5GB disk per model</span>
						</div>
					</div>
				</div>

				{/* FAQ */}
				<div className="mt-12 pt-8 border-t border-border">
					<h3 className="text-xl font-semibold text-center mb-6">Frequently Asked Questions</h3>
					<div className="max-w-3xl mx-auto space-y-2">
						<details className="group bg-card rounded-lg border border-border p-4">
							<summary className="cursor-pointer font-medium list-none flex justify-between items-center">
								<span>Is Najimu really free?</span>
								<span
									className="text-muted-foreground group-open:rotate-180 transition-transform"
									aria-hidden="true"
								>
									&#9662;
								</span>
							</summary>
							<p className="mt-2 text-sm text-muted-foreground">
								Yes. Najimu is free for personal and non-commercial use. See the{' '}
								<a href={licenseUrl} className="text-primary hover:underline">
									license
								</a>{' '}
								for commercial-use details.
							</p>
						</details>
						<details className="group bg-card rounded-lg border border-border p-4">
							<summary className="cursor-pointer font-medium list-none flex justify-between items-center">
								<span>Do my documents get sent to the cloud?</span>
								<span
									className="text-muted-foreground group-open:rotate-180 transition-transform"
									aria-hidden="true"
								>
									&#9662;
								</span>
							</summary>
							<p className="mt-2 text-sm text-muted-foreground">
								No. All processing happens locally on your machine via your chosen AI backend (Ollama,
								LM Studio, or llama.cpp). The app never makes outbound network requests for your
								document content.
							</p>
						</details>
						<details className="group bg-card rounded-lg border border-border p-4">
							<summary className="cursor-pointer font-medium list-none flex justify-between items-center">
								<span>Which AI models are supported?</span>
								<span
									className="text-muted-foreground group-open:rotate-180 transition-transform"
									aria-hidden="true"
								>
									&#9662;
								</span>
							</summary>
							<p className="mt-2 text-sm text-muted-foreground">
								Any local model exposing an OpenAI-compatible API works, including Llama 3.2, Mistral,
								Phi-3, Gemma 2, and Qwen 2.5. Smaller models (3B) are fast; larger models (7B+) give
								higher quality.
							</p>
						</details>
						<details className="group bg-card rounded-lg border border-border p-4">
							<summary className="cursor-pointer font-medium list-none flex justify-between items-center">
								<span>Can it translate between non-English languages?</span>
								<span
									className="text-muted-foreground group-open:rotate-180 transition-transform"
									aria-hidden="true"
								>
									&#9662;
								</span>
							</summary>
							<p className="mt-2 text-sm text-muted-foreground">
								Yes. The app supports 100+ locale pairs, including en-US to en-GB, es-ES to es-MX, fr-FR
								to fr-CA, de-DE to de-AT, pt-PT to pt-BR, and many cross-language pairs depending on the
								model you install.
							</p>
						</details>
						<details className="group bg-card rounded-lg border border-border p-4">
							<summary className="cursor-pointer font-medium list-none flex justify-between items-center">
								<span>What file formats are supported?</span>
								<span
									className="text-muted-foreground group-open:rotate-180 transition-transform"
									aria-hidden="true"
								>
									&#9662;
								</span>
							</summary>
							<p className="mt-2 text-sm text-muted-foreground">
								Input: PDF and Markdown (.md). Output: PDF and Markdown (.md). PDFs are parsed on-device
								using pdfjs-dist.
							</p>
						</details>
					</div>
				</div>
			</div>
		</section>
	)
}
