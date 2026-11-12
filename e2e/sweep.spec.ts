import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * 全站巡检：逐页打开所有页面，查页面报错、失败的请求、坏图、横向溢出、太小的触控目标和死链；
 * 再连开两轮现代专场，看第二轮有没有重复的图。
 */

interface ContentLike {
  route: { chapters: { id: string; styles: string[] }[] }
  families: { id: string }[]
  styles: { id: string; family: string }[]
  vocab: { regions: Record<string, unknown>; eras: Record<string, unknown> }
}
const content = JSON.parse(fs.readFileSync('src/content/generated/content.json', 'utf8')) as ContentLike

const styleIds = new Set(content.styles.map((s) => s.id))

function pagesToVisit(): string[] {
  const urls = ['#/']
  for (const ch of content.route.chapters) {
    urls.push(`#/tour/${ch.id}`)
    for (const s of ch.styles) if (styleIds.has(s)) urls.push(`#/tour/${ch.id}/${s}`)
  }
  for (const f of content.families) {
    if (f.id === 'modern') continue
    urls.push(`#/tour/${f.id}`)
    for (const s of content.styles) if (s.family === f.id) urls.push(`#/tour/${f.id}/${s.id}`)
  }
  for (const s of content.styles) urls.push(`#/style/${s.id}`)
  urls.push('#/explore')
  for (const r of Object.keys(content.vocab.regions)) urls.push(`#/explore/region/${r}`)
  for (const e of Object.keys(content.vocab.eras)) urls.push(`#/explore/era/${e}`)
  urls.push('#/blind', '#/me', '#/me/data', '#/me/scrapbook', '#/me/install', '#/about')
  return urls
}

interface PageReport {
  url: string
  overflow?: string[]
  brokenImages?: string[]
  smallTargets?: string[]
  unsafeExternal?: string[]
}

async function inspect(page: Page, url: string): Promise<PageReport> {
  await page.goto(`./${url}`)
  await page.locator('main, [role="main"], h1').first().waitFor()
  await page.waitForTimeout(250)
  // 滚到底，让懒加载的图都开始加载
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 40))
    }
    window.scrollTo(0, 0)
  })
  await page
    .waitForFunction(() => [...document.images].every((img) => img.complete), undefined, { timeout: 8000 })
    .catch(() => undefined)
  return page.evaluate((url) => {
    const report: PageReport = { url }
    const vw = window.innerWidth
    if (document.documentElement.scrollWidth > vw + 1) {
      report.overflow = [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.right > vw + 1
        })
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 120))
    }
    const broken = [...document.images].filter((img) => img.complete && img.naturalWidth === 0 && img.currentSrc)
    if (broken.length) report.brokenImages = broken.map((img) => img.currentSrc)
    const small: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('a[href], button, [role="button"], select, summary')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || style.opacity === '0') continue
      // 段落里的文字链接按惯例不算（WCAG 2.5.8 的行内例外）
      if (style.display === 'inline' && el.parentElement && /^(P|LI|SPAN|DD|FIGCAPTION|SMALL)$/.test(el.parentElement.tagName)) continue
      // 用 ::after 撑大的可点区域（hitArea44）也算进去
      const after = getComputedStyle(el, '::after')
      const grow = (a: string, b: string) => (after.content !== 'none' && after.position === 'absolute' ? -(parseFloat(a) || 0) - (parseFloat(b) || 0) : 0)
      const w = r.width + Math.max(0, grow(after.left, after.right))
      const h = r.height + Math.max(0, grow(after.top, after.bottom))
      if (w < 44 || h < 44) {
        const text = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)
        small.push(`${el.tagName.toLowerCase()}「${text}」${Math.round(w)}×${Math.round(h)}`)
      }
    }
    if (small.length) report.smallTargets = small
    const unsafe = [...document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')]
      .filter((a) => !/noreferrer|noopener/.test(a.rel))
      .map((a) => a.href)
    if (unsafe.length) report.unsafeExternal = unsafe
    return report
  }, url)
}

test('全站巡检', async ({ page }, info) => {
  test.setTimeout(240_000)
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  const badResponses: string[] = []
  let current = ''
  page.on('pageerror', (e) => pageErrors.push(`${current} ${String(e)}`))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`${current} ${m.text()}`)
  })
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(new URL(page.url() || 'http://localhost:4173').origin))
      badResponses.push(`${current} ${r.status()} ${r.url()}`)
  })

  // 跳过首次说明
  await page.goto('./')
  await page.getByRole('button', { name: '先跳过，直接看导览' }).click()

  const reports: PageReport[] = []
  const internalLinks = new Set<string>()
  const visited = pagesToVisit()
  for (const url of visited) {
    current = url
    reports.push(await inspect(page, url))
    for (const href of await page.$$eval('a[href^="#/"]', (as) => as.map((a) => a.getAttribute('href')!)))
      internalLinks.add(href)
  }

  // 死链：页面上出现过的站内链接都打开一次，不该落到“没找到这一页”
  const deadLinks: string[] = []
  for (const href of internalLinks) {
    if (visited.includes(href)) continue
    current = href
    await page.goto(`./${href}`)
    await page.locator('h1').first().waitFor()
    if (await page.getByRole('heading', { name: '没找到这一页' }).count()) deadLinks.push(href)
  }

  // 连开两轮现代专场：第二轮应该先给没见过的图
  const rounds: string[][] = []
  for (let round = 0; round < 2; round++) {
    current = `现代专场第 ${round + 1} 轮`
    await page.goto('./#/blind')
    await page.getByRole('button', { name: '开始现代专场' }).click()
    const session = page.getByRole('region', { name: '盲测' })
    const total = Number((await session.getByText(/^1\/\d+$/).textContent())!.split('/')[1])
    const seen: string[] = []
    for (let i = 0; i < total; i++) {
      await expect(session.getByText(`${i + 1}/${total}`, { exact: true })).toBeVisible()
      await page.waitForFunction(() => {
        const img = document.querySelector<HTMLImageElement>('[aria-label="盲测"] img')
        return Boolean(img && img.complete && img.naturalWidth > 0)
      })
      seen.push((await session.locator('img').first().getAttribute('src'))!)
      await session.getByRole('button', { name: i % 3 === 0 ? '喜欢（+1）' : '一般（0）' }).click()
    }
    await expect(page.getByText(/现代专场 · 评了/)).toBeVisible()
    rounds.push(seen)
  }
  const repeats = rounds[1]!.filter((src) => rounds[0]!.includes(src))

  const summary = {
    project: info.project.name,
    pages: visited.length,
    linksChecked: internalLinks.size,
    pageErrors,
    consoleErrors,
    badResponses,
    deadLinks,
    modernRounds: rounds.map((r) => r.length),
    modernRepeats: repeats.length,
    issues: reports.filter((r) => Object.keys(r).length > 1),
  }
  fs.mkdirSync('test-results', { recursive: true })
  fs.writeFileSync(`test-results/sweep-${info.project.name}.json`, JSON.stringify(summary, null, 2))
  console.log(JSON.stringify({ ...summary, issues: summary.issues.length }))

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
  expect(badResponses).toEqual([])
  expect(deadLinks).toEqual([])
  expect(repeats).toEqual([])
  expect(reports.filter((r) => r.overflow || r.brokenImages || r.unsafeExternal || r.smallTargets)).toEqual([])
})
