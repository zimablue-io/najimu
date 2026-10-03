const fs = require('node:fs')
const path = require('node:path')

const distDir = path.join(__dirname, '..', 'dist-electron', 'electron')

// Rename main.js to main.cjs
const mainJs = path.join(distDir, 'main.js')
const mainCjs = path.join(distDir, 'main.cjs')
if (fs.existsSync(mainJs)) {
	fs.renameSync(mainJs, mainCjs)
	console.log('Renamed main.js -> main.cjs')
}

// Rename preload.js to preload.cjs
const preloadJs = path.join(distDir, 'preload.js')
const preloadCjs = path.join(distDir, 'preload.cjs')
if (fs.existsSync(preloadJs)) {
	fs.renameSync(preloadJs, preloadCjs)
	console.log('Renamed preload.js -> preload.cjs')
}

// Update main.cjs to reference preload.cjs instead of preload.js
const mainPath = path.join(distDir, 'main.cjs')
if (fs.existsSync(mainPath)) {
	let content = fs.readFileSync(mainPath, 'utf-8')
	content = content.replace(/preload\.js/g, 'preload.cjs')
	fs.writeFileSync(mainPath, content)
	console.log('Updated preload reference in main.cjs')
}
