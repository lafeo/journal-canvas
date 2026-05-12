import { useEffect, useMemo, useState } from 'react'
import useAppStore from '../store/useAppStore.js'

const TYPE_COLOR = {
  person:    'var(--person)',
  place:     'var(--place)',
  theme:     'var(--theme)',
  concept:   'var(--concept)',
  character: 'var(--character)',
  event:     'var(--event)',
}

const TYPE_BG = {
  person:    'rgba(167,139,250,0.15)',
  place:     'rgba(52,211,153,0.14)',
  theme:     'rgba(244,114,182,0.13)',
  concept:   'rgba(45,212,191,0.13)',
  character: 'rgba(192,132,252,0.14)',
  event:     'rgba(248,113,113,0.14)',
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default function ReaderPanel() {
  const {
    readerNode, graphData,
    setReaderNode, setSelectedNode, setFocusedNodeId, setActiveTopic,
  } = useAppStore()

  const [expandedDocPath, setExpandedDocPath] = useState(null)
  const [content, setContent]                 = useState(null)
  const [loading, setLoading]                 = useState(false)
  const [isEditing, setIsEditing]             = useState(false)
  const [editContent, setEditContent]         = useState('')
  const [saving, setSaving]                   = useState(false)

  // Reset when the entity being read changes
  useEffect(() => {
    setExpandedDocPath(null)
    setContent(null)
    setIsEditing(false)
  }, [readerNode])

  // Which path to load: direct for document nodes, or the expanded card choice for entity nodes
  const activePath = useMemo(() => {
    if (!readerNode) return null
    if (readerNode.type === 'document') return readerNode.data.path
    return expandedDocPath
  }, [readerNode, expandedDocPath])

  // Load raw file content whenever activePath changes
  useEffect(() => {
    if (!activePath) { setContent(null); return }
    setLoading(true)
    setIsEditing(false)
    window.api.getFileContent(activePath).then(text => {
      setContent(text ?? null)
      setLoading(false)
    })
  }, [activePath])

  function startEditing() {
    if (!activePath) return
    setEditContent(content || '')
    setIsEditing(true)
  }

  async function handleEditBlur() {
    if (!activePath) return
    setSaving(true)
    await window.api.saveFileContent(activePath, editContent)
    setContent(editContent)
    setIsEditing(false)
    setSaving(false)
  }

  // All docs related to an entity node, sorted most-recent first
  const relatedDocs = useMemo(() => {
    if (!readerNode || readerNode.type === 'document') return []
    const ids = new Set(readerNode.data.documents || [])
    return graphData.documents
      .filter(d => ids.has(d.id))
      .sort((a, b) => (b.processedAt || 0) - (a.processedAt || 0))
  }, [readerNode, graphData.documents])

  // Active document object (for the topics bar)
  const currentDoc = useMemo(() => {
    if (!activePath) return null
    if (readerNode?.type === 'document') return readerNode.data
    return graphData.documents.find(d => d.path === activePath) || null
  }, [activePath, readerNode, graphData.documents])

  // Themes and concepts for the dots bar — from doc metadata, not text matching
  const docThemes = useMemo(() => {
    if (!currentDoc) return []
    return (currentDoc.themes || [])
      .map(name => (graphData.themes || []).find(t => t.name.toLowerCase() === name.toLowerCase()))
      .filter(Boolean)
  }, [currentDoc, graphData.themes])

  const docConcepts = useMemo(() => {
    if (!currentDoc) return []
    return (currentDoc.concepts || [])
      .map(name => (graphData.concepts || []).find(c => c.name.toLowerCase() === name.toLowerCase()))
      .filter(Boolean)
  }, [currentDoc, graphData.concepts])

  // Entity list for text highlighting — longest name first to prevent partial matches
  const entities = useMemo(() => {
    if (!content) return []
    return [
      ...graphData.people.map(p     => ({ name: p.name, type: 'person',    id: p.id, nodeId: `person-${p.id}`    })),
      ...graphData.places.map(p     => ({ name: p.name, type: 'place',     id: p.id, nodeId: `place-${p.id}`     })),
      ...(graphData.themes     || []).map(t => ({ name: t.name, type: 'theme',     id: t.id, nodeId: `theme-${t.id}`     })),
      ...(graphData.concepts   || []).map(c => ({ name: c.name, type: 'concept',   id: c.id, nodeId: `concept-${c.id}`   })),
      ...(graphData.characters || []).map(c => ({ name: c.name, type: 'character', id: c.id, nodeId: `character-${c.id}` })),
    ].filter(e => e.name && e.name.length > 2)
     .sort((a, b) => b.name.length - a.name.length)
  }, [content, graphData])

  const parts = useMemo(() => {
    if (!content) return []
    if (entities.length === 0) return [{ type: 'text', text: content }]
    const pattern = entities.map(e => escapeRegex(e.name)).join('|')
    const regex   = new RegExp(`(${pattern})`, 'gi')
    return content.split(regex).map(seg => {
      const entity = entities.find(e => e.name.toLowerCase() === seg.toLowerCase())
      return entity ? { type: 'entity', text: seg, entity } : { type: 'text', text: seg }
    })
  }, [content, entities])

  function handleEntityClick(entity) {
    const list = {
      person: graphData.people, place: graphData.places,
      theme: graphData.themes,  concept: graphData.concepts, character: graphData.characters,
    }[entity.type] || []
    const data = list.find(e => e.id === entity.id)
    if (data) { setSelectedNode({ type: entity.type, data }); setFocusedNodeId(entity.nodeId) }
  }

  if (!readerNode) return null

  const entityLabel = readerNode.data.name || readerNode.data.title || ''
  const isMultiDoc  = readerNode.type !== 'document' && !expandedDocPath
  const headerTitle = expandedDocPath
    ? (currentDoc?.name || expandedDocPath.split('/').pop())
    : (readerNode.type === 'document' ? readerNode.data.name : entityLabel)

  return (
    <div className="reader-panel">
      {/* Header */}
      <div className="reader-header">
        {expandedDocPath && (
          <button className="reader-back"
                  onClick={() => { setExpandedDocPath(null); setContent(null); setIsEditing(false) }}
                  title="Back to all entries">←</button>
        )}
        <div className="reader-title" title={headerTitle}>{headerTitle}</div>
        {saving && <span className="reader-saving">saving…</span>}
        <button className="reader-close" onClick={() => setReaderNode(null)}>✕</button>
      </div>

      {/* Theme / concept dots — only when a single document is active */}
      {(docThemes.length > 0 || docConcepts.length > 0) && (
        <div className="reader-topics">
          {docThemes.map(t => (
            <button key={t.id} className="reader-topic-chip reader-topic-theme"
                    onClick={() => setActiveTopic({ type: 'theme', id: t.id, name: t.name })}
                    title={`Theme: ${t.name}`}>
              <span className="reader-topic-dot" />
              {t.name}
            </button>
          ))}
          {docConcepts.map(c => (
            <button key={c.id} className="reader-topic-chip reader-topic-concept"
                    onClick={() => setActiveTopic({ type: 'concept', id: c.id, name: c.name })}
                    title={`Concept: ${c.name}`}>
              <span className="reader-topic-dot" />
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="reader-body">

        {/* ── Multi-doc entity view ───────────────────────────────── */}
        {isMultiDoc && (
          <>
            <div className="reader-entity-label">
              {relatedDocs.length} {relatedDocs.length === 1 ? 'entry' : 'entries'} mentioning&nbsp;
              <strong>{entityLabel}</strong>
            </div>

            <div className="reader-doc-cards">
              {relatedDocs.map(doc => {
                const excerpt = (readerNode.data.excerpts || []).find(e => e.docId === doc.id)
                return (
                  <div key={doc.id} className="reader-doc-card"
                       onClick={() => setExpandedDocPath(doc.path)}>
                    <div className="reader-doc-card-name">{doc.name}</div>
                    {excerpt && (
                      <div className="reader-doc-card-excerpt">"{excerpt.text}"</div>
                    )}
                    <div className="reader-doc-card-open">Read full →</div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── Full document text / edit view ──────────────────────── */}
        {!isMultiDoc && (
          <>
            {loading && <div className="reader-loading">Loading…</div>}

            {/* Edit mode — same visual as read mode, just a textarea underneath */}
            {!loading && isEditing && (
              <textarea
                className="reader-text reader-text-edit"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onBlur={handleEditBlur}
                autoFocus
                spellCheck
              />
            )}

            {/* Read mode — click anywhere to edit */}
            {!loading && !isEditing && content && (
              <div className="reader-text reader-text-readable"
                   onClick={startEditing}
                   title="Click to edit">
                {parts.map((part, i) =>
                  part.type === 'entity' ? (
                    <mark key={i} className="reader-entity"
                          style={{
                            color:             TYPE_COLOR[part.entity.type],
                            backgroundColor:   TYPE_BG[part.entity.type],
                            borderBottomColor: TYPE_COLOR[part.entity.type],
                          }}
                          onClick={e => { e.stopPropagation(); handleEntityClick(part.entity) }}
                          title={`${part.entity.type}: ${part.entity.name}`}>
                      {part.text}
                    </mark>
                  ) : (
                    <span key={i}>{part.text}</span>
                  )
                )}
              </div>
            )}

            {!loading && !content && (
              <div className="reader-empty">Could not load file content.</div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
