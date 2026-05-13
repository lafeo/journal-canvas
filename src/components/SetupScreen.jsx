import { useState } from 'react'
import useAppStore from '../store/useAppStore.js'

export default function SetupScreen() {
  const { apiKey, setApiKey, setFolderPath, setIsReady } = useAppStore()
  const [step, setStep] = useState(apiKey ? 'folder' : 'key')
  const [keyDraft, setKeyDraft] = useState(apiKey || '')
  const [saving, setSaving] = useState(false)

  async function handleSaveKey() {
    if (!keyDraft.trim()) return
    setSaving(true)
    await window.api.setApiKey(keyDraft.trim())
    setApiKey(keyDraft.trim())
    setSaving(false)
    setStep('folder')
  }

  async function handleSelectFolder() {
    const path = await window.api.selectFolder()
    if (path) {
      setFolderPath(path)
      setIsReady(true)
    }
  }

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-logo">✦</div>
        <h1 className="setup-title">Journal Canvas</h1>
        <p className="setup-subtitle">
          AI-powered canvas for understanding your stories, people, and progress.
        </p>

        {step === 'key' && (
          <div className="setup-step">
            <h2>1. Add your Anthropic API key</h2>
            <p className="setup-hint">
              Get a free key at <strong>console.anthropic.com</strong> — used to extract people,
              events, themes, and connections from your journals.
            </p>
            <input
              type="password"
              className="input"
              placeholder="sk-ant-..."
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
              autoFocus
            />
            <button
              className="btn-primary"
              onClick={handleSaveKey}
              disabled={!keyDraft.trim() || saving}
            >
              {saving ? 'Saving…' : 'Continue →'}
            </button>
          </div>
        )}

        {step === 'folder' && (
          <div className="setup-step">
            <h2>2. Choose your journal folder</h2>
            <p className="setup-hint">
              Select the folder containing your .txt or .md exports of Pages documents.
              The app watches for new files automatically.
            </p>
            <button className="btn-primary" onClick={handleSelectFolder}>
              📂 Select folder
            </button>
            <button className="btn-ghost setup-back" onClick={() => setStep('key')}>
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
