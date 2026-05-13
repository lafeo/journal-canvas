import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
} from 'd3-force'

// ── Colors ───────────────────────────────────────────────────────────────────

export const COLORS = {
  person:    { edge: '#9B59B6', border: '#6C3483' },
  event:     { edge: '#E74C3C', border: '#A93226' },
  place:     { edge: '#2ECC71', border: '#1A8A4A' },
  theme:     { edge: '#E91E8C', border: '#A3145F' },
  todo:      { edge: '#95A5A6', border: '#717D7E' },
  document:  { edge: '#3498DB', border: '#1A6FA0' },
  concept:   { edge: '#1ABC9C', border: '#148A6E' },
  character: { edge: '#8E44AD', border: '#6C3483' },
}

const ENTITY_CLUSTERS = {
  person:    { x: -580, y: -120 },
  concept:   { x:    0, y: -520 },
  event:     { x:  580, y: -240 },
  character: { x:  640, y:  180 },
  place:     { x:  300, y:  500 },
  theme:     { x: -300, y:  500 },
  todo:      { x: -800, y:  260 },
  document:  { x:    0, y:    0 },
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

// ── Deterministic seed position (avoids random drift each render) ─────────────

function seededPos(id, spread) {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(31, h) + id.charCodeAt(i) | 0
  }
  const x = (((h & 0xFFFF) / 0xFFFF) - 0.5) * spread
  const y = ((((h >>> 16) & 0xFFFF) / 0xFFFF) - 0.5) * spread
  return { x, y }
}

function runForceLayout(nodes, edges, options = {}) {
  const {
    clusterCenters = null,
    linkDistance   = 140,
    linkStrength   = 0.45,
    chargeStrength  = -500,
    collideRadius   = 85,
    clusterStrength = 0.14,
    iterations      = 360,
    initialSpread   = 260,
  } = options

  if (nodes.length === 0) return nodes

  const nodeType = (n) => NODE_TYPE_MAP[n.type] || 'document'

  const simNodes = nodes.map((n) => {
    const type = nodeType(n)
    const center = clusterCenters?.[type] || { x: 0, y: 0 }
    const seed = seededPos(n.id, initialSpread)
    return {
      id: n.id,
      _type: type,
      x: center.x + seed.x,
      y: center.y + seed.y,
    }
  })

  // Only keep edges whose both endpoints are in this node set
  const nodeIds = new Set(simNodes.map((n) => n.id))
  const simLinks = edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e) => ({ source: e.source, target: e.target }))

  const sim = forceSimulation(simNodes)
    .force('link',    forceLink(simLinks).id((n) => n.id).distance(linkDistance).strength(linkStrength))
    .force('charge',  forceManyBody().strength(chargeStrength))
    .force('collide', forceCollide(collideRadius).strength(0.8))

  if (clusterCenters) {
    sim
      .force('cx', forceX((n) => clusterCenters[n._type]?.x ?? 0).strength(clusterStrength))
      .force('cy', forceY((n) => clusterCenters[n._type]?.y ?? 0).strength(clusterStrength))
  } else {
    sim
      .force('cx', forceX(0).strength(0.02))
      .force('cy', forceY(0).strength(0.02))
  }

  sim.stop()
  for (let i = 0; i < iterations; i++) sim.tick()

  const posMap = Object.fromEntries(simNodes.map((n) => [n.id, { x: n.x, y: n.y }]))

  return nodes.map((n) => ({
    ...n,
    position: posMap[n.id] ?? { x: 0, y: 0 },
  }))
}

// relative connection count → bar height
function withDegree(nodes, edges) {
  const deg = {}
  edges.forEach(e => {
    deg[e.source] = (deg[e.source] || 0) + 1
    deg[e.target] = (deg[e.target] || 0) + 1
  })
  const vals   = Object.values(deg)
  const maxDeg = vals.length ? Math.max(...vals) : 1
  const minDeg = vals.length ? Math.min(...vals) : 0
  return nodes.map(n => ({
    ...n,
    data: { ...n.data, degree: deg[n.id] || 0, maxDegree: maxDeg, minDegree: minDeg },
  }))
}

// ── Edge factory helpers ──────────────────────────────────────────────────────

function makeEdgeSet() {
  const seen = new Set()
  return function addEdge(edges, source, target, type, weight = 1) {
    const key = [source, target].sort().join('↔') + ':' + type
    if (seen.has(key)) return
    seen.add(key)
    edges.push({
      id: key,
      source,
      target,
      type: 'straight',
      style: {
        stroke: COLORS[type]?.edge || '#888',
        strokeWidth: Math.min(0.8 + weight * 0.6, 3.5),
        opacity: 0.14,
        ...(type === 'theme' ? { strokeDasharray: '5,4' } : {}),
      },
      data: { connectionType: type, weight },
    })
  }
}

export function createEntitySimulation(nodes, edges) {
  const nodeSet = new Set(nodes.map(n => n.id))
  const simNodes = nodes.map(n => ({ id: n.id, x: n.position.x, y: n.position.y }))
  const simLinks = edges
    .filter(e => nodeSet.has(e.source) && nodeSet.has(e.target))
    .map(e => ({ source: e.source, target: e.target }))

  return forceSimulation(simNodes)
    .force('link',    forceLink(simLinks).id(n => n.id).distance(130).strength(0.18))
    .force('charge',  forceManyBody().strength(-420))
    .force('collide', forceCollide(66).strength(0.92))
    .force('x',       forceX(0).strength(0.04))
    .force('y',       forceY(0).strength(0.04))
    .alphaDecay(0.045)
    .velocityDecay(0.88)
    .stop()
}

// ── Entity graph (World View) ──────────────────────────────────────────────────

export function buildEntityGraph(graphData) {
  const nodes = []
  const edges = []
  const addEdge = makeEdgeSet()

  const byDoc = { people: {}, events: {}, places: {}, themes: {}, concepts: {}, characters: {} }

  const push = (map, docId, id) => {
    if (!map[docId]) map[docId] = []
    map[docId].push(id)
  }

  graphData.people.forEach((p) => {
    p.documents.forEach((d) => push(byDoc.people, d, p.id))
    nodes.push({ id: `person-${p.id}`, type: 'personNode', data: { ...p }, position: { x: 0, y: 0 } })
  })

  graphData.events.forEach((e) => {
    e.documents.forEach((d) => push(byDoc.events, d, e.id))
    nodes.push({ id: `event-${e.id}`, type: 'eventNode', data: { ...e }, position: { x: 0, y: 0 } })
  })

  graphData.places.forEach((p) => {
    p.documents.forEach((d) => push(byDoc.places, d, p.id))
    nodes.push({ id: `place-${p.id}`, type: 'placeNode', data: { ...p }, position: { x: 0, y: 0 } })
  })

  graphData.themes.forEach((t) => {
    t.documents.forEach((d) => push(byDoc.themes, d, t.id))
    nodes.push({ id: `theme-${t.id}`, type: 'themeNode', data: { ...t }, position: { x: 0, y: 0 } })
  })

  ;(graphData.concepts || []).forEach((c) => {
    c.documents.forEach((d) => push(byDoc.concepts, d, c.id))
    nodes.push({ id: `concept-${c.id}`, type: 'conceptNode', data: { ...c }, position: { x: 0, y: 0 } })
  })

  ;(graphData.characters || []).forEach((c) => {
    c.documents.forEach((d) => push(byDoc.characters, d, c.id))
    nodes.push({ id: `character-${c.id}`, type: 'characterNode', data: { ...c }, position: { x: 0, y: 0 } })
  })

  if (graphData.todos.length > 0) {
    nodes.push({
      id: 'todos-group',
      type: 'todoNode',
      data: { todos: graphData.todos },
      position: { x: 0, y: 0 },
    })
  }

  // Build edges from co-document appearances
  const allDocIds = new Set(Object.values(byDoc).flatMap(Object.keys))

  allDocIds.forEach((docId) => {
    const P  = byDoc.people[docId]     || []
    const Ev = byDoc.events[docId]     || []
    const Pl = byDoc.places[docId]     || []
    const T  = byDoc.themes[docId]     || []
    const C  = byDoc.concepts[docId]   || []
    const Ch = byDoc.characters[docId] || []

    const pairs = (arr, prefix, type) => {
      for (let i = 0; i < arr.length; i++)
        for (let j = i + 1; j < arr.length; j++)
          addEdge(edges, `${prefix}${arr[i]}`, `${prefix}${arr[j]}`, type)
    }

    pairs(P,  'person-',    'person')
    pairs(C,  'concept-',   'concept')
    pairs(Ch, 'character-', 'character')

    P.forEach((p)  => Ev.forEach((e)  => addEdge(edges, `person-${p}`,    `event-${e}`,     'event')))
    P.forEach((p)  => Pl.forEach((pl) => addEdge(edges, `person-${p}`,    `place-${pl}`,    'place')))
    P.forEach((p)  => T.forEach((t)   => addEdge(edges, `person-${p}`,    `theme-${t}`,     'theme')))
    C.forEach((c)  => T.forEach((t)   => addEdge(edges, `concept-${c}`,   `theme-${t}`,     'concept')))
    C.forEach((c)  => P.forEach((p)   => addEdge(edges, `concept-${c}`,   `person-${p}`,    'concept')))
    Ch.forEach((c) => T.forEach((t)   => addEdge(edges, `character-${c}`, `theme-${t}`,     'theme')))
    Ch.forEach((c) => Pl.forEach((pl) => addEdge(edges, `character-${c}`, `place-${pl}`,    'place')))
    Ev.forEach((e) => Pl.forEach((pl) => addEdge(edges, `event-${e}`,     `place-${pl}`,    'place')))
    T.forEach((t)  => Ev.forEach((e)  => addEdge(edges, `theme-${t}`,     `event-${e}`,     'event')))
  })

  if (nodes.length === 0) return { nodes: [], edges: [] }

  const seeded = nodes.map(n => {
    const type   = NODE_TYPE_MAP[n.type] || 'document'
    const center = ENTITY_CLUSTERS[type] || { x: 0, y: 0 }
    const seed   = seededPos(n.id, 180)
    return { ...n, position: { x: center.x + seed.x, y: center.y + seed.y } }
  })

  return { nodes: withDegree(seeded, edges), edges }
}

// ── Document graph (Document View) ────────────────────────────────────────────

export function buildDocumentGraph(graphData) {
  const docs = graphData.documents.filter((d) => d.processedAt)
  if (docs.length === 0) return { nodes: [], edges: [] }

  const norm = (s) => s.toLowerCase().trim()

  const nodes = docs.map((doc) => ({
    id: `doc-${doc.id}`,
    type: 'documentNode',
    data: { ...doc },
    position: { x: 0, y: 0 },
  }))

  const edges = []
  const addEdge = makeEdgeSet()

  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const a = docs[i], b = docs[j]

      const count = (arrA, arrB) =>
        (arrA || []).filter((x) => (arrB || []).some((y) => norm(y) === norm(x))).length

      const sp = count(a.people,     b.people)
      const st = count(a.themes,     b.themes)
      const sl = count(a.places,     b.places)
      const se = count(a.events,     b.events)
      const sc = count(a.concepts,   b.concepts)
      const sk = count(a.characters, b.characters)

      if (sp > 0) addEdge(edges, `doc-${a.id}`, `doc-${b.id}`, 'person',    sp)
      if (st > 0) addEdge(edges, `doc-${a.id}`, `doc-${b.id}`, 'theme',     st)
      if (sl > 0) addEdge(edges, `doc-${a.id}`, `doc-${b.id}`, 'place',     sl)
      if (se > 0) addEdge(edges, `doc-${a.id}`, `doc-${b.id}`, 'event',     se)
      if (sc > 0) addEdge(edges, `doc-${a.id}`, `doc-${b.id}`, 'concept',   sc)
      if (sk > 0) addEdge(edges, `doc-${a.id}`, `doc-${b.id}`, 'character', sk)
    }
  }

  // Document mode: no type clustering — let connections do the work
  const laid = runForceLayout(nodes, edges, {
    clusterCenters: null,
    linkDistance:   160,
    linkStrength:   0.5,
    chargeStrength: -450,
    collideRadius:  90,
    iterations:     400,
    initialSpread:  400,
  })

  return { nodes: withDegree(laid, edges), edges }
}
