const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Actions
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setApiKey: (key) => ipcRenderer.invoke('set-api-key', key),
  getGraphData: () => ipcRenderer.invoke('get-graph-data'),
  getFileContent: (filePath) => ipcRenderer.invoke('get-file-content', filePath),
  saveFileContent: (filePath, content) => ipcRenderer.invoke('save-file-content', filePath, content),
  createFile: () => ipcRenderer.invoke('create-file'),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  hideDocument: (filePath) => ipcRenderer.invoke('hide-document', filePath),
  unhideDocument: (filePath) => ipcRenderer.invoke('unhide-document', filePath),
  reprocessFile: (filePath) => ipcRenderer.invoke('reprocess-file', filePath),
  reprocessAll: () => ipcRenderer.invoke('reprocess-all'),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),

  // Events — return cleanup functions
  onGraphUpdated: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('graph-updated', handler)
    return () => ipcRenderer.removeListener('graph-updated', handler)
  },
  onProcessingStart: (cb) => {
    const handler = (_, fp) => cb(fp)
    ipcRenderer.on('processing-start', handler)
    return () => ipcRenderer.removeListener('processing-start', handler)
  },
  onProcessingDone: (cb) => {
    const handler = (_, fp) => cb(fp)
    ipcRenderer.on('processing-done', handler)
    return () => ipcRenderer.removeListener('processing-done', handler)
  },
  onProcessingError: (cb) => {
    const handler = (_, d) => cb(d)
    ipcRenderer.on('processing-error', handler)
    return () => ipcRenderer.removeListener('processing-error', handler)
  },
  onNotification: (cb) => {
    const handler = (_, msg) => cb(msg)
    ipcRenderer.on('notification', handler)
    return () => ipcRenderer.removeListener('notification', handler)
  },
})
