// Uses global Dexie (loaded via CDN script tag in index.html)

const db = new Dexie('notas_inteligentes')

db.version(1).stores({
  settings: '++id',
  notes: '++id, category, created_at',
})

db.version(2).stores({
  settings: '++id',
  notes: '++id, category, created_at',
  categories: '++id, name',
}).upgrade(async tx => {
  const rows = await tx.table('settings').toArray()
  if (!rows.length) return
  const raw = rows[0].categories
  const names = Array.isArray(raw) ? raw : JSON.parse(raw || '[]')
  for (const name of names) {
    await tx.table('categories').add({ name })
  }
})

export async function getSettings() {
  const rows = await db.settings.toArray()
  if (!rows.length) return null
  const s = rows[0]
  return {
    temperature: s.temperature,
    topK: s.topK,
    github_token: s.github_token ?? null,
  }
}

export async function saveSettings({ temperature, topK, github_token }) {
  await db.settings.put({
    id: 1,
    temperature,
    topK,
    github_token: github_token ?? null,
  })
}

export async function addCategory(name) {
  return db.categories.add({ name })
}

export async function getAllCategories() {
  const rows = await db.categories.toArray()
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export async function renameCategory(id, newName) {
  const cat = await db.categories.get(id)
  const oldName = cat.name
  await db.categories.update(id, { name: newName })
  await db.notes.where('category').equals(oldName).modify({ category: newName })
}

export async function deleteCategory(id) {
  const cat = await db.categories.get(id)
  await db.notes.where('category').equals(cat.name).delete()
  await db.categories.delete(id)
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

export async function getNoteById(id) {
  return db.notes.get(id)
}

export async function deleteNote(id) {
  return db.notes.delete(id)
}

export async function updateNote(id, fields) {
  return db.notes.update(id, fields)
}

export async function getCategorySummaries() {
  const notes = await db.notes.toArray()
  const map = new Map()
  for (const n of notes) {
    map.set(n.category, (map.get(n.category) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([category, count]) => ({ category, count }))
}
