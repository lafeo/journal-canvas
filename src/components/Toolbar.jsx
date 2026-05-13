import { useState } from 'react'
import useAppStore from '../store/useAppStore.js'

export default function Toolbar() {
  const { mode, setMode, graphData, folderPath, setFolderPath, setIsReady,
          apiKey, setApiKey, theme, setTheme } = useAppStore()
  const [showSettings, setShowSettings] = useState(false)
  const [keyDraft, setKeyDraft] = useState(apiKey || '')

  const stats = {
    docs:   graphData.documents.filter(d => d.processedAt).length,
    people: graphData.people.length,
    events: graphData.events.length,
    themes: graphData.themes.length,
  }

  async function handleSelectFolder() {
    const path = await window.api.selectFolder()
    if (path) { setFolderPath(path); setIsReady(true) }
  }

  async function handleSaveKey() {
    await window.api.setApiKey(keyDraft)
    setApiKey(keyDraft)
    setShowSettings(false)
  }

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="app-name">Journal Canvas</span>
        {folderPath && (
          <button className="btn-ghost folder-btn" onClick={handleSelectFolder} title={folderPath}>
            📂 {folderPath.split('/').pop()}
          </button>
        )}
      </div>

      <div className="toolbar-center">
        <div className="mode-toggle">
          <button className={`mode-btn ${mode === 'entity'   ? 'active' : ''}`} onClick={() => setMode('entity')}>
            World View
          </button>
          <button className={`mode-btn ${mode === 'document' ? 'active' : ''}`} onClick={() => setMode('document')}>
            Documents
          </button>
        </div>
      </div>

      <div className="toolbar-right">
        <div className="stats">
          <span className="stat"><span className="stat-dot person-dot" />{stats.people}</span>
          <span className="stat"><span className="stat-dot event-dot"  />{stats.events}</span>
          <span className="stat"><span className="stat-dot theme-dot"  />{stats.themes}</span>
          <span className="stat"><span className="stat-dot doc-dot"    />{stats.docs}</span>
        </div>

        <button
          className="theme-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        <button className="btn-ghost" onClick={() => window.api.reprocessAll()} title="Re-analyse all">↻</button>
        <button className="btn-ghost" onClick={() => setShowSettings(true)}>⚙</button>
      </div>

      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <h2>Settings</h2>
            <label>Anthropic API Key</label>
            <input
              type="password"
              className="input"
              value={keyDraft}
              onChange={e => setKeyDraft(e.target.value)}
              placeholder="sk-ant-..."
            />
            <p className="hint">Get your key at <strong>console.anthropic.com</strong></p>
            <div className="settings-actions">
              <button className="btn-ghost" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveKey}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
