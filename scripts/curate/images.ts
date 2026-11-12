/** 下载选中的作品，生成两档 WebP 和色板（SPEC §8.2 第 1 条） */
import fs from 'node:fs'
import path from 'node:path'
import sharp, { type ResizeOptions, type Sharp } from 'sharp'
import { getBuffer } from './http'
import { kmeansPalette, type RGB } from './palette'
import { commonsOriginalUrl, detectPixelGrid, downsampleToGrid, integerScale, type RawImage } from './pixel'
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

async function download(urls: (string | undefined)[]): Promise<Buffer> {
  let lastError: unknown
  for (const url of urls) {
    if (!url) continue
    try {
      return await getBuffer(url)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

/** 无损 WebP；超出体积上限时退到有损 */
async function pixelWebp(pipeline: Sharp, maxBytes: number) {
  const lossless = await pipeline.clone().webp({ lossless: true }).toBuffer({ resolveWithObject: true })
  if (lossless.data.length <= maxBytes) return lossless
  for (const quality of [90, 80, 70, 60]) {
    const lossy = await pipeline.clone().webp({ quality, smartSubsample: true }).toBuffer({ resolveWithObject: true })
    if (lossy.data.length <= maxBytes || quality === 60) return lossy
  }
  throw new Error('unreachable')
}

/** 像素画：还原原始像素，再按整数倍、最近邻放大；原图比框还大时只能缩小，用默认的平滑缩小，免得细线被丢掉 */
async function pixelVariant(native: RawImage, maxW: number, maxH: number, maxBytes: number) {
  const base = sharp(Buffer.from(native.data), {
    raw: { width: native.width, height: native.height, channels: native.channels as 1 | 2 | 3 | 4 },
  })
  const s = integerScale(native.width, native.height, maxW, maxH)
  const resized =
    s >= 1
      ? base.resize(native.width * s, native.height * s, { kernel: 'nearest' })
      : base.resize({ width: maxW, height: maxH, fit: 'inside' })
  return pixelWebp(resized, maxBytes)
}

/** 下载并写出 public/img/art/<id>-480.webp 与 -1600.webp */
export async function processCandidate(
  c: Candidate,
  artworkId: string,
  publicDir: string,
  options: { pixelated?: boolean } = {},
): Promise<ProcessedImage & { pixelGrid?: number }> {
  const urls = options.pixelated ? [commonsOriginalUrl(c.fullUrl), c.fullUrl, c.previewUrl] : [c.fullUrl, c.previewUrl]
  const input = await download(urls)
  const outDir = path.join(publicDir, 'img', 'art')
  fs.mkdirSync(outDir, { recursive: true })
  const meta = await sharp(input, { limitInputPixels: false }).rotate().metadata()
  const rotated = (meta.orientation ?? 1) >= 5
  const inputWidth = (rotated ? meta.height : meta.width) ?? 0
  const inputHeight = (rotated ? meta.width : meta.height) ?? 0

  if (options.pixelated) {
    // 透明背景铺成白色，网格只在 RGB 上找
    const { data, info } = await sharp(input, { limitInputPixels: false })
      .rotate()
      .flatten({ background: '#ffffff' })
      .raw()
      .toBuffer({ resolveWithObject: true })
    const raw: RawImage = { data, width: info.width, height: info.height, channels: info.channels }
    const grid = detectPixelGrid(raw)
    const native = downsampleToGrid(raw, grid)
    const display = await pixelVariant(native, 1600, 1600, DISPLAY_MAX_BYTES)
    const thumb = await pixelVariant(native, 480, 960, THUMB_MAX_BYTES)
    fs.writeFileSync(path.join(outDir, `${artworkId}-1600.webp`), display.data)
    fs.writeFileSync(path.join(outDir, `${artworkId}-480.webp`), thumb.data)
    const nativePng = await sharp(Buffer.from(native.data), {
      raw: { width: native.width, height: native.height, channels: native.channels as 1 | 2 | 3 | 4 },
    })
      .png()
      .toBuffer()
    return {
      width: display.info.width,
      height: display.info.height,
      inputWidth,
      inputHeight,
      palette: await paletteOf(nativePng),
      pixelGrid: grid.k,
    }
  }

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
