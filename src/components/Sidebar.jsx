import { useState } from 'react'
import useAppStore from '../store/useAppStore.js'

const TYPE_ICON = { journal: '📓', tasks: '✅', reflection: '🪞', note: '📝', other: '📄' }

export default function Sidebar() {
  const {
    graphData, processingFiles, fileErrors,
    setSelectedNode, selectedNode, activeTopic, setActiveTopic, setReaderNode,
  } = useAppStore()

  const [themesOpen, setThemesOpen]     = useState(true)
  const [conceptsOpen, setConceptsOpen] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null) // path of doc awaiting delete confirm

  const docs     = graphData.documents.slice().sort((a, b) => a.name.localeCompare(b.name))
  const themes   = (graphData.themes   || []).slice().sort((a, b) => (b.documents?.length || 0) - (a.documents?.length || 0))
  const concepts = (graphData.concepts || []).slice().sort((a, b) => (b.documents?.length || 0) - (a.documents?.length || 0))

  // Filter topics by currently selected node's documents
  const selectedDocIds = selectedNode
    ? new Set(selectedNode.type === 'document'
        ? [selectedNode.data.id]
        : (selectedNode.data.documents || []))
    : null

  const filteredThemes   = selectedDocIds ? themes.filter(t   => t.documents?.some(d => selectedDocIds.has(d)))   : themes
  const filteredConcepts = selectedDocIds ? concepts.filter(c => c.documents?.some(d => selectedDocIds.has(d))) : concepts
  const topicsFiltered   = !!selectedDocIds
  const topicsLabel      = topicsFiltered
    ? `Connected to ${selectedNode.data.name || selectedNode.data.title || 'node'}`
    : null

  function handleFileClick(doc) {
    setSelectedNode({ type: 'document', data: doc })
  }

  async function handleNewNote() {
    const filePath = await window.api.createFile()
    if (!filePath) return
    const name = filePath.split('/').pop().replace(/\.md$/, '')
    setReaderNode({ type: 'document', data: { name, path: filePath } })
  }

  async function handleReprocess(e, doc) {
    e.stopPropagation()
    if (doc.hidden) await window.api.unhideDocument(doc.path)
    else            await window.api.reprocessFile(doc.path)
  }

  async function handleOpen(e, doc) {
    e.stopPropagation()
    await window.api.openFile(doc.path)
  }

  async function handleHideToggle(e, doc) {
    e.stopPropagation()
    if (doc.hidden) await window.api.unhideDocument(doc.path)
    else            await window.api.hideDocument(doc.path)
  }

  function handleDeleteClick(e, doc) {
    e.stopPropagation()
    setConfirmDelete(doc.path)
  }

  async function handleDeleteConfirm(e, doc) {
    e.stopPropagation()
    setConfirmDelete(null)
    await window.api.deleteFile(doc.path)
  }

  function handleDeleteCancel(e) {
    e.stopPropagation()
    setConfirmDelete(null)
  }

  function toggleTopic(type, item) {
    const isActive = activeTopic?.id === item.id && activeTopic?.type === type
    setActiveTopic(isActive ? null : { type, id: item.id, name: item.name })
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Files</span>
        <span className="sidebar-count">{docs.filter(d => !d.hidden).length}</span>
        <button className="sidebar-new-btn" onClick={handleNewNote} title="New note">+</button>
      </div>

      <div className="sidebar-legend">
        <div className="legend-item"><span className="legend-dot" style={{ background: '#9B59B6' }} /> People</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#2ECC71' }} /> Places</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#8E44AD' }} /> Characters</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#E74C3C' }} /> Events</div>
      </div>

      <div className="file-list">
        {docs.map((doc) => {
          const isProcessing = processingFiles.has(doc.path)
          const hasError     = !!fileErrors[doc.path]
          const isDone       = !!doc.processedAt && !doc.hidden
          const isHidden     = !!doc.hidden
          const isConfirming = confirmDelete === doc.path

          return (
            <div
              key={doc.id}
              className={`file-item${hasError ? ' file-error' : ''}${isHidden ? ' file-hidden' : ''}`}
              onClick={() => !isConfirming && handleFileClick(doc)}
            >
              {/* Delete confirmation banner */}
              {isConfirming && (
                <div className="file-delete-confirm" onClick={e => e.stopPropagation()}>
                  <span className="file-delete-warn">
                    ⚠ Deletes from disk permanently
                  </span>
                  <div className="file-delete-actions">
                    <button className="file-delete-yes" onClick={(e) => handleDeleteConfirm(e, doc)}>Delete</button>
                    <button className="file-delete-no"  onClick={handleDeleteCancel}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="file-item-top">
                <span className="file-icon">{TYPE_ICON[doc.documentType] || '📄'}</span>
                <span className="file-name">{doc.name}</span>
                <span className="file-status">
                  {isProcessing && <span className="spinner" title="Analysing…" />}
                  {!isProcessing && isHidden  && <span className="status-dot hidden-dot" title="Hidden from graph" />}
                  {!isProcessing && isDone    && <span className="status-dot done" />}
                  {!isProcessing && !isDone && !isHidden && <span className="status-dot pending" />}
                  {hasError && <span className="status-dot error" title={fileErrors[doc.path]} />}
                </span>
              </div>

              {isDone && !isHidden && (
                <div className="file-chips">
                  {(doc.people || []).slice(0, 2).map((p) => (
                    <span key={p} className="chip chip-person">{p}</span>
                  ))}
                  {(doc.themes || []).slice(0, 1).map((t) => (
                    <span key={t} className="chip chip-theme">{t}</span>
                  ))}
                </div>
              )}

              {isHidden && (
                <div className="file-hidden-label">hidden from graph</div>
              )}

              <div className="file-actions">
                <button
                  className="file-action-btn"
                  onClick={(e) => handleOpen(e, doc)}
                  title="Open in Pages"
                >↗</button>
                <button
                  className={`file-action-btn${isHidden ? ' active' : ''}`}
                  onClick={(e) => handleHideToggle(e, doc)}
                  title={isHidden ? 'Restore to graph' : 'Hide from graph'}
                >◌</button>
                <button
                  className="file-action-btn"
                  onClick={(e) => handleReprocess(e, doc)}
                  title={isHidden ? 'Restore & re-analyse' : 'Re-analyse'}
                >↻</button>
                <button
                  className="file-action-btn file-action-delete"
                  onClick={(e) => handleDeleteClick(e, doc)}
                  title="Delete file"
                >🗑</button>
              </div>
            </div>
          )
        })}

        {docs.filter(d => !d.hidden).length === 0 && docs.length === 0 && (
          <div className="empty-state">
            No .txt or .md files found.<br />
            Add files or press + to create one.
          </div>
        )}
      </div>

      {/* Themes & Concepts panel */}
      {(themes.length > 0 || concepts.length > 0) && (
        <div className="topics-section">
          {topicsLabel && (
            <div className="topics-filter-label">{topicsLabel}</div>
          )}

          {themes.length > 0 && (
            <>
              <button className="topics-section-header" onClick={() => setThemesOpen(o => !o)}>
                <span className="topics-section-title">Themes</span>
                <span className="topics-section-count">
                  {topicsFiltered ? `${filteredThemes.length}/${themes.length}` : themes.length}
                </span>
                <span className="topics-collapse">{themesOpen ? '▾' : '▸'}</span>
              </button>
              {themesOpen && (
                <div className="topics-list">
                  {filteredThemes.length === 0 && topicsFiltered
                    ? <span className="topics-empty">No themes connected</span>
                    : filteredThemes.map(t => (
                        <button
                          key={t.id}
                          className={`topic-item${activeTopic?.id === t.id && activeTopic?.type === 'theme' ? ' active' : ''}`}
                          onClick={() => toggleTopic('theme', t)}
                        >
                          <span className="topic-icon topic-icon-theme">✦</span>
                          <span className="topic-name">{t.name}</span>
                          <span className="topic-count">{t.documents?.length || 0}</span>
                        </button>
                      ))
                  }
                </div>
              )}
            </>
          )}

          {concepts.length > 0 && (
            <>
              <button className="topics-section-header" onClick={() => setConceptsOpen(o => !o)}>
                <span className="topics-section-title">Concepts</span>
                <span className="topics-section-count">
                  {topicsFiltered ? `${filteredConcepts.length}/${concepts.length}` : concepts.length}
                </span>
                <span className="topics-collapse">{conceptsOpen ? '▾' : '▸'}</span>
              </button>
              {conceptsOpen && (
                <div className="topics-list">
                  {filteredConcepts.length === 0 && topicsFiltered
                    ? <span className="topics-empty">No concepts connected</span>
                    : filteredConcepts.map(c => (
                        <button
                          key={c.id}
                          className={`topic-item${activeTopic?.id === c.id && activeTopic?.type === 'concept' ? ' active' : ''}`}
                          onClick={() => toggleTopic('concept', c)}
                        >
                          <span className="topic-icon topic-icon-concept">◈</span>
                          <span className="topic-name">{c.name}</span>
                          <span className="topic-count">{c.documents?.length || 0}</span>
                        </button>
                      ))
                  }
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
