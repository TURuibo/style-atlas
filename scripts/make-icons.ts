/**
 * 生成 PWA 图标（public/icons/）。只用几何图形，不依赖字体。
 * 用法：npx tsx scripts/make-icons.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { root } from './lib/load-content'

const ink = '#1F3A5F'
const paper = '#F7F5F0'
const vermilion = '#C8553D'

/** 墨蓝底、米白圆日、三道浪纹：取浮世绘与地图等高线的意思 */
function svg(size: number, padding: number): string {
  const s = size
  const inner = s - padding * 2
  const cx = s / 2
  const sunR = inner * 0.2
  const wave = (y: number, amp: number) =>
    `M${padding} ${y} C ${padding + inner * 0.25} ${y - amp}, ${padding + inner * 0.5} ${y + amp}, ${padding + inner * 0.75} ${y} S ${s - padding} ${y - amp * 0.6}, ${s - padding} ${y}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" fill="${ink}"/>
  <circle cx="${cx + inner * 0.12}" cy="${padding + inner * 0.36}" r="${sunR}" fill="${vermilion}"/>
  <g fill="none" stroke="${paper}" stroke-width="${inner * 0.045}" stroke-linecap="round">
    <path d="${wave(padding + inner * 0.62, inner * 0.07)}"/>
    <path d="${wave(padding + inner * 0.74, inner * 0.06)}" opacity="0.8"/>
    <path d="${wave(padding + inner * 0.86, inner * 0.05)}" opacity="0.6"/>
  </g>
</svg>`
}

const outDir = path.join(root, 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

const targets: { file: string; size: number; padding: number }[] = [
  { file: 'icon-192.png', size: 192, padding: 0 },
  { file: 'icon-512.png', size: 512, padding: 0 },
  { file: 'icon-maskable-512.png', size: 512, padding: 64 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0 },
]

for (const t of targets) {
  await sharp(Buffer.from(svg(t.size, t.padding))).png().toFile(path.join(outDir, t.file))
}
fs.writeFileSync(path.join(outDir, 'favicon.svg'), svg(64, 0))
console.log(`图标已生成：${targets.map((t) => t.file).join('、')}、favicon.svg`)
