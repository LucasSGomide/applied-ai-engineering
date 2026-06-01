import { test, expect } from '@playwright/test'
import { clearDB, saveSettings, seedCategory, seedNote } from './helpers.js'

test.describe('Delete Category', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearDB(page)
    await page.waitForSelector('#settings-drawer.open')
    await saveSettings(page)
    await seedCategory(page, 'Work')
    await seedNote(page, { category: 'Work', original_text: 'Test note', improved_text: 'Improved' })
    await page.reload()
  })

  test('right-clicking a folder card shows the Delete option', async ({ page }) => {
    await page.locator('.folder-card:not(.folder-card-add)').click({ button: 'right' })
    await expect(page.locator('#ctx-delete')).toBeVisible()
  })

  test('clicking Delete opens a confirmation modal', async ({ page }) => {
    await page.locator('.folder-card:not(.folder-card-add)').click({ button: 'right' })
    await page.click('#ctx-delete')
    await expect(page.locator('#modal-confirm-delete-category')).toBeVisible()
  })

  test('the modal warns that notes will be deleted', async ({ page }) => {
    await page.locator('.folder-card:not(.folder-card-add)').click({ button: 'right' })
    await page.click('#ctx-delete')
    await expect(page.locator('#modal-confirm-delete-category')).toContainText('deleted')
  })

  test('clicking Cancel closes the modal without deleting the category', async ({ page }) => {
    await page.locator('.folder-card:not(.folder-card-add)').click({ button: 'right' })
    await page.click('#ctx-delete')
    await page.click('#btn-cancel-delete-category')
    await expect(page.locator('#modal-confirm-delete-category')).not.toBeVisible()
    await expect(page.locator('.folder-card:not(.folder-card-add)', { hasText: 'Work' })).toBeVisible()
  })

  test('clicking Confirm removes the category from the grid', async ({ page }) => {
    await page.locator('.folder-card:not(.folder-card-add)').click({ button: 'right' })
    await page.click('#ctx-delete')
    await page.click('#btn-confirm-delete-category')
    await expect(page.locator('.folder-card:not(.folder-card-add)', { hasText: 'Work' })).not.toBeVisible()
  })

  test('clicking Confirm deletes all notes inside the category', async ({ page }) => {
    await page.locator('.folder-card:not(.folder-card-add)').click({ button: 'right' })
    await page.click('#ctx-delete')
    await page.click('#btn-confirm-delete-category')
    // Wait for the grid to refresh (confirms the async deletion + refreshFolderGrid completed)
    await expect(page.locator('.folder-card:not(.folder-card-add)', { hasText: 'Work' })).not.toBeVisible()
    const noteCount = await page.evaluate(async () => {
      const db = new Dexie('notas_inteligentes')
      db.version(1).stores({ settings: '++id', notes: '++id, category, created_at' })
      db.version(2).stores({ settings: '++id', notes: '++id, category, created_at', categories: '++id, name' })
      const notes = await db.notes.toArray()
      return notes.length
    })
    expect(noteCount).toBe(0)
  })
})
