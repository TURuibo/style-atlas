/**
 * 剪贴簿（SPEC §4.5，2026-11-11 起）：你从相册加进来的图，按风格归档，只存本机 IndexedDB。
 * 这里是纯函数：尺寸换算、排序、计数、id。读写存储见 scrapStorage.ts。
 */

export interface ScrapItem {
  /** my- 开头，和作品 id 区分 */
  id: string
  styleId: string
  addedAt: string
  /** 存下来的展示图尺寸（长边不超过 SCRAP_MAX_EDGE） */
  width: number
  height: number
  /** 展示图的字节数，用来显示占用空间 */
  bytes: number
}

/** 展示图长边上限，与应用里的作品图一致（SPEC §8.2 第 1 条） */
export const SCRAP_MAX_EDGE = 1600
export const SCRAP_THUMB_EDGE = 480

/** 等比缩小到长边不超过 maxEdge，不放大；结果是至少为 1 的整数 */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 1, height: 1 }
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** 某风格的剪贴簿图，新加的在前 */
export function scrapsOfStyle(items: readonly ScrapItem[], styleId: string): ScrapItem[] {
  return items.filter((i) => i.styleId === styleId).sort((a, b) => b.addedAt.localeCompare(a.addedAt))
}

/** 每种风格存了几张，按数量从多到少 */
export function scrapCounts(items: readonly ScrapItem[]): { styleId: string; count: number; latest: string }[] {
  const map = new Map<string, { count: number; latest: string }>()
  for (const item of items) {
    const prev = map.get(item.styleId)
    map.set(item.styleId, {
      count: (prev?.count ?? 0) + 1,
      latest: prev && prev.latest > item.addedAt ? prev.latest : item.addedAt,
    })
  }
  return [...map.entries()]
    .map(([styleId, v]) => ({ styleId, ...v }))
    .sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest))
}

/** 新图的 id：时间加随机数，换设备导入也不会撞 */
export function newScrapId(now: Date, random: () => number): string {
  const rand = Math.floor(random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0')
  return `my-${now.getTime().toString(36)}${rand}`
}

/** 字节数写成“1.2 MB”这样 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
