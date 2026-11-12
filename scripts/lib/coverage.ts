/** 图片覆盖报告（SPEC §10.4 第 6 步）：每种风格的图数、来源、作者数和降级情况。纯函数，便于测试。 */
import type { ContentBundle } from '../../src/content/schema'

const sourceNames: Record<string, string> = {
  met: 'Met',
  aic: 'AIC',
  cma: 'CMA',
  commons: 'Commons',
  loc: 'LoC',
  pratham: 'StoryWeaver',
}

const modeNames: Record<string, string> = {
  'public-domain': '真迹',
  mixed: '混合',
  'open-license': '开放许可',
  'external-only': '外链',
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

/**
 * 粗略区分作者：去掉“Attributed to”等前缀、括号里的生卒年和汉字写法，取最后一个词（多为姓），
 * 这样 “Alphonse Mucha” 和 “Alphonse Marie Mucha” 算同一人。只用于报告里的“作者数（约）”。
 */
export function artistKey(artist: string | undefined): string | null {
  if (!artist) return null
  const name = artist
    .replace(/^(painting attributed to|attributed to|after|style of|workshop of|circle of|designed by)\s+/i, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[\u3040-\u30ff\u3400-\u9fff]+/g, ' ')
    .trim()
    .toLowerCase()
  if (!name || /^(unidentified|unknown)/.test(name)) return null
  return name.split(/\s+/).at(-1) ?? null
}

export function coverageReport(bundle: ContentBundle, fileSize: (relative: string) => number, today: string): string {
  const lines: string[] = []
  const byStyle = new Map<string, ContentBundle['artworks']>()
  for (const art of bundle.artworks)
    for (const id of art.styleIds) byStyle.set(id, [...(byStyle.get(id) ?? []), art])

  const totalBytes = bundle.artworks.reduce((sum, a) => sum + fileSize(a.img.thumb) + fileSize(a.img.display), 0)
  const planned = bundle.families.reduce((sum, f) => sum + f.planned, 0)
  const ready = bundle.styles.filter((s) => s.status === 'ready').length

  lines.push('# 图片覆盖报告', '')
  lines.push(`由 \`npm run coverage\` 生成，请勿手改。生成日期：${today}。`, '')
  lines.push(
    `已写 ${bundle.styles.length} / 计划 ${planned} 种风格（ready ${ready}）；` +
      `作品 ${bundle.artworks.length} 幅；图片合计 ${mb(totalBytes)}（上限 150 MB）。`,
    '',
  )

  for (const family of bundle.families) {
    const styles = bundle.styles.filter((s) => s.family === family.id).sort((a, b) => a.era.start - b.era.start)
    lines.push(`## ${family.nameZh}（${styles.length} / ${family.planned}）`, '')
    const todo = bundle.plan.filter((p) => p.family === family.id && !styles.some((s) => s.id === p.id))
    const todoLine = todo.length ? `还没写：${todo.map((p) => p.nameZh).join('、')}。` : ''
    if (styles.length === 0) {
      lines.push(todoLine || '还没有写。', '')
      continue
    }
    lines.push('| 风格 | 状态 | 方式 | 图数 | 来源 | 作者数（约） | 封面 | 体积 |', '| --- | --- | --- | --- | --- | --- | --- | --- |')
    for (const style of styles) {
      const arts = byStyle.get(style.id) ?? []
      const sources = Object.entries(
        arts.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.source]: (acc[a.source] ?? 0) + 1 }), {}),
      )
        .map(([s, n]) => `${sourceNames[s] ?? s} ${n}`)
        .join('、')
      const artists = new Set(arts.map((a) => artistKey(a.artist)).filter(Boolean)).size
      const bytes = arts.reduce((sum, a) => sum + fileSize(a.img.thumb) + fileSize(a.img.display), 0)
      const imageCell = style.imageMode === 'external-only' ? '—' : String(arts.length)
      lines.push(
        `| ${style.nameZh} \`${style.id}\` | ${style.status} | ${modeNames[style.imageMode] ?? style.imageMode} | ` +
          `${imageCell} | ${sources || '—'} | ${style.imageMode === 'external-only' ? '—' : artists} | ` +
          `${style.imageMode === 'external-only' ? '—' : style.coverArtworkId ? '有' : '缺'} | ${arts.length ? mb(bytes) : '—'} |`,
      )
    }
    lines.push('')
    if (todoLine) lines.push(todoLine, '')
  }

  const external = bundle.styles.filter((s) => s.imageMode === 'external-only')
  const thin = bundle.styles.filter((s) => s.imageMode !== 'external-only' && (byStyle.get(s.id)?.length ?? 0) < 4)
  lines.push('## 降级与缺口', '')
  lines.push(
    external.length
      ? `- 外链风格（找不到开放图，只给搜索链接）：${external.map((s) => s.nameZh).join('、')}`
      : '- 外链风格：无',
  )
  lines.push(thin.length ? `- 配图不足 4 幅：${thin.map((s) => s.nameZh).join('、')}` : '- 配图不足 4 幅：无')
  lines.push('')
  return lines.join('\n')
}
