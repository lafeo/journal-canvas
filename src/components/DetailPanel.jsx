import useAppStore from '../store/useAppStore.js'

const MOOD_EMOJI = {
  happy: '😊', excited: '🤩', content: '😌', reflective: '🤔', neutral: '😐',
  sad: '😔', anxious: '😟', frustrated: '😤', other: '🙂',
}

export default function DetailPanel() {
  const { selectedNode, setSelectedNode, setReaderNode } = useAppStore()

  if (!selectedNode) return null

  const { type, data } = selectedNode

  function close() { setSelectedNode(null) }

  async function openFile() {
    if (data.path) await window.api.openFile(data.path)
  }

  function openReader() { setReaderNode(selectedNode) }

  return (
    <div className="detail-panel">
      <button className="detail-close" onClick={close}>✕</button>

      {type === 'document' && (
        <>
          <div className="detail-type-badge">
            {data.documentType || 'document'} {MOOD_EMOJI[data.mood] || ''}
          </div>
          <h2 className="detail-title">{data.name}</h2>
          {data.summary && <p className="detail-summary">{data.summary}</p>}

          {(data.people || []).length > 0 && (
            <div className="detail-section">
              <div className="detail-section-label">People</div>
              <div className="detail-chips">
                {data.people.map((p) => <span key={p} className="chip chip-person">{p}</span>)}
              </div>
            </div>
          )}
          {(data.themes || []).length > 0 && (
            <div className="detail-section">
              <div className="detail-section-label">Themes</div>
              <div className="detail-chips">
                {data.themes.map((t) => <span key={t} className="chip chip-theme">{t}</span>)}
              </div>
            </div>
          )}
          {(data.places || []).length > 0 && (
            <div className="detail-section">
              <div className="detail-section-label">Places</div>
              <div className="detail-chips">
                {data.places.map((p) => <span key={p} className="chip chip-place">{p}</span>)}
              </div>
            </div>
          )}
          {(data.events || []).length > 0 && (
            <div className="detail-section">
              <div className="detail-section-label">Events</div>
              <div className="detail-chips">
                {data.events.map((e) => <span key={e} className="chip chip-event">{e}</span>)}
              </div>
            </div>
          )}
          {data.path && (
            <button className="btn-primary detail-open-btn" onClick={openFile}>
              Open in Pages ↗
            </button>
          )}
          <button className="btn-ghost detail-open-btn" onClick={openReader}>
            Read ↗
          </button>
        </>
      )}

      {type === 'person' && (
        <>
          <div className="detail-type-badge">person</div>
          <h2 className="detail-title">👤 {data.name}</h2>
          <div className="detail-section">
            <div className="detail-section-label">Appears in {data.documents?.length || 0} entries</div>
          </div>
          {(data.contexts || []).length > 0 && (
            <div className="detail-section">
              <div className="detail-section-label">Context</div>
              {data.contexts.map((c, i) => (
                <div key={i} className="detail-context">
                  <span className="tag tag-person">{c.relationship}</span>
                  <span className="detail-context-text">{c.context}</span>
                </div>
              ))}
            </div>
          )}
          {(data.documents?.length > 0) && (
            <button className="btn-ghost detail-open-btn" onClick={openReader}>Read in context ↗</button>
          )}
        </>
      )}

      {type === 'event' && (
        <>
          <div className="detail-type-badge">event</div>
          <h2 className="detail-title">📅 {data.title}</h2>
          {data.date && <div className="detail-meta">{data.date}</div>}
          {data.description && <p className="detail-summary">{data.description}</p>}
          <div className="detail-section">
            <div className="detail-section-label">Mentioned in {data.documents?.length || 0} entries</div>
          </div>
          {(data.documents?.length > 0) && (
            <button className="btn-ghost detail-open-btn" onClick={openReader}>Read in context ↗</button>
          )}
        </>
      )}

      {type === 'place' && (
        <>
          <div className="detail-type-badge">place</div>
          <h2 className="detail-title">📍 {data.name}</h2>
          <div className="detail-section">
            <div className="detail-section-label">Mentioned in {data.documents?.length || 0} entries</div>
          </div>
          {(data.documents?.length > 0) && (
            <button className="btn-ghost detail-open-btn" onClick={openReader}>Read in context ↗</button>
          )}
        </>
      )}

      {type === 'theme' && (
        <>
          <div className="detail-type-badge">theme</div>
          <h2 className="detail-title">✦ {data.name}</h2>
          <div className="detail-section">
            <div className="detail-section-label">Across {data.documents?.length || 0} entries</div>
          </div>
          {(data.documents?.length > 0) && (
            <button className="btn-ghost detail-open-btn" onClick={openReader}>Read in context ↗</button>
          )}
        </>
      )}

      {type === 'concept' && (
        <>
          <div className="detail-type-badge">concept</div>
          <h2 className="detail-title">◈ {data.name}</h2>
          {data.field && <div className="detail-meta">{data.field}</div>}
          {data.description && <p className="detail-summary">{data.description}</p>}
          <div className="detail-section">
            <div className="detail-section-label">Appears in {data.documents?.length || 0} documents</div>
          </div>
          {(data.documents?.length > 0) && (
            <button className="btn-ghost detail-open-btn" onClick={openReader}>Read in context ↗</button>
          )}
        </>
      )}

      {type === 'character' && (
        <>
          <div className="detail-type-badge">character · {data.role}</div>
          <h2 className="detail-title">{data.name}</h2>
          {data.description && <p className="detail-summary">{data.description}</p>}
          <div className="detail-section">
            <div className="detail-section-label">Appears in {data.documents?.length || 0} works</div>
          </div>
          {(data.documents?.length > 0) && (
            <button className="btn-ghost detail-open-btn" onClick={openReader}>Read in context ↗</button>
          )}
        </>
      )}
    </div>
  )
}
