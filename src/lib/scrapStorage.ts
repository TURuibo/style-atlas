import { createStore, del, delMany, get, set } from 'idb-keyval'
import { fitWithin, SCRAP_MAX_EDGE, SCRAP_THUMB_EDGE, type ScrapItem } from './scrapbook'

/**
 * 剪贴簿的存储：单独一个 IndexedDB 库，不和评分等用户状态混在一起，不进备份文件（SPEC §4.5、§8.2 第 5 条）。
 * 图片存成 ArrayBuffer（老版本 Safari 存 Blob 不稳）。
 */
const store = typeof indexedDB === 'undefined' ? undefined : createStore('style-atlas-scrapbook', 'scraps')
const INDEX_KEY = 'index'
const imageKey = (id: string, kind: 'display' | 'thumb') => `${kind}:${id}`

interface StoredImage {
  type: string
  data: ArrayBuffer
}

export async function loadScrapIndex(): Promise<ScrapItem[]> {
  if (!store) return []
  try {
    const raw = await get<ScrapItem[]>(INDEX_KEY, store)
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export async function saveScrapIndex(items: ScrapItem[]): Promise<void> {
  if (!store) return
  await set(INDEX_KEY, items, store)
}

export async function putScrapImages(id: string, display: Blob, thumb: Blob): Promise<void> {
  if (!store) throw new Error('这个浏览器不支持本机存储')
  const pack = async (blob: Blob): Promise<StoredImage> => ({ type: blob.type || 'image/jpeg', data: await blob.arrayBuffer() })
  await set(imageKey(id, 'display'), await pack(display), store)
  await set(imageKey(id, 'thumb'), await pack(thumb), store)
}

export async function getScrapImage(id: string, kind: 'display' | 'thumb'): Promise<Blob | undefined> {
  if (!store) return undefined
  const raw = await get<StoredImage>(imageKey(id, kind), store)
  return raw ? new Blob([raw.data], { type: raw.type }) : undefined
}

export async function deleteScrapImages(id: string): Promise<void> {
  if (!store) return
  await delMany([imageKey(id, 'display'), imageKey(id, 'thumb')], store)
}

export async function clearScrapbook(ids: readonly string[]): Promise<void> {
  if (!store) return
  await delMany(
    ids.flatMap((id) => [imageKey(id, 'display'), imageKey(id, 'thumb')]),
    store,
  )
  await del(INDEX_KEY, store)
}

/** 读一张相册里的图，缩到长边不超过 maxEdge，编码成 JPEG。iOS 选图时会把 HEIC 转成 JPEG。 */
export async function resizeImage(file: Blob, maxEdge: number, quality = 0.85): Promise<{ blob: Blob; width: number; height: number }> {
  const source = await decode(file)
  try {
    const size = fitWithin(source.width, source.height, maxEdge)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('画布不可用')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source.image, 0, 0, size.width, size.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('图片编码失败')
    return { blob, ...size }
  } finally {
    source.release()
  }
}

/** 同时做展示图和缩略图 */
export async function prepareScrapImages(file: Blob) {
  const display = await resizeImage(file, SCRAP_MAX_EDGE)
  const thumb = await resizeImage(display.blob, SCRAP_THUMB_EDGE, 0.8)
  return { display, thumb }
}

async function decode(file: Blob): Promise<{ image: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() }
    } catch {
      // 退回到 <img> 解码
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { image: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}
