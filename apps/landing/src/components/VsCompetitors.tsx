import { DollarSign, FileText, Lock, Shield, Zap } from 'lucide-react'

const features = [
	{
		label: 'Data Privacy',
		localizer: 'Document text stays on your machine',
		deepl: 'Cloud-only — documents sent to DeepL servers',
		google: 'Cloud-only — documents sent to Google servers',
		localizerIcon: Lock,
		localizerColor: 'text-emerald-500',
		competitorColor: 'text-red-500',
	},
	{
		label: 'Cost',
		localizer: 'Personal use is free. Commercial use needs a license',
		deepl: 'Subscription-based pricing, per-user fees',
		google: 'Pay-per-use pricing model',
		localizerIcon: DollarSign,
		localizerColor: 'text-emerald-500',
		competitorColor: 'text-red-500',
	},
	{
		label: 'Formatting Retention',
		localizer: 'Preserves markdown, code blocks, and layout structure',
		deepl: 'Basic formatting — complex layouts often break',
		google: 'Basic formatting — tables and code can degrade',
		localizerIcon: FileText,
		localizerColor: 'text-emerald-500',
		competitorColor: 'text-amber-500',
	},
	{
		label: 'Custom Models',
		localizer: 'Plug in your own LLM — Ollama, LM Studio, or llama.cpp',
		deepl: 'Black box — no model customization',
		google: 'Black box — no model customization',
		localizerIcon: Zap,
		localizerColor: 'text-emerald-500',
		competitorColor: 'text-red-500',
	},
	{
		label: 'Diff & Review',
		localizer: 'Built-in side-by-side diff editor for fast human review',
		deepl: 'No diff view — just translated output',
		google: 'No diff view — just translated output',
		localizerIcon: FileText,
		localizerColor: 'text-emerald-500',
		competitorColor: 'text-red-500',
	},
	{
		label: 'Offline translation',
		localizer: 'Translation runs without an internet connection',
		deepl: 'Requires cloud connection',
		google: 'Requires cloud connection',
		localizerIcon: Shield,
		localizerColor: 'text-emerald-500',
		competitorColor: 'text-red-500',
	},
]

export default function VsCompetitors() {
	return (
		<section id="vs-competitors" className="py-12 md:py-16 px-4 md:px-8">
			<div className="max-w-6xl mx-auto">
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold mb-4">Document Localizer vs. Cloud Translators</h2>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						DeepL and Google Translate are fast for quick sentences — but when your documents are sensitive,
						expensive, or complex, local processing wins.
					</p>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="border-b-2 border-border">
								<th className="pb-4 pr-8 text-sm font-medium text-muted-foreground w-1/3">Feature</th>
								<th className="pb-4 px-8 text-lg font-bold text-primary">Document Localizer</th>
								<th className="pb-4 px-4 text-lg font-semibold text-foreground">DeepL</th>
								<th className="pb-4 px-4 text-lg font-semibold text-foreground">Google Translate</th>
							</tr>
						</thead>
						<tbody>
							{features.map((feat, i) => {
								const Icon = feat.localizerIcon
								return (
									<tr
										key={feat.label}
										className={i === features.length - 1 ? '' : 'border-b border-border/50'}
									>
										<td className="py-5 pr-8 align-top">
											<div className="flex items-center gap-2 mb-1">
												<Icon className={`w-4 h-4 ${feat.localizerColor}`} />
												<span className="font-medium">{feat.label}</span>
											</div>
											<p className="text-xs text-muted-foreground">{feat.localizer}</p>
										</td>
										<td className="py-5 px-8 align-top">
											<p className="font-medium text-emerald-600 dark:text-emerald-400 mb-2">
												✓ {feat.localizer}
											</p>
										</td>
										<td className="py-5 px-4 align-top">
											<p className="text-sm text-foreground/80 mb-2">
												{feat.competitorColor === 'text-red-500' ? '✗' : '△'} {feat.deepl}
											</p>
										</td>
										<td className="py-5 px-4 align-top">
											<p className="text-sm text-foreground/80">
												{feat.competitorColor === 'text-red-500' ? '✗' : '△'} {feat.google}
											</p>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>

				{/* Bottom CTA */}
				<div className="mt-16 text-center">
					<p className="text-muted-foreground mb-4">
						Stop paying per-document and start localizing with full privacy control.
					</p>
					<a
						href="#setup"
						className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
					>
						<Zap className="w-4 h-4" />
						Download & Start Free
					</a>
				</div>
			</div>
		</section>
	)
}
