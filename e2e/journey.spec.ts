import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * 主流程（SPEC §10.8）：首次说明 → 盲测 24 张（中途刷新后接着测）→ 揭晓 → 首页现代线路 → 一段的站
 * → 看图器（公共领域和 CC BY 两种署名）→ 风格页评分 → 剪贴簿（加图、刷新后还在、删除）→ 现代专场
 * → 我的 → 导出 → 重置 → 导入。
 * 盲测在模拟 4G 下跑，记录每张图等了多久；导览记录切站耗时。数字写进 test-results/metrics-*.json。
 */

const shotDir = path.resolve('docs/screenshots/phase-3.5')

/** 一张 64×48 的 PNG，当作从相册选的图 */
const samplePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAZElEQVR4nO3PUQkAIBTAwBfMYEY0liH8OITBAtzm7PV1wwUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY8dgEYG9EAPThRiAAAAABJRU5ErkJggg==',
  'base64',
)

async function shot(page: Page, name: string, project: string) {
  fs.mkdirSync(shotDir, { recursive: true })
  await page.screenshot({ path: path.join(shotDir, `${project}-${name}.jpg`), type: 'jpeg', quality: 70 })
}

/** 当前盲测图加载完成需要多久（毫秒） */
async function waitBlindImage(page: Page): Promise<number> {
  const t0 = Date.now()
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>('[aria-label="盲测"] img')
    return Boolean(img && img.complete && img.naturalWidth > 0)
  })
  return Date.now() - t0
}

const label = (score: number) =>
  ({ [-2]: '讨厌（-2）', [-1]: '不太喜欢（-1）', 0: '一般（0）', 1: '喜欢（+1）', 2: '超爱（+2）' })[score]!

test('首次使用的完整流程', async ({ page, context }, info) => {
  const project = info.project.name
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  const metrics: Record<string, unknown> = { project }

  await page.goto('./')
  await expect(page.getByText('3 分钟盲测，看看你真正喜欢什么')).toBeVisible()
  await shot(page, '01-welcome', project)

  // 模拟 4G：约 9 Mbps 下行、40 毫秒延迟
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 40,
    downloadThroughput: (9 * 1024 * 1024) / 8,
    uploadThroughput: (3 * 1024 * 1024) / 8,
  })

  await page.getByRole('button', { name: '开始盲测' }).click()
  const session = page.getByRole('region', { name: '盲测' })
  await expect(session).toBeVisible()

  const waits: number[] = []
  const started = Date.now()
  const scores = [2, 1, 0, -1, 1, 2, -2, 1, 0, 1, 2, -1, 0, 1, 1, 2, -1, 0, 1, 2, 0, -2, 1, 2]
  for (let i = 0; i < 24; i++) {
    await expect(session.getByText(`${i + 1}/24`, { exact: true })).toBeVisible()
    waits.push(await waitBlindImage(page))
    if (i === 0) await shot(page, '02-blind', project)
    await page.waitForTimeout(800) // 看一眼
    if (i === 3) {
      // 中途刷新：已评的应当保存，首页出现“继续盲测”
      await page.reload()
      await expect(page.getByText('继续盲测').first()).toBeVisible()
      await page.getByRole('button', { name: '继续盲测' }).click()
      await expect(session.getByText('4/24', { exact: true })).toBeVisible()
      await waitBlindImage(page)
    }
    if (i === 5) {
      // 手势：右滑 = 喜欢
      const box = (await session.locator('img').boundingBox())!
      const y = box.y + box.height / 2
      await page.mouse.move(box.x + box.width * 0.3, y)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.3 + 140, y, { steps: 6 })
      await page.mouse.up()
      continue
    }
    if (i === 8) {
      // 撤销：先随手评一个，再撤销，回到第 9 张
      await session.getByRole('button', { name: label(-2) }).click()
      await expect(session.getByText('10/24', { exact: true })).toBeVisible()
      await session.getByRole('button', { name: '撤销上一张' }).click()
      await expect(session.getByText('9/24', { exact: true })).toBeVisible()
    }
    if (i === 12) {
      await session.getByRole('button', { name: /跳过/ }).click()
      continue
    }
    await session.getByRole('button', { name: label(scores[i]!) }).click()
  }
  metrics.blindSeconds = Math.round((Date.now() - started) / 1000)
  metrics.imageWaitsMs = waits
  metrics.imageWaitMaxAfterFirstMs = Math.max(...waits.slice(1))

  await expect(page.getByRole('heading', { name: '揭晓' })).toBeVisible()
  await expect(page.getByText(/你给高分最多的是|没有给出/)).toBeVisible()
  await shot(page, '03-reveal', project)
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })

  // 导览：从揭晓进首页；第一屏是现代线路，下面是溯源。进“书和杂志里的插画”，从第一站开始
  await page.getByRole('link', { name: '开始导览' }).click()
  await expect(page.getByRole('heading', { name: '现代线路' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '溯源：九大类' })).toBeVisible()
  await shot(page, '04-home', project)
  await page.getByRole('link', { name: /书和杂志里的插画/ }).click()
  await expect(page.getByText(/现代线路 · 第 3 段/)).toBeVisible()
  await page.getByRole('link', { name: '从第一站开始' }).click()
  await expect(page.getByRole('heading', { name: '当代绘本' })).toBeVisible()
  await shot(page, '05-station', project)

  // 切站耗时：点“下一站”到新站名画出来
  const switches: number[] = []
  for (let i = 0; i < 4; i++) {
    const next = page.getByRole('button', { name: /^下一站/ })
    if ((await next.count()) === 0) break
    const ms = await page.evaluate(async () => {
      const h1 = () => document.querySelector('h1')?.textContent
      const before = h1()
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.startsWith('下一站'))!
      const t0 = performance.now()
      btn.click()
      await new Promise<void>((resolve) => {
        const check = () => (h1() !== before ? resolve() : requestAnimationFrame(check))
        check()
      })
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      return performance.now() - t0
    })
    switches.push(Math.round(ms))
  }
  metrics.stationSwitchMs = switches

  // 开放许可的图：鸣谢写 CC BY 4.0，能点到许可原文和来源网站
  await page.goto('./#/tour/paper/picture-books')
  await page.getByRole('button', { name: /看大图/ }).first().click()
  const viewer = page.locator('.pswp')
  await expect(viewer.getByText(/StoryWeaver \/ Pratham Books，CC BY 4\.0。/)).toBeVisible()
  await expect(viewer.getByRole('link', { name: '许可原文' })).toHaveAttribute('href', /creativecommons\.org\/licenses\/by\/4\.0/)
  await expect(viewer.getByRole('link', { name: /去来源网站看原图/ })).toBeVisible()
  // 等打开动画结束，PhotoSwipe 才响应 Esc
  await page.waitForTimeout(400)
  await shot(page, '05b-viewer-ccby', project)
  await page.keyboard.press('Escape')
  await expect(viewer).toHaveCount(0)

  // 一站里点作品进看图器，单幅评分与收藏，许可信息可见
  await page.goto('./#/tour/book-fairy/nordic-fairy')
  await page.getByRole('button', { name: /看大图/ }).first().click()
  const pswp = page.locator('.pswp')
  await expect(pswp).toBeVisible()
  await expect(pswp.getByText(/维基共享资源，公共领域。/)).toBeVisible()
  await pswp.getByRole('button', { name: '超爱（+2）' }).click()
  await pswp.getByRole('button', { name: '收藏' }).click()
  await expect(pswp.getByRole('button', { name: '已收藏' })).toBeVisible()
  await page.waitForTimeout(400)
  await shot(page, '06-viewer', project)
  await page.keyboard.press('Escape')
  await expect(pswp).toHaveCount(0)

  // 深入了解 → 风格页，给风格评分
  await page.getByRole('link', { name: '深入了解' }).click()
  await expect(page.getByRole('heading', { name: '北欧童话插画' })).toBeVisible()
  await page.getByRole('group', { name: '给这种风格评分' }).getByRole('button', { name: label(2) }).click()
  await expect(page.getByText('你的评分：超爱')).toBeVisible()
  await shot(page, '07-style', project)

  // 外链风格：按钮组（含按风格加的站）和 5 维特征条
  await page.goto('./#/style/manga')
  await expect(page.getByRole('link', { name: /维基百科/ })).toBeVisible()
  await expect(page.getByRole('list', { name: '画面特征' })).toBeVisible()

  // 剪贴簿：在没有开放图的“日本动画美术”加一张图，刷新后还在，导览这一站显示它，最后删除
  await page.goto('./#/style/anime-art')
  await expect(page.getByRole('link', { name: 'Pixiv' })).toBeVisible()
  await page.locator('input[type=file][accept="image/*"]').first().setInputFiles({ name: 'mine.png', mimeType: 'image/png', buffer: samplePng })
  await expect(page.getByText(/存好 1 张/)).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: '看大图：我存的第 1 张' })).toBeVisible()
  await page.goto('./#/tour/anime-games/anime-art')
  await expect(page.getByText('上面是你存的 1 张。还想多看，就去外面找找：')).toBeVisible()
  await shot(page, '08-scrapbook-station', project)
  await page.getByRole('button', { name: '看大图：我存的第 1 张' }).click()
  await expect(page.locator('.pswp').getByText(/我存的图 · 日本动画美术/)).toBeVisible()
  await page.waitForTimeout(400)
  await page.locator('.pswp').getByRole('button', { name: '从剪贴簿删除' }).click()
  await page.locator('.pswp').getByRole('button', { name: '再点一次，确认删除' }).click()
  await expect(page.locator('.pswp')).toHaveCount(0)
  await expect(page.getByText('这种风格还找不到能放进应用的开放图。去外面看看，喜欢的存到相册，再加进剪贴簿：')).toBeVisible()

  // 现代专场：有图的现代风格够了就能开一轮，揭晓按风格分组
  await page.goto('./#/blind')
  await expect(page.getByRole('heading', { name: '现代专场' })).toBeVisible()
  const modernStart = page.getByRole('button', { name: '开始现代专场' })
  if ((await modernStart.count()) > 0) {
    await modernStart.click()
    const modernSession = page.getByRole('region', { name: '盲测' })
    const total = Number((await modernSession.getByText(/^1\/\d+$/).textContent())!.split('/')[1])
    for (let i = 0; i < total; i++) {
      await expect(modernSession.getByText(`${i + 1}/${total}`, { exact: true })).toBeVisible()
      await modernSession.getByRole('button', { name: label(i % 2 === 0 ? 1 : -1) }).click()
    }
    await expect(page.getByText(/现代专场 · 评了/)).toBeVisible()
    metrics.modernRound = total
  } else {
    metrics.modernRound = 'not enough images'
  }

  // 我的 → 数据：导出 → 重置 → 导入，状态一致
  await page.goto('./#/me/data')
  const exportOnce = async () => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '导出备份文件' }).click(),
    ])
    const file = await download.path()
    return { file, json: JSON.parse(fs.readFileSync(file, "utf8")) as { data: Record<string, unknown> } }
  }
  const before = await exportOnce()
  await page.getByRole('button', { name: '清空本机数据' }).click()
  await page.getByRole('button', { name: '确定清空？再点一次' }).click()
  await page.locator('input[type=file]').setInputFiles(before.file)
  await page.getByRole('button', { name: '替换当前数据' }).click()
  await page.waitForTimeout(800)
  const after = await exportOnce()
  const strip = (s: Record<string, unknown>) => ({ ...s, lastBackupAt: undefined })
  expect(strip(after.json.data)).toEqual(strip(before.json.data))

  expect(errors).toEqual([])
  fs.mkdirSync('test-results', { recursive: true })
  fs.writeFileSync(`test-results/metrics-${project}.json`, JSON.stringify(metrics, null, 2))
  console.log(JSON.stringify(metrics))
})
