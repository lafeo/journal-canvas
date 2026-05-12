import { Handle, Position } from '@xyflow/react'

const META = {
  personNode:    '#A78BFA',
  eventNode:     '#F87171',
  placeNode:     '#34D399',
  characterNode: '#C084FC',
  todoNode:      '#94A3B8',
  documentNode:  '#60A5FA',
  themeNode:     '#F472B6',
  conceptNode:   '#2DD4BF',
}

const MIN_H = 12   // px — least connected node
const MAX_H = 58   // px — most connected node

export default function CylNode({ data, type }) {
  const color = META[type] || '#888'

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
        style={{ backgroundColor: color, height: barH }}
      />

      {label && (
        <div className="bar-label" style={{ color }}>{label}</div>
      )}
    </div>
  )
}
