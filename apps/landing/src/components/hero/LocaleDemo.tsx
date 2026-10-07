import { FileText } from 'lucide-react'
import type { DemoExample, DemoSegment } from './examples'

interface LocaleDemoProps {
	example: DemoExample
}

/** Literal class names so Tailwind's scanner can see them. */
const CHANGE_CLASS: Record<'red' | 'green', string> = {
	red: 'bg-red-900/50 text-red-300 px-0.5 rounded mx-[-1px]',
	green: 'bg-green-900/50 text-green-300 px-0.5 rounded mx-[-1px]',
}

function SegmentedText({ segments, hue }: { segments: DemoSegment[]; hue: 'red' | 'green' }) {
	return (
		<p className="font-mono text-sm leading-relaxed">
			{segments.map((segment, i) => (
				<span key={i} className={segment.changed ? CHANGE_CLASS[hue] : undefined}>
					{segment.text}
				</span>
			))}
		</p>
	)
}

export default function LocaleDemo({ example }: LocaleDemoProps) {
	return (
		<div className="relative md:pl-6 md:pr-6">
			{/* Decorative icons sit in the surrounding gutter (not behind the opaque card) and are
			    offset far enough that they never cover the tab strip or its caption. */}
			<div className="absolute top-14 -left-4 animate-float-delayed hidden md:block pointer-events-none">
				<div className="w-14 h-18 bg-card rounded-lg border border-border shadow-lg flex items-center justify-center">
					<FileText className="w-7 h-7 text-primary" />
				</div>
			</div>
			<div className="absolute bottom-16 -left-6 animate-float-delayed-2 hidden md:block pointer-events-none">
				<div className="w-11 h-14 bg-card rounded-lg border border-border shadow-lg flex items-center justify-center">
					<FileText className="w-5 h-5 text-green-400" />
				</div>
			</div>
			<div className="absolute bottom-5 -right-5 animate-float hidden md:block pointer-events-none">
				<div className="w-12 h-16 bg-card rounded-lg border border-border shadow-lg flex items-center justify-center">
					<FileText className="w-6 h-6 text-purple-400" />
				</div>
			</div>

			<div className="relative bg-card/80 backdrop-blur rounded-2xl border border-border p-4 md:p-6 shadow-2xl">
				<div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
					<span className="w-2 h-2 rounded-full bg-red-400" />
					Original ({example.sourceName})
				</div>
				<div className="bg-[#1a1a2e] rounded-lg p-3 md:p-4 mb-3 md:mb-4">
					<SegmentedText segments={example.source} hue="red" />
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
					Localized ({example.targetName})
				</div>
				<div className="bg-[#1a1a2e] rounded-lg p-3 md:p-4">
					<SegmentedText segments={example.target} hue="green" />
				</div>
			</div>
		</div>
	)
}
