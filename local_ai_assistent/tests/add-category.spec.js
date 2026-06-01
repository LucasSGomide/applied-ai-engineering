import { test, expect } from '@playwright/test'
import { clearDB, saveSettings } from './helpers.js'

test.describe('Add Category', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearDB(page)
    await page.waitForSelector('#settings-drawer.open')
    await saveSettings(page)
  })

  test('add folder card is visible on the home screen', async ({ page }) => {
    await expect(page.locator('.folder-card-add')).toBeVisible()
  })

  test('clicking the add folder card opens the add category modal', async ({ page }) => {
    await page.click('.folder-card-add')
    await expect(page.locator('#modal-add-category')).toBeVisible()
  })

  test('submitting an empty name shows an error and does not create a folder', async ({ page }) => {
    await page.click('.folder-card-add')
    await page.click('#btn-confirm-add-category')
    await expect(page.locator('#new-category-error')).toBeVisible()
    await expect(page.locator('.folder-card:not(.folder-card-add)')).toHaveCount(0)
  })

  test('typing a valid name and confirming creates a new folder card', async ({ page }) => {
    await page.click('.folder-card-add')
    await page.fill('#input-new-category', 'Work')
    await page.click('#btn-confirm-add-category')
    await expect(page.locator('#modal-add-category')).not.toBeVisible()
    await expect(page.locator('.folder-card', { hasText: 'Work' })).toBeVisible()
  })

  test('pressing Escape closes the modal without creating a folder', async ({ page }) => {
    await page.click('.folder-card-add')
    await page.fill('#input-new-category', 'Work')
    await page.keyboard.press('Escape')
    await expect(page.locator('#modal-add-category')).not.toBeVisible()
    await expect(page.locator('.folder-card:not(.folder-card-add)')).toHaveCount(0)
  })

  test('duplicate category name is rejected with an error', async ({ page }) => {
    await page.click('.folder-card-add')
    await page.fill('#input-new-category', 'Work')
    await page.click('#btn-confirm-add-category')
    await page.click('.folder-card-add')
    await page.fill('#input-new-category', 'work')
    await page.click('#btn-confirm-add-category')
    await expect(page.locator('#new-category-error')).toBeVisible()
    await expect(page.locator('.folder-card:not(.folder-card-add)')).toHaveCount(1)
  })
})
