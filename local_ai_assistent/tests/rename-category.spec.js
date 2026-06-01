import { test, expect } from '@playwright/test'
import { clearDB, saveSettings, seedCategory, seedNote } from './helpers.js'

test.describe('Rename Category', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearDB(page)
    await page.waitForSelector('#settings-drawer.open')
    await saveSettings(page)
    await seedCategory(page, 'Work')
    await page.reload()
  })

  test('right-clicking a folder card shows a context menu', async ({ page }) => {
    await page.locator('.folder-card:not(.folder-card-add)').click({ button: 'right' })
    await expect(page.locator('#folder-context-menu')).toBeVisible()
  })

  test('context menu has Rename and Delete options', async ({ page }) => {
    await page.locator('.folder-card:not(.folder-card-add)').click({ button: 'right' })
    await expect(page.locator('#ctx-rename')).toBeVisible()
    await expect(page.locator('#ctx-delete')).toBeVisible()
  })

  test('clicking Rename makes the folder name editable', async ({ page }) => {
    await page.locator('.folder-card:not(.folder-card-add)').click({ button: 'right' })
    await page.click('#ctx-rename')
    await expect(page.locator('.folder-name-input')).toBeVisible()
    await expect(page.locator('.folder-name-input')).toHaveValue('Work')
  })

  test('pressing Enter confirms the new name', async ({ page }) => {
    await page.locator('.folder-card:not(.folder-card-add)').click({ button: 'right' })
    await page.click('#ctx-rename')
    await page.fill('.folder-name-input', 'Personal')
    await page.keyboard.press('Enter')
    await expect(page.locator('.folder-card', { hasText: 'Personal' })).toBeVisible()
    await expect(page.locator('.folder-card:not(.folder-card-add)', { hasText: 'Work' })).not.toBeVisible()
  })

  test('pressing Escape cancels the rename', async ({ page }) => {
    await page.locator('.folder-card:not(.folder-card-add)').click({ button: 'right' })
    await page.click('#ctx-rename')
    await page.fill('.folder-name-input', 'Personal')
    await page.keyboard.press('Escape')
    await expect(page.locator('.folder-name-input')).not.toBeVisible()
    await expect(page.locator('.folder-card:not(.folder-card-add)', { hasText: 'Work' })).toBeVisible()
  })

  test('notes in the old category appear under the new name after rename', async ({ page }) => {
    await seedNote(page, { category: 'Work', original_text: 'Test note', improved_text: 'Improved' })
    await page.reload()
    await page.locator('.folder-card:not(.folder-card-add)').click({ button: 'right' })
    await page.click('#ctx-rename')
    await page.fill('.folder-name-input', 'Personal')
    await page.keyboard.press('Enter')
    await page.locator('.folder-card', { hasText: 'Personal' }).click()
    await expect(page.locator('.note-card')).toBeVisible()
  })
})
