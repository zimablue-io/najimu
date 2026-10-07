import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@najimu/ui/index.css'

// Debug logging
console.log('[App] Starting application...')
console.log('[App] Root element:', document.getElementById('root'))

class DebugBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
	constructor(props: { children: React.ReactNode }) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error) {
		console.error('[DebugBoundary] Caught error:', error)
		return { hasError: true, error }
	}

	render() {
		console.log('[DebugBoundary] Render, hasError:', this.state.hasError)
		if (this.state.hasError) {
			return React.createElement(
				'div',
				{
					style: {
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						height: '100vh',
						backgroundColor: '#000',
						color: '#fff',
					},
				},
				React.createElement(
					'div',
					{ style: { textAlign: 'center', padding: '32px' } },
					React.createElement(
						'h1',
						{ style: { fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' } },
						'Error'
					),
					React.createElement(
						'p',
						{ style: { color: '#999', marginBottom: '16px' } },
						this.state.error?.message || 'Unknown error'
					)
				)
			)
		}
		return this.props.children
	}
}

const root = document.getElementById('root')
console.log('[App] Creating root')
ReactDOM.createRoot(root!).render(
	React.createElement(React.StrictMode, null, React.createElement(DebugBoundary, null, React.createElement(App)))
)
console.log('[App] React rendered')
