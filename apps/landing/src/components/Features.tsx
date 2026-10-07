import { Brain, FileText, GitCompare, Shield } from 'lucide-react'
import { OpenSourceIcon } from './Icons'

const features = [
	{
		icon: Shield,
		title: 'Private',
		description:
			'Nothing leaves your device. Translation runs entirely on your local machine via Ollama, LM Studio, or llama.cpp - no cloud APIs, no telemetry, no data collection.',
	},
	{
		icon: Brain,
		title: 'AI-Powered',
		description:
			'Smart context-aware translations using any OpenAI-compatible local model - Llama 3, Mistral, Phi-3, Gemma, Qwen, and more.',
	},
	{
		icon: GitCompare,
		title: 'You Control',
		description:
			'Review every change with side-by-side diff before export. Approve or reject each paragraph individually - your document, your call.',
	},
	{
		icon: FileText,
		title: 'PDF & Markdown',
		description:
			'Drop in a PDF or Markdown file. Get a clean localized document back. No format lock-in, no proprietary formats.',
	},
	{
		icon: OpenSourceIcon,
		title: 'Open Source',
		description:
			'Free for personal use. Inspect the code, suggest features, or self-host the entire offline translation pipeline.',
	},
]

export default function Features() {
	return (
		<section className="section-gutter py-12 md:py-16 border-t border-border bg-gradient-to-b from-card/50 to-background">
			<div className="max-w-6xl mx-auto w-full">
				<div className="text-center mb-8">
					<h2 className="text-2xl font-bold mb-1">Everything you need for offline document translation</h2>
					<p className="text-muted-foreground text-sm">Localize documents with confidence.</p>
				</div>

				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
					{features.map((feature) => (
						<article
							key={feature.title}
							className="group bg-card rounded-2xl p-4 border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
							aria-label={`${feature.title}: ${feature.description}`}
						>
							<div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
								<feature.icon className="w-4 h-4 text-primary" />
							</div>
							<h3 className="text-sm font-semibold mb-0.5">{feature.title}</h3>
							<p className="text-muted-foreground text-xs">{feature.description}</p>
						</article>
					))}
				</div>
			</div>
		</section>
	)
}
