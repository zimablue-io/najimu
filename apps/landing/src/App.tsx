import { useState } from 'react'
import Features from './components/Features'
import Footer from './components/Footer'
import Hero from './components/hero/Hero'
import Navigation from './components/Navigation'
import SetupGuide from './components/SetupGuide'
import StepViewer from './components/StepViewer'
import UseCases from './components/UseCases'
import VsCompetitors from './components/VsCompetitors'
import { Platform } from './hooks/usePlatform'

export default function App() {
	const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)

	return (
		<div className="min-h-screen flex flex-col">
			<Navigation />
			<Hero selectedPlatform={selectedPlatform} onPlatformChange={setSelectedPlatform} />
			<div id="features">
				<Features />
			</div>
			<div id="use-cases">
				<UseCases />
			</div>
			<div id="how-it-works">
				<StepViewer />
			</div>
			<div id="vs-competitors">
				<VsCompetitors />
			</div>
			<div id="setup">
				<SetupGuide selectedPlatform={selectedPlatform} />
			</div>
			<Footer />
		</div>
	)
}
