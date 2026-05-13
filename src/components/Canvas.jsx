import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import useAppStore from '../store/useAppStore.js'
import { buildEntityGraph, buildDocumentGraph, createEntitySimulation, COLORS } from '../utils/graphBuilder.js'
import CylNode from './nodes/CylNode.jsx'

const nodeTypes = {
  documentNode:  CylNode,
  personNode:    CylNode,
  eventNode:     CylNode,
  placeNode:     CylNode,
  themeNode:     CylNode,
  todoNode:      CylNode,
  conceptNode:   CylNode,
  characterNode: CylNode,
}

const NODE_TYPE_MAP = {
  personNode:    'person',
  eventNode:     'event',
  placeNode:     'place',
  themeNode:     'theme',
  todoNode:      'todo',
  conceptNode:   'concept',
  characterNode: 'character',
  documentNode:  'document',
}

// Themes & concepts live in the sidebar panel — only concrete entities stay on the canvas
const FILTERS = [
  { type: 'person',    label: 'People',     icon: '👤' },
  { type: 'character', label: 'Characters', icon: '◇'  },
  { type: 'event',     label: 'Events',     icon: '📅' },
  { type: 'place',     label: 'Places',     icon: '📍' },
  { type: 'todo',      label: 'Tasks',      icon: '✓'  },
]

const CANVAS_TYPES = new Set(['person', 'character', 'event', 'place', 'todo', 'document'])

const ALL_TYPES = new Set(FILTERS.map(f => f.type))

export default function Canvas() {
  const { graphData, mode, setSelectedNode, selectedNode, activeTopic, setActiveTopic,
          focusedNodeId, setFocusedNodeId, theme } = useAppStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [enabled, setEnabled]           = useState(new Set(ALL_TYPES))
  const simRef = useRef(null)

  useEffect(() => {
    if (activeTopic) { setFocusedNodeId(null); setSelectedNode(null) }
  }, [activeTopic, setSelectedNode, setFocusedNodeId])

  useEffect(() => {
    if (simRef.current) { simRef.current.stop(); simRef.current = null }

    if (mode === 'document') {
      const { nodes: n, edges: e } = buildDocumentGraph(graphData)
      setNodes(n); setEdges(e); setFocusedNodeId(null)
      return
    }

    const { nodes: rawNodes, edges: rawEdges } = buildEntityGraph(graphData)
    setNodes(rawNodes)
    setEdges(rawEdges)
    setFocusedNodeId(null)

    if (rawNodes.length === 0) return

    const sim = createEntitySimulation(rawNodes, rawEdges)
    simRef.current = sim

    const simNodeMap = new Map(sim.nodes().map(sn => [sn.id, sn]))

    sim.on('tick', () => {
      setNodes(prev => prev.map(n => {
        const sn = simNodeMap.get(n.id)
        return sn ? { ...n, position: { x: sn.x, y: sn.y } } : n
      }))
    })

    sim.restart()
    return () => { if (simRef.current) simRef.current.stop() }
  }, [graphData, mode])

  // Drag-to-pin: while dragging a node, fix it in the simulation so other
  // nodes reorganise around it; release to let it flow freely again
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes)
    const sim = simRef.current
    if (!sim) return
    const simNodeMap = new Map(sim.nodes().map(n => [n.id, n]))
    for (const change of changes) {
      if (change.type !== 'position') continue
      const sn = simNodeMap.get(change.id)
      if (!sn) continue
      if (change.dragging) {
        sn.fx = change.position?.x ?? sn.x
        sn.fy = change.position?.y ?? sn.y
        // One-shot alpha burst — neighbours spread out, then everything stops naturally
        if (sim.alpha() < 0.05) sim.alpha(0.28).alphaTarget(0).restart()
      } else {
        // Release: unpin and let the short burst finish settling
        sn.fx = null
        sn.fy = null
      }
    }
  }, [onNodesChange])

  // Derive what React Flow actually renders (visibility + highlight)
  const { displayNodes, displayEdges } = useMemo(() => {
    // Themes/concepts are always excluded from the canvas — they live in the sidebar
    const isVisible = (n) => {
      if (mode === 'document') return true
      const t = NODE_TYPE_MAP[n.type] || 'document'
      return CANVAS_TYPES.has(t) && enabled.has(t)
    }

    const visibleIds = new Set(nodes.filter(isVisible).map(n => n.id))

    // --- Topic highlight (from sidebar theme/concept click) ---
    if (activeTopic) {
      const topicNodeId = `${activeTopic.type}-${activeTopic.id}`
      const connectedIds = new Set()
      edges.forEach(e => {
        if (e.source === topicNodeId) connectedIds.add(e.target)
        if (e.target === topicNodeId) connectedIds.add(e.source)
      })

      return {
        displayNodes: nodes.map(n => ({
          ...n,
          hidden: !visibleIds.has(n.id),
          style: {
            opacity: !visibleIds.has(n.id) ? 0 : (connectedIds.has(n.id) ? 1 : 0.06),
            transition: 'opacity 0.18s ease',
          },
        })),
        displayEdges: edges.map(e => {
          const bothVisible = visibleIds.has(e.source) && visibleIds.has(e.target)
          const bothConnected = connectedIds.has(e.source) && connectedIds.has(e.target)
          return {
            ...e,
            hidden: !bothVisible,
            style: {
              ...e.style,
              opacity: !bothVisible ? 0 : (bothConnected ? 0.5 : 0.03),
              transition: 'opacity 0.18s ease',
            },
          }
        }),
      }
    }

    // --- Document selected from sidebar in entity mode ---
    // There's no document node on the entity graph, so light up its entities instead
    if (!focusedNodeId && !activeTopic && selectedNode?.type === 'document' && mode === 'entity') {
      const docId = selectedNode.data.id
      const litNodeIds = new Set(
        nodes.filter(n => (n.data.documents || []).includes(docId)).map(n => n.id)
      )
      return {
        displayNodes: nodes.map(n => ({
          ...n,
          hidden: !visibleIds.has(n.id),
          style: {
            opacity: !visibleIds.has(n.id) ? 0 : (litNodeIds.has(n.id) ? 1 : 0.07),
            transition: 'opacity 0.18s ease',
          },
        })),
        displayEdges: edges.map(e => {
          const hidden = !visibleIds.has(e.source) || !visibleIds.has(e.target)
          const lit    = !hidden && litNodeIds.has(e.source) && litNodeIds.has(e.target)
          return {
            ...e,
            hidden,
            animated: lit,
            style: {
              ...e.style,
              opacity:     hidden ? 0 : lit ? 0.7 : 0.03,
              strokeWidth: lit ? (e.style?.strokeWidth || 1.5) + 1 : 0.4,
              transition:  'opacity 0.18s ease',
            },
          }
        }),
      }
    }

    if (!focusedNodeId) {
      return {
        displayNodes: nodes.map(n => ({ ...n, hidden: !visibleIds.has(n.id) })),
        displayEdges: edges.map(e => ({
          ...e,
          hidden: !visibleIds.has(e.source) || !visibleIds.has(e.target),
        })),
      }
    }

    // --- Node focus mode ---
    const litEdgeIds = new Set(
      edges
        .filter(e => visibleIds.has(e.source) && visibleIds.has(e.target))
        .filter(e => e.source === focusedNodeId || e.target === focusedNodeId)
        .map(e => e.id)
    )
    const litNodeIds = new Set([focusedNodeId])
    edges.forEach(e => {
      if (litEdgeIds.has(e.id)) { litNodeIds.add(e.source); litNodeIds.add(e.target) }
    })

    return {
      displayNodes: nodes.map(n => ({
        ...n,
        hidden: !visibleIds.has(n.id),
        style: {
          opacity: visibleIds.has(n.id) ? (litNodeIds.has(n.id) ? 1 : 0.08) : 0,
          transition: 'opacity 0.18s ease',
        },
      })),
      displayEdges: edges.map(e => {
        const hidden = !visibleIds.has(e.source) || !visibleIds.has(e.target)
        const lit    = litEdgeIds.has(e.id)
        return {
          ...e,
          hidden,
          animated: lit,
          style: {
            ...e.style,
            opacity:     hidden ? 0 : lit ? 0.95 : 0.03,
            strokeWidth: lit ? (e.style?.strokeWidth || 1.5) + 2 : 0.4,
            transition:  'opacity 0.18s ease',
          },
        }
      }),
    }
  }, [nodes, edges, focusedNodeId, enabled, mode, activeTopic, selectedNode])

  const onNodeClick = useCallback((_, node) => {
    const type = NODE_TYPE_MAP[node.type] || 'document'
    setSelectedNode({ type, data: node.data })
    // Read current value directly — Zustand actions don't support updater functions
    const cur = useAppStore.getState().focusedNodeId
    setFocusedNodeId(cur === node.id ? null : node.id)
    setActiveTopic(null)
  }, [setSelectedNode, setActiveTopic, setFocusedNodeId])

  const onPaneClick = useCallback(() => {
    setFocusedNodeId(null)
    setSelectedNode(null)
    setActiveTopic(null)
  }, [setSelectedNode, setActiveTopic, setFocusedNodeId])

  const toggleType = useCallback((type) => {
    setEnabledTypes(prev => {
      const next = new Set(prev)
      if (next.has(type) && next.size > 1) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  const setEnabledTypes = setEnabled

  const isEmpty = graphData.documents.length === 0

  return (
    <div className="canvas-wrapper">
      {isEmpty && (
        <div className="canvas-empty">
          <div className="canvas-empty-icon">✦</div>
          <div className="canvas-empty-title">No files yet</div>
          <div className="canvas-empty-body">
            Add .txt or .md exports of your Pages documents to the selected folder.
          </div>
        </div>
      )}

      {/* Entity-type filter toggles — entity mode only */}
      {mode === 'entity' && (
        <div className="type-filter-bar">
          {FILTERS.map(({ type, label, icon }) => (
            <button
              key={type}
              className={`filter-pill ${enabled.has(type) ? 'active' : ''}`}
              style={{ '--pill': COLORS[type]?.edge }}
              onClick={() => toggleType(type)}
              title={enabled.has(type) ? `Hide ${label}` : `Show ${label}`}
            >
              <span className="filter-icon">{icon}</span>
              <span className="filter-label">{label}</span>
            </button>
          ))}
        </div>
      )}

      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.04}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: 'straight' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28} size={1}
          color={theme === 'light' ? '#C8BFB0' : '#1E1A16'}
        />
        <Controls style={{
          background: theme === 'light' ? '#FFFEF8' : '#161310',
          border: `2px solid ${theme === 'light' ? '#C8BFB0' : '#302820'}`,
          borderRadius: 8,
        }} />
        <MiniMap
          style={{ backgroundColor: theme === 'light' ? '#FAF7F0' : '#0F0D0B' }}
          nodeColor={n => COLORS[NODE_TYPE_MAP[n.type] || 'document']?.border || '#555'}
          maskColor={theme === 'light' ? 'rgba(250,247,240,0.8)' : 'rgba(0,0,0,0.72)'}
        />
      </ReactFlow>

      {/* Colour legend — bottom-left, only canvas-visible types */}
      <div className="edge-legend">
        {Object.entries(COLORS)
          .filter(([type]) => CANVAS_TYPES.has(type))
          .map(([type, { edge }]) => (
            <span key={type} className="legend-edge" style={{ '--c': edge }}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          ))}
      </div>

      {(focusedNodeId || activeTopic) && (
        <div className="focus-hint">
          {activeTopic
            ? `${activeTopic.type === 'theme' ? '✦' : '◈'} ${activeTopic.name} — click background to clear`
            : 'Click background to clear focus'
          }
        </div>
      )}
    </div>
  )
}
