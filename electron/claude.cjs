const Anthropic = require('@anthropic-ai/sdk')

const SYSTEM_PROMPT = `You analyze personal documents — journals, research papers, and creative writing. Extract structured information and return ONLY valid JSON — no markdown fences, no explanation, just the raw JSON object.

Rules:
- Be thorough with names. Include every named person, character, or concept mentioned.
- For themes, be specific: prefer "existential dread about career change" over "career".
- Concepts are ideas, theories, frameworks, or fields (for research docs) — not vague topics.
- Characters are fictional people (for creative works) — distinct from real people.
- Only include todos that are genuine future action items not yet done.`

function buildExistingContext(existing = {}) {
  const lines = []
  if (existing.people?.length)     lines.push(`People: ${existing.people.map(n => `"${n}"`).join(', ')}`)
  if (existing.places?.length)     lines.push(`Places: ${existing.places.map(n => `"${n}"`).join(', ')}`)
  if (existing.themes?.length)     lines.push(`Themes: ${existing.themes.map(n => `"${n}"`).join(', ')}`)
  if (existing.concepts?.length)   lines.push(`Concepts: ${existing.concepts.map(n => `"${n}"`).join(', ')}`)
  if (existing.characters?.length) lines.push(`Characters: ${existing.characters.map(n => `"${n}"`).join(', ')}`)
  if (!lines.length) return ''
  return `EXISTING KNOWLEDGE BASE — use these exact names when the document references the same entity:
${lines.join('\n')}
For themes: if a new theme is essentially the same idea as an existing one (even if worded differently), return the existing string exactly. Do not create near-duplicates.

`
}

async function analyzeDocument(content, filename, apiKey, existingEntities = {}) {
  const client = new Anthropic({ apiKey })

  const trimmed = content.length > 5000 ? content.slice(0, 5000) + '\n...[truncated]' : content
  const existingContext = buildExistingContext(existingEntities)

  const userPrompt = `Document: "${filename}"

${existingContext}Content:
${trimmed}

Identify the document type first, then extract accordingly.

Return a JSON object with exactly this structure:
{
  "summary": "2-3 sentence summary",
  "documentType": "journal|research|creative|tasks|reflection|note|other",
  "mood": "happy|sad|anxious|excited|neutral|reflective|frustrated|content|curious|other",
  "people": [
    {"name": "Name as written", "context": "how they appear", "relationship": "friend|family|colleague|romantic|mentor|acquaintance|unknown"}
  ],
  "events": [
    {"title": "Event name", "date": "ISO date or null", "description": "brief description"}
  ],
  "places": [
    {"name": "Place name", "context": "why mentioned"}
  ],
  "themes": ["specific theme 1", "specific theme 2"],
  "todos": [
    {"text": "task text", "priority": "high|medium|low", "relatedPeople": ["names"]}
  ],
  "concepts": [
    {"name": "concept name", "description": "one sentence definition in context", "field": "field or domain it belongs to"}
  ],
  "characters": [
    {"name": "character name", "description": "who they are in the work", "role": "protagonist|antagonist|supporting|narrator|other"}
  ]
}

Notes:
- "concepts" is for research/intellectual documents: theories, frameworks, phenomena, methodologies (e.g. "emergence", "cognitive load", "actor-network theory")
- "characters" is for creative writing: fictional people, not real ones
- For journal entries: concepts and characters will usually be empty arrays
- For research papers: characters will usually be empty, concepts should be thorough
- For creative works: concepts may be empty, characters should be thorough`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content[0].text.trim()

  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Claude returned invalid JSON: ' + text.slice(0, 120))
  }
}

module.exports = { analyzeDocument, buildExistingContext }
