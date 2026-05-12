import { Handle, Position } from '@xyflow/react'

export default function PlaceNode({ data, selected }) {
  return (
    <div className={`node node-place ${selected ? 'node-selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="handle" />
      <div className="node-icon">📍</div>
      <div className="node-content">
        <div className="node-title">{data.name}</div>
        <div className="node-meta">{data.documents?.length || 0} entries</div>
      </div>
      <Handle type="source" position={Position.Right} className="handle" />
    </div>
  )
}
