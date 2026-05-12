import { Handle, Position } from '@xyflow/react'

export default function EventNode({ data, selected }) {
  return (
    <div className={`node node-event ${selected ? 'node-selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="handle" />
      <div className="node-icon">📅</div>
      <div className="node-content">
        <div className="node-title">{data.title}</div>
        {data.date && <div className="node-meta">{data.date}</div>}
        <div className="node-meta">{data.documents?.length || 0} entries</div>
      </div>
      <Handle type="source" position={Position.Right} className="handle" />
    </div>
  )
}
