import { test, expect } from '@playwright/test'
import { seedNote, seedCategory, clearDB, saveSettings } from './helpers.js'

test.describe('Move Note', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearDB(page)
    await page.waitForSelector('#settings-drawer.open')
    await saveSettings(page)
    await seedCategory(page, 'Work')
    await seedCategory(page, 'Personal')
    await seedNote(page, {
      category: 'Work',
      original_text: 'Note to move',
      improved_text: 'Improved content',
    })
    await page.reload()
    await page.locator('.folder-card', { hasText: 'Work' }).click()
    await page.waitForSelector('.note-card')
  })

  test('move icon is present on each note card', async ({ page }) => {
    await expect(page.locator('.btn-move-note')).toBeVisible()
  })

  test('clicking move icon shows a category picker', async ({ page }) => {
    await page.click('.btn-move-note')
    await expect(page.locator('#move-picker')).toBeVisible()
  })

  test('the current category is not shown in the picker', async ({ page }) => {
    await page.click('.btn-move-note')
    await expect(page.locator('#move-picker')).toBeVisible()
    await expect(page.locator('#move-picker')).not.toContainText('Work')
    await expect(page.locator('#move-picker')).toContainText('Personal')
  })

  test('selecting a category removes the note from the current folder list', async ({ page }) => {
    await page.click('.btn-move-note')
    await page.locator('#move-picker button', { hasText: 'Personal' }).click()
    await expect(page.locator('.note-card')).not.toBeVisible()
  })

  test('the note appears in the destination folder', async ({ page }) => {
    await page.click('.btn-move-note')
    await page.locator('#move-picker button', { hasText: 'Personal' }).click()
    await page.click('#btn-home')
    await page.locator('.folder-card', { hasText: 'Personal' }).click()
    await expect(page.locator('.note-card')).toBeVisible()
  })

  test('clicking outside the picker closes it without moving', async ({ page }) => {
    await page.click('.btn-move-note')
    await expect(page.locator('#move-picker')).toBeVisible()
    await page.click('h1')
    await expect(page.locator('#move-picker')).not.toBeVisible()
    await expect(page.locator('.note-card')).toBeVisible()
  })
})
