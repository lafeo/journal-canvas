import { create } from 'zustand'

const useAppStore = create((set, get) => ({
  // Setup state
  apiKey: '',
  folderPath: null,
  isReady: false,

  // Graph data from main process
  graphData: { documents: [], people: [], events: [], places: [], themes: [], todos: [] },

  // UI state
  mode: 'entity',
  selectedNode: null,
  activeTopic: null,
  focusedNodeId: null,
  readerNode: null,
  theme: typeof window !== 'undefined' ? (localStorage.getItem('jc-theme') || 'dark') : 'dark',
  processingFiles: new Set(),
  fileErrors: {},
  notification: null,

  setApiKey: (k) => set({ apiKey: k }),
  setFolderPath: (p) => set({ folderPath: p }),
  setIsReady: (v) => set({ isReady: v }),
  setGraphData: (data) => set({ graphData: data }),
  setMode: (m) => set({ mode: m, selectedNode: null, activeTopic: null, focusedNodeId: null }),
  setSelectedNode: (n) => set({ selectedNode: n }),
  setActiveTopic: (t) => set({ activeTopic: t }),
  setFocusedNodeId: (id) => set({ focusedNodeId: id }),
  setReaderNode: (n) => set({ readerNode: n }),
  setTheme: (t) => {
    localStorage.setItem('jc-theme', t)
    document.documentElement.setAttribute('data-theme', t)
    set({ theme: t })
  },

  setProcessing: (fp, active) => set((s) => {
    const next = new Set(s.processingFiles)
    active ? next.add(fp) : next.delete(fp)
    return { processingFiles: next }
  }),

  setFileError: (fp, msg) => set((s) => ({
    fileErrors: { ...s.fileErrors, [fp]: msg },
  })),

  clearFileError: (fp) => set((s) => {
    const next = { ...s.fileErrors }
    delete next[fp]
    return { fileErrors: next }
  }),

  showNotification: (msg) => {
    set({ notification: msg })
    setTimeout(() => set((s) => s.notification === msg ? { notification: null } : {}), 4000)
  },
}))

export default useAppStore
