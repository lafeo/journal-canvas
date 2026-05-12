import { Handle, Position } from '@xyflow/react'

const TYPE_ICON = { journal: '📓', tasks: '✅', reflection: '🪞', note: '📝', other: '📄' }
const MOOD_COLOR = {
  happy: '#4ADE80', excited: '#34D399', content: '#60A5FA',
  reflective: '#A78BFA', neutral: '#94A3B8',
  sad: '#818CF8', anxious: '#F59E0B', frustrated: '#F87171',
}

export default function DocumentNode({ data, selected }) {
  const icon = TYPE_ICON[data.documentType] || '📄'
  const moodColor = MOOD_COLOR[data.mood] || '#94A3B8'

  return (
    <div className={`node node-document ${selected ? 'node-selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="handle" />
      <div className="node-doc-top">
        <span className="node-icon">{icon}</span>
        <span className="node-title">{data.name}</span>
        <span className="node-mood-dot" style={{ background: moodColor }} title={data.mood} />
      </div>
      {data.summary && (
        <div className="node-summary">{data.summary.slice(0, 100)}{data.summary.length > 100 ? '…' : ''}</div>
      )}
      <div className="node-doc-tags">
        {(data.people || []).slice(0, 3).map((p) => (
          <span key={p} className="tag tag-person">{p}</span>
        ))}
        {(data.themes || []).slice(0, 2).map((t) => (
          <span key={t} className="tag tag-theme">{t}</span>
        ))}
      </div>
      <Handle type="source" position={Position.Right} className="handle" />
    </div>
  )
}
