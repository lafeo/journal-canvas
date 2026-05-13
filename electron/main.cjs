const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const isDev = !app.isPackaged
let mainWindow = null
let fileWatcher = null

// ── Window ──────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#090909',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// ── Startup ──────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  const store = require('./store.cjs')
  store.initStore(app.getPath('userData'))

  createWindow()
  registerIpc(store)

  const settings = store.getSettings()
  if (settings.folderPath && fs.existsSync(settings.folderPath)) {
    startWatcher(settings.folderPath, store)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC ──────────────────────────────────────────────────────────────────────

function registerIpc(store) {
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select your journal folder',
    })
    if (result.canceled || !result.filePaths.length) return null
    const folderPath = result.filePaths[0]
    store.clearData()                    // wipe graph when switching folders
    emit('graph-updated', store.getGraphData())
    store.setSettings({ folderPath })
    startWatcher(folderPath, store)
    return folderPath
  })

  ipcMain.handle('get-settings', () => store.getSettings())

  ipcMain.handle('set-api-key', (_, key) => {
    store.setSettings({ apiKey: key })
    return true
  })

  ipcMain.handle('get-graph-data', () => store.getGraphData())

  ipcMain.handle('get-file-content', (_, filePath) => {
    try { return fs.readFileSync(filePath, 'utf8') } catch { return null }
  })

  ipcMain.handle('reprocess-file', async (_, filePath) => {
    const s = store.getSettings()
    if (!s.apiKey) return notify('Set your API key in settings first.')
    await processFile(filePath, store, s.apiKey, true)
  })

  ipcMain.handle('reprocess-all', async () => {
    const s = store.getSettings()
    if (!s.apiKey) return notify('Set your API key in settings first.')
    if (!s.folderPath) return
    const files = getTextFiles(s.folderPath)
    for (const f of files) await processFile(f, store, s.apiKey, true)
  })

  ipcMain.handle('open-file', (_, filePath) => shell.openPath(filePath))

  ipcMain.handle('delete-file', async (_, filePath) => {
    try { fs.unlinkSync(filePath) } catch { /* already gone */ }
    store.removeDocument(filePath)
    emit('graph-updated', store.getGraphData())
  })

  ipcMain.handle('hide-document', (_, filePath) => {
    store.hideDocument(filePath)
    emit('graph-updated', store.getGraphData())
  })

  ipcMain.handle('unhide-document', async (_, filePath) => {
    store.unhideDocument(filePath)
    const s = store.getSettings()
    if (s.apiKey) await processFile(filePath, store, s.apiKey, true)
    else emit('graph-updated', store.getGraphData())
  })

  ipcMain.handle('save-file-content', (_, filePath, content) => {
    fs.writeFileSync(filePath, content, 'utf8')
    return true
  })

  ipcMain.handle('create-file', async () => {
    const s = store.getSettings()
    if (!s.folderPath) return null
    const name     = `note-${new Date().toISOString().slice(0, 10)}-${Date.now()}.md`
    const filePath = path.join(s.folderPath, name)
    fs.writeFileSync(filePath, '# New Note\n\n', 'utf8')
    return filePath
  })
}

// ── File watcher ─────────────────────────────────────────────────────────────

function startWatcher(folderPath, store) {
  if (fileWatcher) { fileWatcher.close(); fileWatcher = null }
  const { createWatcher } = require('./watcher.cjs')
  fileWatcher = createWatcher(folderPath, async (eventType, filePath) => {
    const settings = store.getSettings()
    if (!settings.apiKey) {
      if (eventType !== 'unlink') {
        emit('graph-updated', store.getGraphData())
        notify('Add your Anthropic API key in settings to start analysing files.')
      }
      return
    }
    if (eventType === 'unlink') {
      store.removeDocument(filePath)
      emit('graph-updated', store.getGraphData())
    } else {
      await processFile(filePath, store, settings.apiKey, false)
    }
  })
}

// ── File processing ───────────────────────────────────────────────────────────

async function processFile(filePath, store, apiKey, force) {
  let content
  try { content = fs.readFileSync(filePath, 'utf8') } catch { return }

  const hash     = crypto.createHash('md5').update(content).digest('hex')
  const existing = store.getDocumentByPath(filePath)

  if (existing?.hidden) return   // never reprocess hidden docs

  if (!force && existing && existing.contentHash === hash && existing.processedAt) {
    emit('graph-updated', store.getGraphData())
    return
  }

  emit('processing-start', filePath)

  try {
    const { analyzeDocument } = require('./claude.cjs')
    const existing = store.getGraphData()
    const existingEntities = {
      people:     existing.people.map(p => p.name),
      places:     existing.places.map(p => p.name),
      themes:     existing.themes.map(t => t.name),
      concepts:   existing.concepts.map(c => c.name),
      characters: existing.characters.map(c => c.name),
    }
    const analysis = await analyzeDocument(content, path.basename(filePath), apiKey, existingEntities)
    store.storeAnalysis(filePath, content, hash, analysis)
    emit('processing-done', filePath)
    emit('graph-updated', store.getGraphData())
  } catch (err) {
    console.error('Processing error:', err.message)
    emit('processing-error', { path: filePath, error: err.message })
    notify(`Error analysing ${path.basename(filePath)}: ${err.message}`)
  }
}

function getTextFiles(folderPath) {
  const exts = new Set(['.txt', '.md', '.markdown'])
  const results = []
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (exts.has(path.extname(entry.name).toLowerCase())) results.push(full)
    }
  }
  walk(folderPath)
  return results
}

function emit(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, data)
}

function notify(msg) { emit('notification', msg) }
