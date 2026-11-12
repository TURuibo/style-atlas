import { expect, test } from '@playwright/test'

/** 像素画（DECISIONS 2026-11-12）：缩略图和看图器里都按像素显示，许可写明 CC BY / BY-SA */
test('像素画按像素显示，看图器里也不平滑', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('./#/style/pixel-art')
  await expect(page.getByRole('heading', { name: '像素艺术' })).toBeVisible()
  const thumbs = page.locator('img[data-pixelated]')
  await expect(thumbs.first()).toBeVisible()
  expect(await thumbs.count()).toBeGreaterThanOrEqual(4)
  expect(await thumbs.first().evaluate((el) => getComputedStyle(el).imageRendering)).toBe('pixelated')
  await expect(page.getByText('图片是作者用 CC BY、CC BY-SA 等许可公开的作品')).toBeVisible()

  await page.getByRole('button', { name: /^看大图：/ }).first().click()
  const big = page.locator('.pswp__img[data-pixelated]').first()
  await expect(big).toBeVisible()
  expect(await big.evaluate((el) => getComputedStyle(el).imageRendering)).toBe('pixelated')
  await expect(page.locator('.pswp').getByText(/CC BY(-SA)? 4\.0/).first()).toBeVisible()
  await expect(page.locator('.pswp').getByRole('link', { name: '许可原文' })).toBeVisible()
  await page.screenshot({ path: `docs/screenshots/phase-3.5/${test.info().project.name}-09-pixel-viewer.jpg`, quality: 70 })

  expect(errors).toEqual([])
})
