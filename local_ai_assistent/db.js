// Uses global Dexie (loaded via CDN script tag in index.html)

const db = new Dexie('notas_inteligentes')

db.version(1).stores({
  settings: '++id',
  notes: '++id, category, created_at',
})

export async function getSettings() {
  const rows = await db.settings.toArray()
  if (!rows.length) return null
  const s = rows[0]
  return {
    ...s,
    categories: Array.isArray(s.categories) ? s.categories : JSON.parse(s.categories || '[]'),
  }
}

export async function saveSettings({ temperature, topK, categories, github_token }) {
  await db.settings.put({
    id: 1,
    temperature,
    topK,
    categories: JSON.stringify(categories),
    github_token: github_token ?? null,
  })
}

export async function createNote({ original_text, improved_text, category, image_base64 = null }) {
  return db.notes.add({
    original_text,
    improved_text,
    category,
    image_base64,
    created_at: new Date().toISOString(),
  })
}

export async function getNotesByCategory(category) {
  const notes = await db.notes.where('category').equals(category).toArray()
  return notes.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function getAllNotes() {
  return db.notes.toArray()
}

export async function deleteNote(id) {
  return db.notes.delete(id)
}

export async function getCategorySummaries() {
  const notes = await db.notes.toArray()
  const map = new Map()
  for (const n of notes) {
    map.set(n.category, (map.get(n.category) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([category, count]) => ({ category, count }))
}
