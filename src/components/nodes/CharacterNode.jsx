import { Handle, Position } from '@xyflow/react'

const ROLE_ICON = { protagonist: '★', antagonist: '✦', supporting: '◆', narrator: '◉', other: '◇' }

export default function CharacterNode({ data, selected }) {
  return (
    <div className={`node node-character ${selected ? 'node-selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="handle" />
      <div className="node-icon">{ROLE_ICON[data.role] || '◇'}</div>
      <div className="node-content">
        <div className="node-title">{data.name}</div>
        {data.role && <div className="node-meta">{data.role}</div>}
        <div className="node-meta">{data.documents?.length || 0} works</div>
      </div>
      <Handle type="source" position={Position.Right} className="handle" />
    </div>
  )
}
