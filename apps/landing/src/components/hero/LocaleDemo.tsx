import { FileText } from 'lucide-react'
import type { DemoExample, DemoSegment } from './examples'

interface LocaleDemoProps {
	example: DemoExample
}

/**
 * Every segment carries the same padding, changed or not.
 *
 * Giving only the highlighted segments negative margins made the text position
 * depend on which segments happened to be marked, so switching examples nudged
 * the text by a pixel. Colour alone now distinguishes a changed segment.
 */
const SEGMENT_CLASS = 'px-0.5 rounded'

/** Literal class names so Tailwind's scanner can see them. */
const CHANGE_CLASS: Record<'red' | 'green', string> = {
	red: 'bg-red-900/50 text-red-300',
	green: 'bg-green-900/50 text-green-300',
}

/**
 * inline-block so each segment wraps as a whole unit. With inline spans the glyphs
 * inside a segment landed on different lines for a short versus a long sentence,
 * moving text inside the reserved box.
 */
function SegmentedText({ segments, hue }: { segments: DemoSegment[]; hue: 'red' | 'green' }) {
	return (
		<p className="font-mono text-sm leading-relaxed">
			{segments.map((segment, i) => (
				<span key={i} className={`inline-block ${SEGMENT_CLASS} ${segment.changed ? CHANGE_CLASS[hue] : ''}`}>
					{segment.text}
				</span>
			))}
		</p>
	)
}

export default function LocaleDemo({ example }: LocaleDemoProps) {
	return (
		<div className="relative md:pl-6 md:pr-6">
			{/* Decorative, offset into the surrounding gutter so they never cover the card. */}
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

			{/* Each part reads back the tallest height measured across the examples, so a card
			    that resizes cannot slide the content under it. */}
			<div
				data-part="card"
				className="relative bg-card/80 backdrop-blur rounded-2xl border border-border p-4 md:p-6 shadow-2xl"
				style={{ minHeight: 'var(--demo-card-h)' }}
			>
				<div
					data-part="source-label"
					style={{ minHeight: 'var(--demo-source-label-h)' }}
					className="text-xs text-muted-foreground mb-3 flex items-center gap-2"
				>
					<span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
					Original ({example.sourceName})
				</div>
				<div
					data-part="source-box"
					style={{ minHeight: 'var(--demo-source-box-h)' }}
					className="bg-[#1a1a2e] rounded-lg p-3 md:p-4 mb-3 md:mb-4"
				>
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

				<div
					data-part="target-label"
					style={{ minHeight: 'var(--demo-target-label-h)' }}
					className="text-xs text-muted-foreground mb-3 flex items-center gap-2"
				>
					<span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
					Localized ({example.targetName})
				</div>
				<div
					data-part="target-box"
					style={{ minHeight: 'var(--demo-target-box-h)' }}
					className="bg-[#1a1a2e] rounded-lg p-3 md:p-4"
				>
					<SegmentedText segments={example.target} hue="green" />
				</div>
			</div>
		</div>
	)
}
