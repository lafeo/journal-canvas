import { useEffect } from 'react'
import useAppStore from './store/useAppStore.js'
import SetupScreen from './components/SetupScreen.jsx'
import Toolbar from './components/Toolbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import Canvas from './components/Canvas.jsx'
import DetailPanel from './components/DetailPanel.jsx'
import ReaderPanel from './components/ReaderPanel.jsx'

export default function App() {
  const {
    isReady, setIsReady, setFolderPath, setApiKey,
    setGraphData, setProcessing, setFileError, clearFileError,
    showNotification, notification, selectedNode, readerNode, theme,
  } = useAppStore()

  // Apply persisted theme on first render
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [])

  // Bootstrap: load settings + graph data on mount
  useEffect(() => {
    async function init() {
      const settings = await window.api.getSettings()
      if (settings.apiKey) setApiKey(settings.apiKey)
      if (settings.folderPath) {
        setFolderPath(settings.folderPath)
        setIsReady(true)
      }
      const data = await window.api.getGraphData()
      setGraphData(data)
    }
    init()
  }, [])

  // Subscribe to main-process events
  useEffect(() => {
    const unsubs = [
      window.api.onGraphUpdated((data) => setGraphData(data)),
      window.api.onProcessingStart((fp) => { setProcessing(fp, true); clearFileError(fp) }),
      window.api.onProcessingDone((fp) => setProcessing(fp, false)),
      window.api.onProcessingError(({ path, error }) => {
        setProcessing(path, false)
        setFileError(path, error)
        showNotification(`Error analysing ${path.split('/').pop()}`)
      }),
      window.api.onNotification((msg) => showNotification(msg)),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  if (!isReady) return <SetupScreen />

  return (
    <div className="app">
      <Toolbar />
      <div className="main-layout">
        <Sidebar />
        <div className="canvas-area">
          <Canvas />
        </div>
        {selectedNode && <DetailPanel />}
        {readerNode   && <ReaderPanel />}
      </div>

      {notification && (
        <div className="notification">{notification}</div>
      )}
    </div>
  )
}
