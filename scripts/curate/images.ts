/** 下载选中的作品，生成两档 WebP 和色板（SPEC §8.2 第 1 条） */
import fs from 'node:fs'
import path from 'node:path'
import sharp, { type ResizeOptions } from 'sharp'
import { getBuffer } from './http'
import { kmeansPalette, type RGB } from './palette'
import type { Candidate } from './types'

sharp.cache(false)

const THUMB_MAX_BYTES = 60 * 1024
const DISPLAY_MAX_BYTES = 300 * 1024

async function webpUnder(input: Buffer, resize: ResizeOptions, maxBytes: number) {
  for (const quality of [80, 70, 60, 50, 40]) {
    const { data, info } = await sharp(input, { limitInputPixels: false })
      .rotate()
      .resize(resize)
      .webp({ quality })
      .toBuffer({ resolveWithObject: true })
    if (data.length <= maxBytes || quality === 40) return { data, info }
  }
  throw new Error('unreachable')
}

export async function paletteOf(input: Buffer): Promise<string[]> {
  const { data, info } = await sharp(input, { limitInputPixels: false })
    .resize(64, 64, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const pixels: RGB[] = []
  for (let i = 0; i + 2 < data.length; i += info.channels) pixels.push([data[i]!, data[i + 1]!, data[i + 2]!])
  return kmeansPalette(pixels, 5)
}

export interface ProcessedImage {
  width: number
  height: number
  /** 实际下载到的图的尺寸 */
  inputWidth: number
  inputHeight: number
  palette: string[]
}

/** 下载并写出 public/img/art/<id>-480.webp 与 -1600.webp */
export async function processCandidate(c: Candidate, artworkId: string, publicDir: string): Promise<ProcessedImage> {
  let input: Buffer
  try {
    input = await getBuffer(c.fullUrl)
  } catch {
    input = await getBuffer(c.previewUrl)
  }
  const outDir = path.join(publicDir, 'img', 'art')
  fs.mkdirSync(outDir, { recursive: true })
  const meta = await sharp(input, { limitInputPixels: false }).rotate().metadata()
  const rotated = (meta.orientation ?? 1) >= 5
  const inputWidth = (rotated ? meta.height : meta.width) ?? 0
  const inputHeight = (rotated ? meta.width : meta.height) ?? 0

  const display = await webpUnder(input, { width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }, DISPLAY_MAX_BYTES)
  const thumb = await webpUnder(input, { width: 480, height: 960, fit: 'inside', withoutEnlargement: true }, THUMB_MAX_BYTES)
  fs.writeFileSync(path.join(outDir, `${artworkId}-1600.webp`), display.data)
  fs.writeFileSync(path.join(outDir, `${artworkId}-480.webp`), thumb.data)

  return {
    width: display.info.width,
    height: display.info.height,
    inputWidth,
    inputHeight,
    palette: await paletteOf(input),
  }
}
