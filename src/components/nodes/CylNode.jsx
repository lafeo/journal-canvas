import { Handle, Position } from '@xyflow/react'

// slightly darker border for the sketch-border effect
const META = {
  personNode:    { fill: '#9B59B6', border: '#6C3483' },
  eventNode:     { fill: '#E74C3C', border: '#A93226' },
  placeNode:     { fill: '#2ECC71', border: '#1A8A4A' },
  themeNode:     { fill: '#E91E8C', border: '#A3145F' },
  conceptNode:   { fill: '#1ABC9C', border: '#148A6E' },
  characterNode: { fill: '#8E44AD', border: '#6C3483' },
  documentNode:  { fill: '#3498DB', border: '#1A6FA0' },
  todoNode:      { fill: '#95A5A6', border: '#717D7E' },
}

const MIN_H = 14
const MAX_H = 60

export default function CylNode({ data, type }) {
  const meta = META[type] || { fill: '#888', border: '#555' }

  const degree    = data.degree    ?? 0
  const maxDegree = data.maxDegree ?? 1
  const minDegree = data.minDegree ?? 0
  const range     = maxDegree - minDegree

  const barH = range === 0
    ? Math.round((MIN_H + MAX_H) / 2)
    : Math.round(MIN_H + ((degree - minDegree) / range) * (MAX_H - MIN_H))

  const label = data.name || data.title || ''

  return (
    <div className="bar-node">
      <Handle type="target" position={Position.Top}    id="t" className="bar-handle" />
      <Handle type="source" position={Position.Bottom} id="b" className="bar-handle" />
      <Handle type="target" position={Position.Left}   id="l" className="bar-handle" />
      <Handle type="source" position={Position.Right}  id="r" className="bar-handle" />

      <div className="bar-count">{degree}</div>

      <div
        className="bar-body"
        style={{ backgroundColor: meta.fill, borderColor: meta.border, height: barH }}
      />

      {label && (
        <div className="bar-label" style={{ color: meta.fill }}>{label}</div>
      )}
    </div>
  )
}
