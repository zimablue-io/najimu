import { Briefcase, LayoutGrid, ListChecks, Menu, Server, Swords, X } from 'lucide-react'
import { useState } from 'react'
import { useActiveSection } from '../hooks/useActiveSection'

const navItems = [
	{ id: 'features', icon: LayoutGrid, label: 'Features' },
	{ id: 'use-cases', icon: Briefcase, label: 'Use Cases' },
	{ id: 'how-it-works', icon: ListChecks, label: 'How It Works' },
	{ id: 'vs-competitors', icon: Swords, label: 'Compare' },
	{ id: 'setup', icon: Server, label: 'Setup' },
]

const sectionIds = navItems.map((item) => item.id)

export default function Navigation() {
	const [isOpen, setIsOpen] = useState(false)
	const activeSection = useActiveSection(sectionIds)

	const scrollToSection = (id: string) => {
		const el = document.getElementById(id)
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' })
			setIsOpen(false)
		}
	}

	return (
		<>
			{/* Desktop Navigation */}
			<nav className="fixed left-4 top-1/2 -translate-y-1/2 flex-col gap-3 z-50 hidden md:flex">
				{navItems.map((item) => {
					const isActive = activeSection === item.id
					const Icon = item.icon

					return (
						<button
							key={item.id}
							onClick={() => scrollToSection(item.id)}
							className="group relative flex items-center h-10 rounded-full overflow-hidden transition-all duration-300 shadow-md border border-border bg-card w-10 hover:w-auto"
							title={item.label}
						>
							<div className="flex-shrink-0 pl-[10px]">
								<Icon
									className={`w-4 h-4 transition-colors ${isActive ? 'text-primary' : 'group-hover:text-primary'}`}
								/>
							</div>
							<span
								className={`pl-2 pr-4 text-sm font-medium whitespace-nowrap transition-opacity duration-200
							${isActive ? 'text-primary' : 'text-foreground'}
							opacity-0 group-hover:opacity-100`}
							>
								{item.label}
							</span>
						</button>
					)
				})}
			</nav>

			{/* Mobile Hamburger Menu */}
			<div className="fixed top-4 right-4 z-50 md:hidden">
				<button
					onClick={() => setIsOpen(!isOpen)}
					className="w-10 h-10 rounded-lg bg-card border border-border shadow-md flex items-center justify-center hover:bg-secondary transition-colors"
					aria-label="Toggle menu"
				>
					{isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
				</button>

				{isOpen && (
					<div className="absolute top-12 right-0 w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
						{navItems.map((item) => {
							const isActive = activeSection === item.id
							const Icon = item.icon

							return (
								<button
									key={item.id}
									onClick={() => scrollToSection(item.id)}
									className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
										isActive ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-secondary'
									}`}
								>
									<Icon className="w-4 h-4" />
									{item.label}
								</button>
							)
						})}
					</div>
				)}
			</div>
		</>
	)
}
