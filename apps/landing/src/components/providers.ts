import type { Platform } from '../hooks/usePlatform'

export type ProviderStep = {
	title: string
	command?: string | null
	description: string
	platforms?: Platform[]
}

export interface Provider {
	id: string
	name: string
	installUrl: string
	defaultPort: string
	defaultApiUrl: string
	steps: ProviderStep[]
}

export const providers: Provider[] = [
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
