const chokidar = require('chokidar')
const path = require('path')

const TEXT_EXTS = new Set(['.txt', '.md', '.markdown'])

function isTextFile(filePath) {
  return TEXT_EXTS.has(path.extname(filePath).toLowerCase())
}

function createWatcher(folderPath, callback) {
  const watcher = chokidar.watch(folderPath, {
    ignored: /(^|[/\\])\../,
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 100 },
  })

  watcher
    .on('add', (fp) => { if (isTextFile(fp)) callback('add', fp) })
    .on('change', (fp) => { if (isTextFile(fp)) callback('change', fp) })
    .on('unlink', (fp) => { if (isTextFile(fp)) callback('unlink', fp) })
    .on('error', (err) => console.error('Watcher error:', err))

  return watcher
}

module.exports = { createWatcher }
