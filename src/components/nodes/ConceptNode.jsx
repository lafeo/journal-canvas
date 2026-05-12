import { Handle, Position } from '@xyflow/react'

export default function ConceptNode({ data, selected }) {
  return (
    <div className={`node node-concept ${selected ? 'node-selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="handle" />
      <div className="node-icon">◈</div>
      <div className="node-content">
        <div className="node-title">{data.name}</div>
        {data.field && <div className="node-meta">{data.field}</div>}
        <div className="node-meta">{data.documents?.length || 0} docs</div>
      </div>
      <Handle type="source" position={Position.Right} className="handle" />
    </div>
  )
}
