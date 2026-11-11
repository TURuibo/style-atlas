/** 把候选拼成带编号的联系表，供挑图时一眼看完（SPEC §10.4 第 2 步） */
import sharp, { type OverlayOptions } from 'sharp'
import { getBuffer } from './http'
import type { Candidate } from './types'

const CELL = 240
const PAD = 8
const LABEL = 30
const COLS = 5

const escapeXml = (s: string) => s.replace(/[<>&"']/g, (ch) => `&#${ch.charCodeAt(0)};`)

function label(text: string, background: string): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${LABEL}">` +
      `<rect width="100%" height="100%" fill="${background}"/>` +
      `<text x="8" y="21" font-family="DejaVu Sans, Arial, sans-serif" font-size="17" font-weight="bold" fill="#ffffff">${escapeXml(text)}</text>` +
      `</svg>`,
  )
}

export async function makeContactSheet(candidates: Candidate[], outPath: string): Promise<string[]> {
  const failures: string[] = []
  const rows = Math.max(1, Math.ceil(candidates.length / COLS))
  const width = COLS * (CELL + PAD) + PAD
  const height = rows * (CELL + LABEL + PAD) + PAD
  const layers: OverlayOptions[] = []

  for (const [i, c] of candidates.entries()) {
    const left = PAD + (i % COLS) * (CELL + PAD)
    const top = PAD + Math.floor(i / COLS) * (CELL + LABEL + PAD)
    let ok = true
    try {
      const buf = await getBuffer(c.previewUrl)
      const img = await sharp(buf, { limitInputPixels: false })
        .rotate()
        .resize(CELL, CELL, { fit: 'contain', background: '#ffffff' })
        .jpeg({ quality: 82 })
        .toBuffer()
      layers.push({ input: img, left, top })
    } catch (error) {
      ok = false
      failures.push(`#${c.n} 预览图下载失败：${String(error).slice(0, 160)}`)
      const blank = await sharp({ create: { width: CELL, height: CELL, channels: 3, background: '#dddddd' } })
        .jpeg()
        .toBuffer()
      layers.push({ input: blank, left, top })
    }
    // 标签：编号 · 来源 · 源图长边（已知时）
    const longEdge = c.width && c.height ? ` · ${Math.max(c.width, c.height)}` : ''
    const text = `${c.n} · ${c.source}${longEdge}${ok ? '' : ' ×'}`
    layers.push({ input: label(text, ok ? '#1F3A5F' : '#9B2C2C'), left, top: top + CELL })
  }

  await sharp({ create: { width, height, channels: 3, background: '#F7F5F0' } })
    .composite(layers)
    .jpeg({ quality: 78 })
    .toFile(outPath)
  return failures
}
