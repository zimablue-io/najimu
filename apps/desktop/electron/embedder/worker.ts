/**
 * Embedding worker.
 *
 * Runs EmbeddingGemma 2 in a worker thread so ONNX inference never blocks the
 * main process event loop. Only the text encoder is loaded; the vision and
 * audio encoders are disabled because this app embeds text only.
 */
import { parentPort, workerData } from 'node:worker_threads'
import { AutoConfig, AutoModel, AutoTokenizer, env } from '@huggingface/transformers'

const MODEL_ID = 'onnx-community/embeddinggemma-2-ONNX'

interface WorkerConfig {
	cacheDir: string
}

interface EmbedRequest {
	id: number
	texts: string[]
}

/**
 * Reads the configuration the main process passes at spawn time.
 * Validated because a malformed payload would otherwise surface as an
 * unrelated failure deep inside the model loader.
 */
function readConfig(): WorkerConfig {
	const { cacheDir } = workerData as WorkerConfig
	if (typeof cacheDir !== 'string') {
		throw new Error('embedder worker requires a cacheDir string')
	}
	return { cacheDir }
}

// Cache under the app's userData so the model downloads once and works offline.
env.cacheDir = readConfig().cacheDir

let modelPromise: Promise<Awaited<ReturnType<typeof AutoModel.from_pretrained>>> | null = null
let tokenizerPromise: Promise<Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>> | null = null

function loadModel() {
	if (!modelPromise) {
		modelPromise = (async () => {
			// EmbeddingGemma 2 is multimodal, but this app only needs the text
			// tower. The upstream config type does not model the modality
			// sub-configs, so they are cleared by key rather than by property.
			const config = await AutoConfig.from_pretrained(MODEL_ID)
			Reflect.set(config, 'vision_config', null)
			Reflect.set(config, 'audio_config', null)

			return AutoModel.from_pretrained(MODEL_ID, { config, dtype: 'q8' })
		})()
	}
	return modelPromise
}

function loadTokenizer() {
	if (!tokenizerPromise) {
		tokenizerPromise = AutoTokenizer.from_pretrained(MODEL_ID)
	}
	return tokenizerPromise
}

/**
 * Embeds texts into 768-dimension vectors.
 * The model mean-pools and L2-normalizes, so the output is ready for cosine.
 */
async function embed(texts: string[]): Promise<number[][]> {
	const [model, tokenizer] = await Promise.all([loadModel(), loadTokenizer()])
	const inputs = tokenizer(texts, { padding: true, truncation: true })
	const output = await model(inputs)

	const tensor = output.sentence_embedding
	const width = tensor.dims[tensor.dims.length - 1]
	const values: number[] = Array.from(tensor.data as ArrayLike<number>)

	const vectors: number[][] = []
	for (let start = 0; start < values.length; start += width) {
		vectors.push(values.slice(start, start + width))
	}
	return vectors
}

if (!parentPort) {
	throw new Error('embedder worker must run as a worker thread')
}

const port = parentPort

port.on('message', (request: EmbedRequest) => {
	void embed(request.texts).then(
		(vectors) => port.postMessage({ id: request.id, vectors }),
		(cause: unknown) => {
			const error = cause instanceof Error ? cause.message : String(cause)
			port.postMessage({ id: request.id, error })
		}
	)
})
