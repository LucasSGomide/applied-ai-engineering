import { test, expect } from '@playwright/test'
import { seedNote, seedCategory, clearDB, saveSettings } from './helpers.js'

test.describe('Note Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearDB(page)
    await page.waitForSelector('#settings-drawer.open')
    await saveSettings(page)
    await seedCategory(page, 'Work')
    await seedCategory(page, 'Personal')
    await seedNote(page, {
      category: 'Work',
      original_text: 'Original note text',
      improved_text: 'Improved note content',
    })
    await page.reload()
    await page.locator('.folder-card', { hasText: 'Work' }).click()
    await page.waitForSelector('.note-card')
  })

  test('clicking a note card opens the details modal', async ({ page }) => {
    await page.locator('.note-card-body').click()
    await expect(page.locator('#modal-note-details')).toBeVisible()
  })

  test('modal displays the formatted creation date', async ({ page }) => {
    await page.locator('.note-card-body').click()
    await expect(page.locator('#modal-note-details')).toBeVisible()
    const dateText = await page.locator('#detail-date').textContent()
    expect(dateText).toMatch(/\d/)
  })

  test('modal contains an editable original_text textarea', async ({ page }) => {
    await page.locator('.note-card-body').click()
    const textarea = page.locator('#detail-original')
    await expect(textarea).toBeVisible()
    await expect(textarea).toHaveValue('Original note text')
    await expect(textarea).not.toBeDisabled()
  })

  test('modal contains an editable improved_text textarea', async ({ page }) => {
    await page.locator('.note-card-body').click()
    const textarea = page.locator('#detail-improved')
    await expect(textarea).toBeVisible()
    await expect(textarea).toHaveValue('Improved note content')
    await expect(textarea).not.toBeDisabled()
  })

  test('delete icon is present in the modal', async ({ page }) => {
    await page.locator('.note-card-body').click()
    await expect(page.locator('#detail-btn-delete')).toBeVisible()
  })

  test('move icon is present in the modal', async ({ page }) => {
    await page.locator('.note-card-body').click()
    await expect(page.locator('#detail-btn-move')).toBeVisible()
  })

  test('editing original_text and clicking Save persists the change', async ({ page }) => {
    await page.locator('.note-card-body').click()
    await page.fill('#detail-original', 'Updated original text')
    await page.click('#detail-btn-save')
    await expect(page.locator('#modal-note-details')).not.toBeVisible()
    await page.locator('.note-card-body').click()
    await expect(page.locator('#detail-original')).toHaveValue('Updated original text')
  })

  test('editing improved_text and clicking Save persists the change', async ({ page }) => {
    await page.locator('.note-card-body').click()
    await page.fill('#detail-improved', 'Updated improved text')
    await page.click('#detail-btn-save')
    await expect(page.locator('#modal-note-details')).not.toBeVisible()
    await page.locator('.note-card-body').click()
    await expect(page.locator('#detail-improved')).toHaveValue('Updated improved text')
  })

  test('clicking X button closes modal without saving unsaved edits', async ({ page }) => {
    await page.locator('.note-card-body').click()
    await page.fill('#detail-original', 'Changed but not saved')
    await page.click('#btn-close-details')
    await expect(page.locator('#modal-note-details')).not.toBeVisible()
    await page.locator('.note-card-body').click()
    await expect(page.locator('#detail-original')).toHaveValue('Original note text')
  })

  test('clicking the backdrop closes the modal', async ({ page }) => {
    await page.locator('.note-card-body').click()
    await expect(page.locator('#modal-note-details')).toBeVisible()
    // click the top-left corner — outside the centered inner dialog
    await page.locator('#modal-details-backdrop').click({ position: { x: 10, y: 10 } })
    await expect(page.locator('#modal-note-details')).not.toBeVisible()
  })

  test('clicking move icon keeps the modal open', async ({ page }) => {
    await page.locator('.note-card-body').click()
    await expect(page.locator('#modal-note-details')).toBeVisible()
    await page.click('#detail-btn-move')
    await expect(page.locator('#modal-note-details')).toBeVisible()
  })

  test('clicking move icon shows the category picker below the button', async ({ page }) => {
    await page.locator('.note-card-body').click()
    await page.click('#detail-btn-move')
    await expect(page.locator('#move-picker')).toBeVisible()
    const btnBox = await page.locator('#detail-btn-move').boundingBox()
    const pickerBox = await page.locator('#move-picker').boundingBox()
    expect(pickerBox.y).toBeGreaterThan(btnBox.y)
  })

  test('selecting a category from the modal picker closes both picker and modal', async ({ page }) => {
    await page.locator('.note-card-body').click()
    await page.click('#detail-btn-move')
    await page.locator('#move-picker button', { hasText: 'Personal' }).click()
    await expect(page.locator('#move-picker')).not.toBeVisible()
    await expect(page.locator('#modal-note-details')).not.toBeVisible()
  })

  test('note is moved to the chosen category when using the modal move picker', async ({ page }) => {
    await page.locator('.note-card-body').click()
    await page.click('#detail-btn-move')
    await page.locator('#move-picker button', { hasText: 'Personal' }).click()
    await page.click('#btn-home')
    await page.locator('.folder-card', { hasText: 'Personal' }).click()
    await expect(page.locator('.note-card')).toBeVisible()
  })

  test('closing the modal while picker is open also closes the picker', async ({ page }) => {
    await page.locator('.note-card-body').click()
    await page.click('#detail-btn-move')
    await expect(page.locator('#move-picker')).toBeVisible()
    await page.click('#btn-close-details')
    await expect(page.locator('#modal-note-details')).not.toBeVisible()
    await expect(page.locator('#move-picker')).not.toBeVisible()
  })
})
