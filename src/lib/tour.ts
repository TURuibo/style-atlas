/**
 * 导览的站序（SPEC §4.4）；纯函数。
 * 章分两组：现代线路的各段（modern，2026-11-11 起的主线）和九大类（history，首页上叫“溯源”）。
 * 同一种风格可以同时是某一段和它所属大类里的一站，所以站用“章 + 风格”来定位。
 */

export type ChapterGroup = 'modern' | 'history'

export interface StationRef {
  /** 章的 id：线路段 id 或大类 id */
  chapter: string
  style: string
}

export interface ChapterLike {
  id: string
  group: ChapterGroup
  /** 本章已上线的站，按站序 */
  styles: readonly string[]
}

function stationsOf(chapters: readonly ChapterLike[], group: ChapterGroup | undefined): StationRef[] {
  return chapters
    .filter((c) => c.group === group)
    .flatMap((c) => c.styles.map((style) => ({ chapter: c.id, style })))
}

const groupOf = (chapters: readonly ChapterLike[], chapterId: string) =>
  (chapters.find((c) => c.id === chapterId) ?? chapters[0])?.group

/**
 * 下一站：本章下一种；本章走完就到同组下一个有内容的章的第一站；整组走完返回 null。
 * 找不到当前站时，返回当前组的第一站。
 */
export function nextStation(chapters: readonly ChapterLike[], current: StationRef): StationRef | null {
  const flat = stationsOf(chapters, groupOf(chapters, current.chapter))
  const i = flat.findIndex((s) => s.chapter === current.chapter && s.style === current.style)
  if (i < 0) return flat[0] ?? null
  return flat[i + 1] ?? null
}

export function previousStation(chapters: readonly ChapterLike[], current: StationRef): StationRef | null {
  const flat = stationsOf(chapters, groupOf(chapters, current.chapter))
  const i = flat.findIndex((s) => s.chapter === current.chapter && s.style === current.style)
  return i > 0 ? flat[i - 1]! : null
}

/** 章节进度：看过几站 / 本章已上线几站 */
export function chapterProgress(styles: readonly string[], visited: readonly string[]): { seen: number; total: number } {
  const set = new Set(visited)
  return { seen: styles.filter((s) => set.has(s)).length, total: styles.length }
}

/** 一种风格在导览里的“家”：在现代线路上就回到那一段，否则回到它的大类 */
export function homeChapterOf(chapters: readonly ChapterLike[], styleId: string, familyId: string): string {
  return chapters.find((c) => c.group === 'modern' && c.styles.includes(styleId))?.id ?? familyId
}
