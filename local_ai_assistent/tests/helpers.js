// Seeds a note directly into IndexedDB (bypasses AI processing requirement).
export async function seedNote(page, { category, original_text, improved_text = '' }) {
  await page.evaluate(async ({ category, original_text, improved_text }) => {
    const db = new Dexie('notas_inteligentes')
    db.version(1).stores({ settings: '++id', notes: '++id, category, created_at' })
    db.version(2).stores({ settings: '++id', notes: '++id, category, created_at', categories: '++id, name' })
    await db.notes.add({
      original_text,
      improved_text,
      category,
      image_base64: null,
      created_at: new Date().toISOString(),
    })
  }, { category, original_text, improved_text })
}

export async function clearDB(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase('notas_inteligentes')
    req.onsuccess = resolve
    req.onerror = () => reject(req.error)
  }))
  await page.reload()
}

export async function seedCategory(page, name) {
  await page.evaluate(async (name) => {
    const db = new Dexie('notas_inteligentes')
    db.version(1).stores({ settings: '++id', notes: '++id, category, created_at' })
    db.version(2).stores({ settings: '++id', notes: '++id, category, created_at', categories: '++id, name' })
    await db.categories.add({ name })
  }, name)
}

export async function openSettings(page) {
  await page.click('#btn-hamburger')
  await page.waitForSelector('#settings-drawer.open')
}

export async function saveSettings(page) {
  await page.click('#settings-form button[type="submit"]')
  await page.waitForSelector('#settings-drawer:not(.open)')
}
