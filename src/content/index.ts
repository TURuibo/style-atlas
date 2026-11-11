import type { ChapterGroup } from '../lib/tour'
import raw from './generated/content.json'
import type { Artwork, ContentBundle, Family, Style } from './schema'

/** 构建时生成的内容包（npm run content:build） */
export const content = raw as unknown as ContentBundle

export const familiesById = new Map<string, Family>(content.families.map((f) => [f.id, f]))
export const stylesById = new Map<string, Style>(content.styles.map((s) => [s.id, s]))
export const artworksById = new Map<string, Artwork>(content.artworks.map((a) => [a.id, a]))
export const planById = new Map(content.plan.map((p) => [p.id, p]))

/** 风格的中文名：写好的取风格文件，没写的取计划清单 */
export function styleNameZh(id: string): string {
  return stylesById.get(id)?.nameZh ?? planById.get(id)?.nameZh ?? id
}

const byEra = (a: Style, b: Style) => a.era.start - b.era.start || a.nameZh.localeCompare(b.nameZh, 'zh')

export function stylesOfFamily(familyId: string): Style[] {
  return content.styles.filter((s) => s.family === familyId).sort(byEra)
}

export function stylesOfRegion(regionId: string): Style[] {
  return content.styles.filter((s) => s.regions.includes(regionId)).sort(byEra)
}

/** 某风格的作品，封面排第一 */
export function artworksOfStyle(styleId: string): Artwork[] {
  const cover = stylesById.get(styleId)?.coverArtworkId
  const own = content.artworks.filter((a) => a.styleIds.includes(styleId))
  return [...own.filter((a) => a.id === cover), ...own.filter((a) => a.id !== cover)]
}

export function coverOfStyle(style: Style): Artwork | undefined {
  const own = artworksOfStyle(style.id)
  return own.find((a) => a.id === style.coverArtworkId) ?? own.at(0)
}

/** public/ 下的文件路径 → 带部署路径的 URL；blob:、data:、http(s): 地址原样返回（剪贴簿的图） */
export function publicUrl(path: string): string {
  if (/^(blob:|data:|https?:)/.test(path)) return path
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

export const familyName = (id: string) => content.vocab.families[id] ?? id
export const regionName = (id: string) => content.vocab.regions[id] ?? id
export const moodName = (id: string) => content.vocab.moods[id] ?? id
export const mediumName = (id: string) => content.vocab.mediums[id] ?? id
export const subjectNames: Readonly<Record<string, string>> = content.vocab.subjects
export const subjectName = (id: string) => subjectNames[id] ?? id

/**
 * 导览的章（SPEC §4.4）。现代线路的各段在前（route.yaml 的顺序和站序），
 * 九大类在后（“溯源”：大类顺序，站按起始年份）。没写的风格放进 upcoming，章节页列为“待上线”。
 */
export interface Chapter {
  id: string
  group: ChapterGroup
  /** 组内序号，从 1 开始：现代线路第几段 / 第几章 */
  number: number
  nameZh: string
  nameEn: string
  glance: string
  summary: string
  traits: string[]
  coverArtworkIds: string[]
  styles: string[]
  upcoming: string[]
  /** 计划中的风格数 */
  planned: number
}

const writtenIds = new Set(content.styles.map((s) => s.id))

export const modernChapters: Chapter[] = content.route.chapters.map((c, i) => ({
  id: c.id,
  group: 'modern',
  number: i + 1,
  nameZh: c.nameZh,
  nameEn: c.nameEn,
  glance: c.glance,
  summary: c.summary,
  traits: c.traits,
  coverArtworkIds: c.coverArtworkIds,
  styles: c.styles.filter((id) => writtenIds.has(id)),
  upcoming: c.styles.filter((id) => !writtenIds.has(id)),
  planned: c.styles.length,
}))

export const historyChapters: Chapter[] = content.families.map((f) => ({
  id: f.id,
  group: 'history',
  number: f.order,
  nameZh: f.nameZh,
  nameEn: f.nameEn,
  glance: f.glance,
  summary: f.summary,
  traits: f.traits,
  coverArtworkIds: f.coverArtworkIds,
  styles: stylesOfFamily(f.id).map((s) => s.id),
  upcoming: content.plan.filter((p) => p.family === f.id && !writtenIds.has(p.id)).map((p) => p.id),
  planned: f.planned,
}))

export const tourChapters: Chapter[] = [...modernChapters, ...historyChapters]
export const chaptersById = new Map(tourChapters.map((c) => [c.id, c]))

/** 现代线路上已上线的风格（盲测“现代专场”从这些风格里抽图） */
export const modernStyleIds: ReadonlySet<string> = new Set(modernChapters.flatMap((c) => c.styles))

/** 章的称呼：“现代线路 · 第 2 段”或“第 3 章” */
export function chapterLabel(chapter: Chapter): string {
  return chapter.group === 'modern' ? `现代线路 · 第 ${chapter.number} 段` : `溯源 · 第 ${chapter.number} 章`
}

export interface EraBucket {
  id: string
  zh: string
  start: number
  end: number
  weight: number
}

/** 年代段（SPEC §5.3），按时间排序，首尾补成开区间 */
export const eras: EraBucket[] = Object.entries(content.vocab.eras)
  .map(([id, e]) => ({ id, zh: e.zh, start: e.start ?? -5000, end: e.end ?? 2100, weight: e.weight }))
  .sort((a, b) => a.start - b.start)

/** 风格起止年份覆盖到的年代段 */
export function erasOfStyle(style: Style): EraBucket[] {
  const end = style.era.end ?? new Date().getFullYear()
  return eras.filter((e) => style.era.start < e.end && end >= e.start)
}

/** 年份 → 中文写法，公元前用“前” */
export function formatYear(year: number): string {
  return year < 0 ? `前 ${-year}` : String(year)
}
