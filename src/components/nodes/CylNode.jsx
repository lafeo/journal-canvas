import { Handle, Position } from '@xyflow/react'

const META = {
  personNode:    '#C4956A',
  eventNode:     '#C46868',
  placeNode:     '#6EA882',
  characterNode: '#A88A5C',
  todoNode:      '#B0A07C',
  documentNode:  '#7A9EA0',
  themeNode:     '#A87C72',
  conceptNode:   '#88A87C',
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
