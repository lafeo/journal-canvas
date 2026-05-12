const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

let dataDir = null

const empty = () => ({ documents: {}, people: {}, events: [], places: {}, themes: {}, todos: [], concepts: {}, characters: {} })
let graphData = empty()

function hashStr(s) {
  return crypto.createHash('md5').update(s).digest('hex').slice(0, 12)
}

function initStore(userDataPath) {
  dataDir = userDataPath
  loadData()
}

function loadData() {
  const f = path.join(dataDir, 'graph-data.json')
  if (fs.existsSync(f)) {
    try {
      const saved = JSON.parse(fs.readFileSync(f, 'utf8'))
      graphData = { ...empty(), ...saved }
    } catch {}
  }
}

function saveData() {
  fs.writeFileSync(path.join(dataDir, 'graph-data.json'), JSON.stringify(graphData, null, 2))
}

function getSettings() {
  const f = path.join(dataDir, 'settings.json')
  if (fs.existsSync(f)) { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch {} }
  return {}
}

function setSettings(updates) {
  const current = getSettings()
  fs.writeFileSync(path.join(dataDir, 'settings.json'), JSON.stringify({ ...current, ...updates }, null, 2))
}

function getDocumentByPath(filePath) {
  return graphData.documents[filePath] || null
}

function pruneEntityConnections(docId) {
  const keep = d => d !== docId
  const keepEx = e => e.docId !== docId

  Object.values(graphData.people).forEach(p => {
    p.documents = p.documents.filter(keep)
    p.contexts  = (p.contexts  || []).filter(c => c.docId !== docId)
    if (p.excerpts) p.excerpts = p.excerpts.filter(keepEx)
  })

  graphData.events = graphData.events
    .map(e => ({ ...e, documents: e.documents.filter(keep), excerpts: (e.excerpts || []).filter(keepEx) }))
    .filter(e => e.documents.length > 0)

  Object.values(graphData.places).forEach(p => {
    p.documents = p.documents.filter(keep)
    p.contexts  = (p.contexts  || []).filter(c => c.docId !== docId)
    if (p.excerpts) p.excerpts = p.excerpts.filter(keepEx)
  })

  Object.values(graphData.themes).forEach(t => {
    t.documents = t.documents.filter(keep)
    if (t.excerpts) t.excerpts = t.excerpts.filter(keepEx)
  })

  Object.values(graphData.concepts   || {}).forEach(c => {
    c.documents = c.documents.filter(keep)
    if (c.excerpts) c.excerpts = c.excerpts.filter(keepEx)
  })

  Object.values(graphData.characters || {}).forEach(c => {
    c.documents = c.documents.filter(keep)
    if (c.excerpts) c.excerpts = c.excerpts.filter(keepEx)
  })

  graphData.todos = graphData.todos.filter(t => t.documentId !== docId)

  // Prune entities that are now orphaned
  const prune = (map) => Object.keys(map).forEach(k => { if (map[k].documents.length === 0) delete map[k] })
  prune(graphData.people)
  prune(graphData.places)
  prune(graphData.themes)
  prune(graphData.concepts   || {})
  prune(graphData.characters || {})
}

function clearData() {
  graphData = empty()
  saveData()
}

function removeDocument(filePath) {
  const doc = graphData.documents[filePath]
  if (!doc) return
  pruneEntityConnections(doc.id)
  delete graphData.documents[filePath]
  saveData()
}

function hideDocument(filePath) {
  const doc = graphData.documents[filePath]
  if (!doc || doc.hidden) return
  pruneEntityConnections(doc.id)
  doc.hidden = true
  doc.processedAt = null   // forces re-analysis when unhidden
  saveData()
}

function unhideDocument(filePath) {
  const doc = graphData.documents[filePath]
  if (!doc) return
  doc.hidden = false
  saveData()
}

function extractSnippet(text, name) {
  const lower = text.toLowerCase()
  const idx   = lower.indexOf(name.toLowerCase())
  if (idx === -1) return null
  const start   = Math.max(0, idx - 90)
  const end     = Math.min(text.length, idx + name.length + 90)
  const snippet = text.slice(start, end).trim().replace(/\s+/g, ' ')
  return (start > 0 ? '…' : '') + snippet + (end < text.length ? '…' : '')
}

function addExcerpt(entity, docId, content, name) {
  if (!entity.excerpts) entity.excerpts = []
  if (entity.excerpts.find(e => e.docId === docId)) return
  const text = extractSnippet(content, name)
  if (text) entity.excerpts.push({ docId, text })
}

function storeAnalysis(filePath, content, contentHash, analysis) {
  const docId = hashStr(filePath)
  const name = path.basename(filePath, path.extname(filePath))

  graphData.documents[filePath] = {
    id: docId,
    path: filePath,
    name,
    contentHash,
    processedAt: Date.now(),
    summary: analysis.summary || '',
    documentType: analysis.documentType || 'note',
    mood: analysis.mood || 'neutral',
    people: (analysis.people || []).map(p => p.name),
    events: (analysis.events || []).map(e => e.title),
    places: (analysis.places || []).map(p => p.name),
    themes: analysis.themes || [],
    todoCount: (analysis.todos || []).length,
    concepts: (analysis.concepts || []).map(c => c.name),
    characters: (analysis.characters || []).map(c => c.name),
  }

  // Upsert people
  ;(analysis.people || []).forEach(person => {
    const key = person.name.toLowerCase().trim()
    if (!graphData.people[key]) {
      graphData.people[key] = { id: hashStr(key), name: person.name, documents: [], contexts: [], excerpts: [] }
    }
    const p = graphData.people[key]
    if (!p.documents.includes(docId)) {
      p.documents.push(docId)
      p.contexts.push({ docId, context: person.context || '', relationship: person.relationship || 'unknown' })
    }
    addExcerpt(p, docId, content, person.name)
  })

  // Upsert events
  ;(analysis.events || []).forEach(event => {
    const key = event.title.toLowerCase().trim()
    const existing = graphData.events.find(e => e.title.toLowerCase() === key)
    if (existing) {
      if (!existing.documents.includes(docId)) existing.documents.push(docId)
      addExcerpt(existing, docId, content, event.title)
    } else {
      const ev = {
        id: hashStr(key + (event.date || '')),
        title: event.title,
        date: event.date || null,
        description: event.description || '',
        documents: [docId],
        excerpts: [],
      }
      addExcerpt(ev, docId, content, event.title)
      graphData.events.push(ev)
    }
  })

  // Upsert places
  ;(analysis.places || []).forEach(place => {
    const key = place.name.toLowerCase().trim()
    if (!graphData.places[key]) {
      graphData.places[key] = { id: hashStr(key), name: place.name, documents: [], contexts: [], excerpts: [] }
    }
    const pl = graphData.places[key]
    if (!pl.documents.includes(docId)) {
      pl.documents.push(docId)
      pl.contexts.push({ docId, context: place.context || '' })
    }
    addExcerpt(pl, docId, content, place.name)
  })

  // Upsert themes
  ;(analysis.themes || []).forEach(theme => {
    const key = theme.toLowerCase().trim()
    if (!graphData.themes[key]) {
      graphData.themes[key] = { id: hashStr(key), name: theme, documents: [], excerpts: [] }
    }
    const t = graphData.themes[key]
    if (!t.documents.includes(docId)) t.documents.push(docId)
    addExcerpt(t, docId, content, theme)
  })

  // Upsert concepts
  ;(analysis.concepts || []).forEach(concept => {
    const key = concept.name.toLowerCase().trim()
    if (!graphData.concepts[key]) {
      graphData.concepts[key] = { id: hashStr(key), name: concept.name, description: concept.description || '', field: concept.field || '', documents: [], excerpts: [] }
    }
    const c = graphData.concepts[key]
    if (!c.documents.includes(docId)) c.documents.push(docId)
    addExcerpt(c, docId, content, concept.name)
  })

  // Upsert characters
  ;(analysis.characters || []).forEach(character => {
    const key = character.name.toLowerCase().trim()
    if (!graphData.characters[key]) {
      graphData.characters[key] = { id: hashStr(key), name: character.name, description: character.description || '', role: character.role || 'other', documents: [], excerpts: [] }
    }
    const c = graphData.characters[key]
    if (!c.documents.includes(docId)) c.documents.push(docId)
    addExcerpt(c, docId, content, character.name)
  })

  // Store todos (replace for this document)
  graphData.todos = graphData.todos.filter(t => t.documentId !== docId)
  ;(analysis.todos || []).forEach(todo => {
    graphData.todos.push({
      id: hashStr(docId + todo.text),
      documentId: docId,
      documentName: name,
      text: todo.text,
      priority: todo.priority || 'medium',
      relatedPeople: todo.relatedPeople || [],
    })
  })

  saveData()
}

function getGraphData() {
  return {
    documents: Object.values(graphData.documents),
    people: Object.values(graphData.people),
    events: graphData.events,
    places: Object.values(graphData.places),
    themes: Object.values(graphData.themes),
    todos: graphData.todos,
    concepts: Object.values(graphData.concepts || {}),
    characters: Object.values(graphData.characters || {}),
  }
}

module.exports = { initStore, getSettings, setSettings, getDocumentByPath, storeAnalysis, removeDocument, hideDocument, unhideDocument, clearData, getGraphData }
