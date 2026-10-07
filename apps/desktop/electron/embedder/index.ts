/**
 * Embedding service.
 *
 * Owns a single embedder worker so every caller shares one loaded model and
 * the main process never runs ONNX inference on its own thread.
 */

import path from 'node:path'
import { Worker } from 'node:worker_threads'
import { app } from 'electron'

const EMBED_BATCH_SIZE = 32

interface PendingRequest {
	resolve: (vectors: number[][]) => void
	reject: (error: Error) => void
}

let worker: Worker | null = null
let nextRequestId = 1
const pending = new Map<number, PendingRequest>()

/**
 * Resolves the worker script.
 *
 * This module compiles to dist-electron/embedder/index.js, so the worker
 * is a sibling of it, not a child. Kept separate so the layout is testable.
 */
export function workerScriptPath(moduleDir: string): string {
	return path.join(moduleDir, 'worker.js')
}

function getWorker(): Worker {
	if (worker) return worker

	worker = new Worker(workerScriptPath(__dirname), {
		workerData: { cacheDir: path.join(app.getPath('userData'), 'models') },
	})

	worker.on('message', (message: { id: number; vectors?: number[][]; error?: string }) => {
		const request = pending.get(message.id)
		if (!request) return
		pending.delete(message.id)

		if (message.error) {
			request.reject(new Error(message.error))
			return
		}
		request.resolve(message.vectors ?? [])
	})

	worker.on('error', (error) => {
		failAll(error)
		stopWorker()
	})

	worker.on('exit', (code) => {
		worker = null
		// An exit without a preceding error event would otherwise leave
		// every caller waiting forever.
		failAll(new Error(`Embedder worker exited with code ${code}`))
	})

	return worker
}

function failAll(error: Error): void {
	for (const request of pending.values()) {
		request.reject(error)
	}
	pending.clear()
}

function stopWorker(): void {
	if (!worker) return
	worker.removeAllListeners()
	void worker.terminate()
	worker = null
}

function embedBatch(texts: string[]): Promise<number[][]> {
	if (texts.length === 0) return Promise.resolve([])

	const activeWorker = getWorker()
	const id = nextRequestId++

	return new Promise<number[][]>((resolve, reject) => {
		pending.set(id, { resolve, reject })
		activeWorker.postMessage({ id, texts })
	})
}

/**
 * Embeds texts, batching to bound worker memory.
 */
export async function embed(texts: string[]): Promise<number[][]> {
	const batches: string[][] = []
	for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
		batches.push(texts.slice(i, i + EMBED_BATCH_SIZE))
	}

	const results = await Promise.all(batches.map(embedBatch))
	return results.flat()
}

/**
 * Releases the worker and its loaded model. Called on app quit.
 */
export function shutdownEmbedder(): void {
	failAll(new Error('Embedder shut down'))
	stopWorker()
}

export function registerEmbedderShutdown(): void {
	app.on('will-quit', shutdownEmbedder)
}
