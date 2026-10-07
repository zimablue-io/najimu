import { convertMarkdownToDocx } from '@mohtasham/md-to-docx'
import { jsPDF } from 'jspdf'

export type ExportFormat = 'md' | 'pdf' | 'doc'

export interface ExportOptions {
	format: ExportFormat
	content: string
	defaultFilename: string
}

/**
 * One row per format. The extension, mime and dialog name each existed in three
 * separate switches, which is how the Word format ended up writing an OOXML
 * package under a `.doc` extension with the legacy `application/msword` mime,
 * a combination Word refuses to open.
 */
const FORMATS: Record<ExportFormat, { extension: string; mime: string; name: string }> = {
	md: { extension: '.md', mime: 'text/markdown', name: 'Markdown' },
	pdf: { extension: '.pdf', mime: 'application/pdf', name: 'PDF' },
	doc: {
		extension: '.docx',
		mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		name: 'Word Document',
	},
}

export function getFileExtension(format: ExportFormat): string {
	return FORMATS[format].extension
}

export function getMimeType(format: ExportFormat): string {
	return FORMATS[format].mime
}

export function getFilterForFormat(format: ExportFormat): { name: string; extensions: string[] } {
	const { extension, name } = FORMATS[format]
	return { name, extensions: [extension.replace(/^\./, '')] }
}

export function markdownToPlainText(markdown: string): string {
	// Remove common markdown formatting
	return markdown
		.replace(/#{1,6}\s+/g, '') // Headers
		.replace(/\*\*(.+?)\*\*/g, '$1') // Bold
		.replace(/\*(.+?)\*/g, '$1') // Italic
		.replace(/__(.+?)__/g, '$1') // Bold (alt)
		.replace(/_(.+?)_/g, '$1') // Italic (alt)
		.replace(/`(.+?)`/g, '$1') // Inline code
		.replace(/```[\s\S]*?```/g, '') // Code blocks
		.replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
		.replace(/!\[.*?\]\(.+?\)/g, '') // Images
		.replace(/^\s*[-*+]\s+/gm, '') // List bullets
		.replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
		.replace(/^\s*>\s+/gm, '') // Blockquotes
		.replace(/\n{3,}/g, '\n\n') // Multiple newlines
		.trim()
}

export function contentToPdf(content: string, filename: string): Blob {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const margin = 20
	const maxWidth = pageWidth - margin * 2
	const lineHeight = 7

	// Add title
	doc.setFontSize(16)
	doc.setFont('helvetica', 'bold')
	const title = filename.replace(/\.(md|txt)$/i, '')
	doc.text(title, margin, margin + 10)

	// Add timestamp
	doc.setFontSize(10)
	doc.setFont('helvetica', 'normal')
	doc.setTextColor(128)
	doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, margin + 18)
	doc.setTextColor(0)

	// Add separator line
	doc.setDrawColor(200)
	doc.line(margin, margin + 24, pageWidth - margin, margin + 24)

	// Add content
	doc.setFontSize(11)
	const plainText = markdownToPlainText(content)
	const lines = doc.splitTextToSize(plainText, maxWidth)

	let yPosition = margin + 35
	let pageNumber = 1

	for (const line of lines) {
		if (yPosition + lineHeight > pageHeight - margin) {
			// Add page number before new page
			doc.setFontSize(9)
			doc.setTextColor(128)
			doc.text(`Page ${pageNumber}`, pageWidth - margin - 15, pageHeight - 10)
			doc.setTextColor(0)
			doc.setFontSize(11)

			doc.addPage()
			yPosition = margin
			pageNumber++
		}
		doc.text(line, margin, yPosition)
		yPosition += lineHeight
	}

	// Add final page number
	doc.setFontSize(9)
	doc.setTextColor(128)
	doc.text(`Page ${pageNumber}`, pageWidth - margin - 15, pageHeight - 10)

	return doc.output('blob')
}

export async function contentToDocx(content: string): Promise<Blob> {
	return convertMarkdownToDocx(content)
}
