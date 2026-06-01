import { test, expect } from '@playwright/test'
import { seedNote, seedCategory, clearDB, saveSettings } from './helpers.js'

test.describe('Delete Note', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearDB(page)
    await page.waitForSelector('#settings-drawer.open')
    await saveSettings(page)
    await seedCategory(page, 'Work')
    await seedNote(page, {
      category: 'Work',
      original_text: 'Test note content',
      improved_text: 'Improved content',
    })
    await page.reload()
    await page.locator('.folder-card', { hasText: 'Work' }).click()
    await page.waitForSelector('.note-card')
  })

  test('trash icon is present on each note card', async ({ page }) => {
    await expect(page.locator('.btn-delete-note')).toBeVisible()
  })

  test('clicking trash opens a confirmation modal', async ({ page }) => {
    await page.click('.btn-delete-note')
    await expect(page.locator('#modal-confirm-delete')).toBeVisible()
  })

  test('clicking Cancel closes the modal — note is still in the list', async ({ page }) => {
    await page.click('.btn-delete-note')
    await page.click('#btn-cancel-delete')
    await expect(page.locator('#modal-confirm-delete')).not.toBeVisible()
    await expect(page.locator('.note-card')).toBeVisible()
  })

  test('clicking Confirm removes the note from the list', async ({ page }) => {
    await page.click('.btn-delete-note')
    await page.click('#btn-confirm-delete')
    await expect(page.locator('.note-card')).not.toBeVisible()
  })

  test('folder count decrements after deletion', async ({ page }) => {
    await page.click('.btn-delete-note')
    await page.click('#btn-confirm-delete')
    await page.click('#btn-home')
    await expect(page.locator('text=0 notes')).toBeVisible()
  })
})
