/** 导览的站序（SPEC §4.4）：章按大类顺序，章内按起始年份；纯函数。 */

export interface StationRef {
  family: string
  style: string
}

/**
 * chapters：按顺序排好的章，每章是按顺序排好的风格 id。
 * 下一站：本章下一种；本章走完就到下一个有内容的章的第一站；全部走完返回 null。
 */
export function nextStation(chapters: readonly { family: string; styles: readonly string[] }[], current: StationRef): StationRef | null {
  const flat = chapters.flatMap((c) => c.styles.map((style) => ({ family: c.family, style })))
  const i = flat.findIndex((s) => s.family === current.family && s.style === current.style)
  if (i < 0) return flat[0] ?? null
  return flat[i + 1] ?? null
}

export function previousStation(
  chapters: readonly { family: string; styles: readonly string[] }[],
  current: StationRef,
): StationRef | null {
  const flat = chapters.flatMap((c) => c.styles.map((style) => ({ family: c.family, style })))
  const i = flat.findIndex((s) => s.family === current.family && s.style === current.style)
  return i > 0 ? flat[i - 1]! : null
}

/** 章节进度：看过几站 / 本章已上线几站 */
export function chapterProgress(styles: readonly string[], visited: readonly string[]): { seen: number; total: number } {
  const set = new Set(visited)
  return { seen: styles.filter((s) => set.has(s)).length, total: styles.length }
}
