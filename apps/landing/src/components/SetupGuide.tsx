import { useState } from 'react'
import { Platform, usePlatform } from '../hooks/usePlatform'

type ProviderStep = {
	title: string
	command?: string | null
	description: string
	platforms?: Platform[]
}

interface Provider {
	id: string
	name: string
	installUrl: string
	defaultPort: string
	defaultApiUrl: string
	steps: ProviderStep[]
}

const providers: Provider[] = [
	{
		id: 'ollama',
		name: 'Ollama',
		installUrl: 'https://ollama.ai',
		defaultPort: '11434',
		defaultApiUrl: 'http://localhost:11434/v1',
		steps: [
			{
				title: 'Install Ollama',
				command: 'brew install ollama',
				description: 'Or download from ollama.ai/download',
				platforms: ['macos'],
			},
			{
				title: 'Install Ollama',
				command: null,
				description: 'Download from ollama.ai/download - available for macOS, Windows, and Linux.',
				platforms: ['windows', 'linux'],
			},
			{
				title: 'Start the server',
				command: 'ollama serve',
				description: 'Runs automatically on port 11434. Keep this terminal open while using the app.',
			},
			{
				title: 'Pull a model',
				command: 'ollama pull llama3.2:3b',
				description: 'Downloads the model (~2GB). Choose any model from ollama.ai/library.',
			},
			{
				title: 'Configure in app',
				description: 'Enter API URL http://localhost:11434/v1 and model name (e.g., llama3.2:3b) in Settings.',
			},
		],
	},
	{
		id: 'lmstudio',
		name: 'LM Studio',
		installUrl: 'https://lmstudio.ai',
		defaultPort: '1234',
		defaultApiUrl: 'http://localhost:1234/v1',
		steps: [
			{
				title: 'Download LM Studio',
				command: null,
				description: 'Get it from lmstudio.ai - available for macOS, Windows, and Linux.',
			},
			{
				title: 'Download a model',
				description:
					'Use the search bar to find and download a model (e.g., "llama 3.2 3b"). The model downloads to your local machine.',
			},
			{
				title: 'Start local server',
				description:
					'Click the "Local Server" tab on the left. Click "Start Server" - it defaults to http://localhost:1234/v1.',
			},
			{
				title: 'Configure in app',
				description:
					'Enter API URL http://localhost:1234/v1 and model name (from the model you downloaded) in Settings.',
			},
		],
	},
	{
		id: 'llamacpp',
		name: 'llama.cpp',
		installUrl: 'https://github.com/ggerganov/llama.cpp',
		defaultPort: '8080',
		defaultApiUrl: 'http://localhost:8080/v1',
		steps: [
			{
				title: 'Install llama.cpp',
				command: 'brew install llama.cpp',
				description: 'Builds the server binary. Requires CMake and build tools.',
				platforms: ['macos'],
			},
			{
				title: 'Install llama.cpp',
				command: null,
				description:
					'Follow build instructions at github.com/ggerganov/llama.cpp. Requires CMake and build tools.',
				platforms: ['windows', 'linux'],
			},
			{
				title: 'Download a model',
				description:
					'Download a GGUF model file from Hugging Face (e.g., TheBloke/Mistral-7B-Instruct-v0.2-GGUF).',
			},
			{
				title: 'Start the server',
				command: 'llama-server -m model.gguf -c 4096 -port 8080',
				description: 'Adjust model path and context size as needed. Port 8080 is default.',
			},
			{
				title: 'Configure in app',
				description:
					'Enter API URL http://localhost:8080/v1 and model name (from your GGUF filename) in Settings.',
			},
		],
	},
]

function TerminalBlock({ command }: { command: string }) {
	return (
		<code className="block bg-[#1a1a2e] text-green-400 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto">
			{command}
		</code>
	)
}

function StepItem({ step, isLast, platform }: { step: ProviderStep; isLast: boolean; platform: Platform }) {
	// Skip steps that don't apply to current platform
	if (step.platforms && !step.platforms.includes(platform)) {
		return null
	}

	return (
		<div className="flex gap-4">
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

interface SetupGuideProps {
	selectedPlatform: Platform | null
}

export default function SetupGuide({ selectedPlatform }: SetupGuideProps) {
	const [activeTab, setActiveTab] = useState('ollama')
	const detectedPlatform = usePlatform()
	const platform = selectedPlatform ?? detectedPlatform
	const activeProvider = providers.find((p) => p.id === activeTab)!
	const visibleSteps = activeProvider.steps.filter((step) => !step.platforms || step.platforms.includes(platform))

	return (
		<section className="py-20 px-6 border-t border-border">
			<div className="max-w-4xl mx-auto">
				<h2 className="text-3xl font-bold text-center mb-4">Setup Your AI Backend</h2>
				<p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
					Document Localizer works with any OpenAI-compatible API. Choose your preferred backend below and
					follow the steps to get started.
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
				<div className="grid md:grid-cols-2 gap-8">
					{/* Left: Steps */}
					<div>
						<div className="flex items-center gap-3 mb-6">
							<h3 className="text-xl font-semibold">{activeProvider.name}</h3>
							<span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
								Port {activeProvider.defaultPort}
							</span>
						</div>

						<div>
							{visibleSteps.map((step, index) => (
								<StepItem
									key={step.title}
									step={step}
									isLast={index === visibleSteps.length - 1}
									platform={platform}
								/>
							))}
						</div>
					</div>

					{/* Right: Quick Reference */}
					<div className="bg-card rounded-xl p-6 border border-border h-fit">
						<h4 className="font-semibold mb-4">Quick Reference</h4>

						<div className="space-y-4">
							<div>
								<p className="text-xs text-muted-foreground mb-1">API URL</p>
								<TerminalBlock command={activeProvider.defaultApiUrl} />
							</div>

							<div className="border-t border-border pt-4">
								<p className="text-xs text-muted-foreground mb-2">Install</p>
								<a
									href={activeProvider.installUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-primary hover:underline"
								>
									{activeProvider.installUrl}
								</a>
							</div>
						</div>

						<div className="mt-6 p-4 bg-secondary/50 rounded-lg">
							<p className="text-sm">
								<strong>Note:</strong> Any OpenAI-compatible API works. The app sends text to your local
								server and receives translations back.
							</p>
						</div>
					</div>
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
								<span>Is Document Localizer really free?</span>
								<span
									className="text-muted-foreground group-open:rotate-180 transition-transform"
									aria-hidden="true"
								>
									&#9662;
								</span>
							</summary>
							<p className="mt-2 text-sm text-muted-foreground">
								Personal and non-commercial use is free. Commercial use requires a Document Localizer
								Commercial license. See the{' '}
								<a
									href="https://github.com/zimablue-io/document-localizer/blob/main/LICENSE.md"
									className="text-primary hover:underline"
								>
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
								No. Document text is processed only by the local AI backend you choose (Ollama, LM
								Studio, or llama.cpp). License checks and update checks do not include document text.
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
