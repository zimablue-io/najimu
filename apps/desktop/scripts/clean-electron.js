// Removes the electron build output before recompiling, so files from
// deleted or renamed sources cannot ship inside the packaged asar.
const fs = require('node:fs')
const path = require('node:path')

const distDir = path.join(__dirname, '..', 'dist-electron')

fs.rmSync(distDir, { recursive: true, force: true })
console.log('Cleaned dist-electron')
