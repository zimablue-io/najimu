import { describe, expect, it } from 'vitest'
import { getFileExtension, getFilterForFormat, getMimeType, markdownToPlainText } from '../../src/lib/export'

describe('lib/export', () => {
	describe('getFileExtension', () => {
		it('returns .pdf for pdf format', () => {
			expect(getFileExtension('pdf')).toBe('.pdf')
		})

		it('returns .md for markdown format', () => {
			expect(getFileExtension('md')).toBe('.md')
		})

		// contentToDocx returns an OOXML package. Naming it .doc with the legacy
		// mime is what makes Word refuse to open the file.
		it('returns .docx for the Word format', () => {
			expect(getFileExtension('doc')).toBe('.docx')
		})
	})

	describe('getMimeType', () => {
		it('returns application/pdf for pdf format', () => {
			expect(getMimeType('pdf')).toBe('application/pdf')
		})

		it('returns text/markdown for markdown format', () => {
			expect(getMimeType('md')).toBe('text/markdown')
		})

		it('returns the OOXML mime for the Word format', () => {
			expect(getMimeType('doc')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
		})
	})

	describe('getFilterForFormat', () => {
		it('returns PDF filter for pdf format', () => {
			const filter = getFilterForFormat('pdf')
			expect(filter.name).toBe('PDF')
			expect(filter.extensions).toEqual(['pdf'])
		})

		it('returns Markdown filter for md format', () => {
			const filter = getFilterForFormat('md')
			expect(filter.name).toBe('Markdown')
			expect(filter.extensions).toEqual(['md'])
		})

		it('returns a docx filter for the Word format', () => {
			const filter = getFilterForFormat('doc')
			expect(filter.name).toBe('Word Document')
			expect(filter.extensions).toEqual(['docx'])
		})
	})

	describe('markdownToPlainText', () => {
		it('removes headers', () => {
			expect(markdownToPlainText('# Header 1\nSome text')).toContain('Header 1')
			expect(markdownToPlainText('## Header 2\nSome text')).toContain('Header 2')
			expect(markdownToPlainText('###### Header 6\nSome text')).toContain('Header 6')
		})

		it('removes bold formatting', () => {
			expect(markdownToPlainText('**bold text**')).toBe('bold text')
			expect(markdownToPlainText('__bold text__')).toBe('bold text')
		})

		it('removes italic formatting', () => {
			expect(markdownToPlainText('*italic text*')).toBe('italic text')
			expect(markdownToPlainText('_italic text_')).toBe('italic text')
		})

		it('removes inline code', () => {
			expect(markdownToPlainText('`inline code`')).toBe('inline code')
		})

		it('removes code blocks', () => {
			const input = 'Some text\n```\ncode block\n```\nMore text'
			expect(markdownToPlainText(input)).not.toContain('```')
		})

		it('extracts link text', () => {
			expect(markdownToPlainText('[Link Text](https://example.com)')).toBe('Link Text')
		})

		it('removes images', () => {
			const input = 'Some text ![Alt Text](image.png) more text'
			// Image URL should be removed
			expect(markdownToPlainText(input)).not.toContain('image.png')
			// Note: Alt text pattern not currently handled by the function
		})

		it('removes list bullets', () => {
			expect(markdownToPlainText('- Item 1')).toContain('Item 1')
			expect(markdownToPlainText('* Item 2')).toContain('Item 2')
			expect(markdownToPlainText('+ Item 3')).toContain('Item 3')
		})

		it('removes numbered list markers', () => {
			expect(markdownToPlainText('1. First item')).toContain('First item')
			expect(markdownToPlainText('10. Tenth item')).toContain('Tenth item')
		})

		it('removes blockquotes', () => {
			expect(markdownToPlainText('> Quoted text')).toContain('Quoted text')
		})

		it('collapses multiple newlines', () => {
			const input = 'Paragraph 1\n\n\n\n\nParagraph 2'
			const result = markdownToPlainText(input)
			const newlineCount = (result.match(/\n/g) || []).length
			expect(newlineCount).toBeLessThanOrEqual(2)
		})

		it('trims whitespace', () => {
			expect(markdownToPlainText('  \n\n  Text  \n  ')).toBe('Text')
		})

		it('handles mixed formatting', () => {
			const input = `# Title

This is **bold** and *italic* text.

- List item 1
- List item 2

[Link](https://example.com)

> Blockquote

\`\`\`js
console.log('code')
\`\`\`
`
			const result = markdownToPlainText(input)
			expect(result).toContain('Title')
			expect(result).toContain('bold')
			expect(result).toContain('italic')
			expect(result).toContain('List item 1')
			expect(result).toContain('Link')
			expect(result).toContain('Blockquote')
			expect(result).not.toContain('```')
		})

		it('preserves regular text unchanged', () => {
			expect(markdownToPlainText('Hello world')).toBe('Hello world')
			expect(markdownToPlainText('Plain text without formatting')).toBe('Plain text without formatting')
		})

		it('handles empty input', () => {
			expect(markdownToPlainText('')).toBe('')
			expect(markdownToPlainText('   ')).toBe('')
		})

		it('handles complex markdown structures', () => {
			const input = `# Main Title

## Subtitle

This is a paragraph with **bold**, *italic*, and \`code\` elements.

### List Section

- First item
- Second item
  - Nested item
- Third item

### Numbered List

1. Step one
2. Step two
3. Step three

### Links and Images

Check out [this link](https://example.com) and ![this image](image.jpg).

### Blockquote

> This is a blockquote
> spanning multiple lines

### Code Block

\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

Final paragraph.
`
			const result = markdownToPlainText(input)
			expect(result).toContain('Main Title')
			expect(result).toContain('Subtitle')
			expect(result).toContain('bold')
			expect(result).toContain('italic')
			expect(result).toContain('code')
			expect(result).toContain('First item')
			expect(result).toContain('Step one')
			expect(result).toContain('this link')
			expect(result).toContain('Blockquote')
			expect(result).not.toContain('#')
			expect(result).not.toContain('```')
		})
	})
})
