import { Handle, Position } from '@xyflow/react'

const PRIORITY_COLOR = { high: '#F87171', medium: '#FDE68A', low: '#6EE7B7' }

export default function TodoNode({ data, selected }) {
  const shown = (data.todos || []).slice(0, 6)
  return (
    <div className={`node node-todo ${selected ? 'node-selected' : ''}`} style={{ minWidth: 220 }}>
      <Handle type="target" position={Position.Left} className="handle" />
      <div className="node-header">
        <span className="node-icon">✓</span>
        <span className="node-title">Tasks ({data.todos?.length || 0})</span>
      </div>
      <ul className="todo-list">
        {shown.map((t) => (
          <li key={t.id} className="todo-item">
            <span className="todo-dot" style={{ background: PRIORITY_COLOR[t.priority] || '#aaa' }} />
            <span className="todo-text">{t.text}</span>
          </li>
        ))}
        {data.todos?.length > 6 && (
          <li className="todo-more">+{data.todos.length - 6} more</li>
        )}
      </ul>
      <Handle type="source" position={Position.Right} className="handle" />
    </div>
  )
}
