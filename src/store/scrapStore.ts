import { create } from 'zustand'
import { newScrapId, type ScrapItem } from '../lib/scrapbook'
import {
  clearScrapbook,
  deleteScrapImages,
  getScrapImage,
  loadScrapIndex,
  prepareScrapImages,
  putScrapImages,
  saveScrapIndex,
} from '../lib/scrapStorage'
import { requestPersistentStorage } from '../lib/storage'

/**
 * 剪贴簿的状态（SPEC §4.5）：图的索引放内存，图片本身按需从 IndexedDB 读出来，
 * 生成 blob: 地址缓存到这次打开应用结束（删除时释放）。
 */
interface ScrapStore {
  ready: boolean
  items: ScrapItem[]
  /** id → blob: 地址 */
  thumbs: Record<string, string>
  displays: Record<string, string>
  init: () => Promise<void>
  /** 加进一种风格；返回成功和失败的张数 */
  add: (styleId: string, files: readonly File[], onProgress?: (done: number, total: number) => void) => Promise<{ added: number; failed: number }>
  remove: (id: string) => Promise<void>
  clearAll: () => Promise<void>
  /** 确保这些图的缩略图地址已就绪 */
  loadThumbs: (ids: readonly string[]) => Promise<void>
  /** 打开看图器前取展示图地址 */
  loadDisplays: (ids: readonly string[]) => Promise<Record<string, string>>
}

let initPromise: Promise<void> | undefined

export const useScrapStore = create<ScrapStore>()((setState, getState) => ({
  ready: false,
  items: [],
  thumbs: {},
  displays: {},

  init: () => {
    initPromise ??= loadScrapIndex().then((items) => setState({ items, ready: true }))
    return initPromise
  },

  add: async (styleId, files, onProgress) => {
    await getState().init()
    let added = 0
    let failed = 0
    for (const [i, file] of files.entries()) {
      try {
        const { display, thumb } = await prepareScrapImages(file)
        const item: ScrapItem = {
          id: newScrapId(new Date(), Math.random),
          styleId,
          addedAt: new Date().toISOString(),
          width: display.width,
          height: display.height,
          bytes: display.blob.size,
        }
        await putScrapImages(item.id, display.blob, thumb.blob)
        const items = [...getState().items, item]
        await saveScrapIndex(items)
        setState({
          items,
          thumbs: { ...getState().thumbs, [item.id]: URL.createObjectURL(thumb.blob) },
        })
        added++
      } catch {
        failed++
      }
      onProgress?.(i + 1, files.length)
    }
    // 存了图就申请持久存储，免得浏览器清缓存时丢掉（SPEC §10.5）
    if (added > 0) void requestPersistentStorage()
    return { added, failed }
  },

  remove: async (id) => {
    const items = getState().items.filter((i) => i.id !== id)
    await saveScrapIndex(items)
    await deleteScrapImages(id)
    const { [id]: thumb, ...thumbs } = getState().thumbs
    const { [id]: display, ...displays } = getState().displays
    if (thumb) URL.revokeObjectURL(thumb)
    if (display) URL.revokeObjectURL(display)
    setState({ items, thumbs, displays })
  },

  clearAll: async () => {
    const { items, thumbs, displays } = getState()
    await clearScrapbook(items.map((i) => i.id))
    for (const url of [...Object.values(thumbs), ...Object.values(displays)]) URL.revokeObjectURL(url)
    setState({ items: [], thumbs: {}, displays: {} })
  },

  loadThumbs: async (ids) => {
    const missing = ids.filter((id) => !getState().thumbs[id])
    if (missing.length === 0) return
    const loaded: Record<string, string> = {}
    for (const id of missing) {
      const blob = await getScrapImage(id, 'thumb').catch(() => undefined)
      if (blob) loaded[id] = URL.createObjectURL(blob)
    }
    setState({ thumbs: { ...getState().thumbs, ...loaded } })
  },

  loadDisplays: async (ids) => {
    const missing = ids.filter((id) => !getState().displays[id])
    const loaded: Record<string, string> = {}
    for (const id of missing) {
      const blob = await getScrapImage(id, 'display').catch(() => undefined)
      if (blob) loaded[id] = URL.createObjectURL(blob)
    }
    const displays = { ...getState().displays, ...loaded }
    setState({ displays })
    return displays
  },
}))
