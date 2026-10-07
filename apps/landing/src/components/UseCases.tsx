import { BookOpen, Briefcase, Code, FileText, Shield, Zap } from 'lucide-react'

const useCases = [
	{
		icon: Shield,
		title: 'Legal & Compliance',
		description:
			'Draft contracts, NDAs, and regulatory filings without sending sensitive client data to third-party cloud servers. Output is machine-generated and needs qualified review before it is relied on.',
		color: 'text-blue-500',
	},
	{
		icon: Code,
		title: 'Technical Documentation',
		description:
			'Translate API docs, developer guides, and READMEs as a first pass for a human reviewer. Markdown structure carries through on Markdown export; code blocks are dropped on PDF export.',
		color: 'text-emerald-500',
	},
	{
		icon: BookOpen,
		title: 'Publishing & Books',
		description:
			'Pre-translate manuscripts so human editors start from a draft instead of a blank page. A reviewer still checks every passage before publication.',
		color: 'text-purple-500',
	},
	{
		icon: Briefcase,
		title: 'Enterprise Internal Docs',
		description:
			'Localize internal wikis, SOPs, and training materials. Fully air-gapped — runs on your GPU, behind your firewall, with zero data leaving your network.',
		color: 'text-amber-500',
	},
	{
		icon: FileText,
		title: 'Marketing & Localization',
		description:
			'Transform whitepapers, brochures, and case studies into multiple languages while keeping your brand voice intact. Export back to polished PDF or Markdown.',
		color: 'text-rose-500',
	},
	{
		icon: Zap,
		title: 'Rapid Prototyping',
		description:
			'Need a quick draft translation to evaluate a market? Process hundreds of pages overnight on your local machine and get a working first pass by morning.',
		color: 'text-cyan-500',
	},
]

export default function UseCases() {
	return (
		<section id="use-cases" className="py-20 px-4 md:px-8 bg-muted/30">
			<div className="max-w-6xl mx-auto">
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold mb-4">Built for the Use Cases That Matter</h2>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						Whether you're translating sensitive legal documents, developer manuals, or full book
						manuscripts — Najimu keeps your data local and gives you a reviewable draft to start from.
					</p>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
					{useCases.map((uc) => {
						const Icon = uc.icon
						return (
							<div
								key={uc.title}
								className="group bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
							>
								<div className={`${uc.color} mb-4`}>
									<Icon className="w-8 h-8" />
								</div>
								<h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
									{uc.title}
								</h3>
								<p className="text-muted-foreground leading-relaxed">{uc.description}</p>
							</div>
						)
					})}
				</div>

				{/* Bottom CTA */}
				<div className="mt-16 text-center">
					<p className="text-muted-foreground mb-4">
						Don't see your use case? Najimu supports any PDF or Markdown content.
					</p>
					<a
						href="#setup"
						className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
					>
						<Zap className="w-4 h-4" />
						See how it works
					</a>
				</div>
			</div>
		</section>
	)
}
