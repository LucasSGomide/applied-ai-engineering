// Browser API: window.LanguageModel (Chrome 131+ / Phi Mini)
//              window.ai.languageModel (legacy / Gemini Nano)
function llm() {
  return window.LanguageModel ?? window.ai?.languageModel ?? null
}

// ── State ──────────────────────────────────────────────────────────────────
let activeBackend = null  // 'browser' | 'github' | null
let githubToken   = null
let settings      = { temperature: 0.8, topK: 40 }

// Browser backend
let noteSession = null
let chatSession = null

// GitHub backend — conversation history maintained here
let chatMessages = []

// ── Backend detection ──────────────────────────────────────────────────────
export async function detectBackend(token) {
  // 1. Prefer browser LLM when readily available
  const browserApi = llm()
  if (browserApi) {
    try {
      const avail = await browserApi.availability()
      if (avail === 'readily') {
        activeBackend = 'browser'
        return 'browser'
      }
    } catch { /* not available, fall through */ }
  }

  // 2. Fall back to GitHub Models if token provided
  if (token) {
    activeBackend = 'github'
    githubToken   = token
    return 'github'
  }

  activeBackend = null
  return 'none'
}

export function getActiveBackend() {
  return activeBackend
}

// ── Configuration ──────────────────────────────────────────────────────────
export function configure({ temperature, topK, github_token } = {}) {
  settings = { temperature, topK }
  if (github_token !== undefined) githubToken = github_token

  noteSession?.destroy()
  chatSession?.destroy()
  noteSession   = null
  chatSession   = null
  chatMessages  = []
}

// ── Shared util ────────────────────────────────────────────────────────────
function parseAIResponse(raw) {
  try {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

function _parseNoteResponse(raw, text, categories) {
  const parsed = parseAIResponse(raw)
  if (parsed && parsed.category && categories.includes(parsed.category)) {
    return parsed
  }
  const matchedCat = categories.find(c => raw.toLowerCase().includes(c.toLowerCase()))
  return {
    category:      matchedCat ?? categories[0],
    improved_text: parsed?.improved_text ?? text,
    summary:       parsed?.summary ?? '',
  }
}

// ── GitHub internal ────────────────────────────────────────────────────────
async function _githubChat(messages) {
  const res = await fetch('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      temperature: settings.temperature,
      token: githubToken,
    }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `GitHub Models: HTTP ${res.status}`)
  }
  return data.choices?.[0]?.message?.content ?? ''
}

// ── processNote ────────────────────────────────────────────────────────────
export async function processNote({ text, categories }) {
  const userPrompt = `You are a note organization assistant.
Available categories: ${categories.join(', ')}
Note text: """${text}"""

Reply ONLY with valid JSON, no additional text, in the exact format:
{"category":"<one of the categories above>","improved_text":"<corrected and improved text>","summary":"<summary in 1-2 sentences>"}`

  if (activeBackend === 'browser') {
    try {
      noteSession = await llm().create({ temperature: settings.temperature, topK: settings.topK })
      const raw   = await noteSession.prompt(userPrompt)
      return _parseNoteResponse(raw, text, categories)
    } finally {
      noteSession?.destroy()
      noteSession = null
    }
  }

  if (activeBackend === 'github') {
    const raw = await _githubChat([
      { role: 'system', content: 'You are a note organization assistant. Always reply with valid JSON as requested, no additional text.' },
      { role: 'user',   content: userPrompt },
    ])
    return _parseNoteResponse(raw, text, categories)
  }

  throw new Error('No AI backend available.')
}

// ── sendChatMessage ────────────────────────────────────────────────────────
export async function sendChatMessage(userMessage) {
  if (activeBackend === 'browser') {
    if (!chatSession) {
      chatSession = await llm().create({
        temperature: settings.temperature,
        topK: settings.topK,
        systemPrompt: 'You are an intelligent personal assistant. Always respond clearly and helpfully.',
      })
    }
    return chatSession.prompt(userMessage)
  }

  if (activeBackend === 'github') {
    chatMessages.push({ role: 'user', content: userMessage })
    const response = await _githubChat([
      { role: 'system', content: 'You are an intelligent personal assistant. Always respond clearly and helpfully.' },
      ...chatMessages,
    ])
    chatMessages.push({ role: 'assistant', content: response })
    return response
  }

  throw new Error('No AI backend available.')
}

// ── analyzeAllNotes ────────────────────────────────────────────────────────
export async function analyzeAllNotes(notes) {
  const context = notes
    .map(n => `[${n.category}] ${n.improved_text || n.original_text}`)
    .join('\n\n---\n\n')

  const prompt = `Analyze the following ${notes.length} notes from my personal drive and provide:
1. An executive summary of the main topics
2. Pending tasks or commitments identified
3. The 3 most important pieces of information

NOTES:
${context}

Be concise and objective. Use bullet points where appropriate.`

  const system = 'You are a personal productivity assistant. Analyze notes and provide insights clearly and helpfully.'

  if (activeBackend === 'browser') {
    chatSession?.destroy()
    chatSession = null
    chatSession = await llm().create({ temperature: 0.5, topK: settings.topK, systemPrompt: system })
    return chatSession.prompt(prompt)
  }

  if (activeBackend === 'github') {
    return _githubChat([
      { role: 'system', content: system },
      { role: 'user',   content: prompt },
    ])
  }

  throw new Error('No AI backend available.')
}

// ── destroyChatSession ─────────────────────────────────────────────────────
export function destroyChatSession() {
  chatSession?.destroy()
  chatSession  = null
  chatMessages = []
}
