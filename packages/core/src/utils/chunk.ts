/**
 * Split markdown text into paragraphs (blocks separated by double newlines).
 * Each block is considered atomic - we never split mid-paragraph.
 */
function splitIntoParagraphs(text: string): string[] {
	// Split on double newlines (or more) to get paragraphs
	// Keep the separators as part of the content for reconstruction
	const paragraphs: string[] = []
	let current = ''

	for (const line of text.split('\n')) {
		if (line.trim() === '' && current.trim() !== '') {
			// Empty line signals end of current paragraph
			paragraphs.push(current.trim())
			current = ''
		} else if (line.trim() !== '') {
			// Non-empty line - add to current paragraph
			if (current) {
				current += `\n${line}`
			} else {
				current = line
			}
		}
		// Skip multiple consecutive empty lines
	}

	// Don't forget the last paragraph
	if (current.trim()) {
		paragraphs.push(current.trim())
	}

	return paragraphs
}

/**
 * Markdown-aware text chunking that preserves paragraph structure.
 * Never splits in the middle of a paragraph.
 */
export function chunkText(text: string, maxChunkSize: number, overlapSize: number): string[] {
	const paragraphs = splitIntoParagraphs(text)
	if (paragraphs.length === 0) return []

	const chunks: string[] = []
	let currentChunk = ''
	let currentSize = 0
	let paragraphIndex = 0

	while (paragraphIndex < paragraphs.length) {
		const paragraph = paragraphs[paragraphIndex]
		const paragraphSize = paragraph.length

		// If single paragraph exceeds max, we have to process it as-is
		// (this shouldn't happen often with reasonable maxChunkSize)
		if (paragraphSize > maxChunkSize) {
			// Finish current chunk if non-empty
			if (currentChunk.trim()) {
				chunks.push(currentChunk.trim())
			}
			chunks.push(paragraph)
			currentChunk = ''
			currentSize = 0
			paragraphIndex++
			continue
		}

		// Check if adding this paragraph would exceed limit
		const separator = currentChunk.trim() ? '\n\n' : ''
		const newSize = currentSize + separator.length + paragraphSize

		if (newSize <= maxChunkSize) {
			// Add to current chunk
			currentChunk = currentChunk.trim() ? currentChunk + separator + paragraph : paragraph
			currentSize = newSize
			paragraphIndex++
		} else {
			// Current chunk is full
			if (currentChunk.trim()) {
				chunks.push(currentChunk.trim())
			}

			// Start new chunk with overlap (previous paragraphs)
			if (overlapSize > 0 && paragraphIndex > 0) {
				const overlapParagraphs: string[] = []
				let overlapTotal = 0
				let i = paragraphIndex - 1

				// Go backwards to collect overlapping paragraphs
				while (i >= 0 && overlapTotal < overlapSize) {
					const p = paragraphs[i]
					if (overlapTotal + p.length + (overlapParagraphs.length > 0 ? 2 : 0) <= overlapSize) {
						overlapParagraphs.unshift(p)
						overlapTotal += p.length + (overlapParagraphs.length > 1 ? 2 : 0)
						i--
					} else {
						break
					}
				}

				currentChunk = overlapParagraphs.join('\n\n')
				currentSize = currentChunk.length
			} else {
				currentChunk = ''
				currentSize = 0
			}
		}
	}

	// Don't forget the last chunk
	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim())
	}

	return chunks
}
