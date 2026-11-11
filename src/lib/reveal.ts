/** 盲测揭晓（SPEC §4.3）：按大类分组、一句总结、题材提醒。纯函数。 */
import type { Artwork, Family, Style } from '../content/schema'
import type { BlindRound, Rating, Score } from './storage'

export interface RevealItem {
  artworkId: string
  styleId: string
  score?: Score
}

export interface RevealGroup {
  family: Family
  items: RevealItem[]
}

/** 本轮每张图在本轮里得到的分数（跳过的没有分） */
export function roundScores(round: BlindRound, ratings: readonly Rating[]): Map<string, Score> {
  const scores = new Map<string, Score>()
  for (const r of ratings) {
    if (r.target !== 'artwork' || r.context !== 'blind' || r.at < round.startedAt) continue
    if (round.completedAt && r.at > round.completedAt) continue
    if (round.artworkIds.includes(r.id)) scores.set(r.id, r.score)
  }
  return scores
}

export function revealGroups(
  round: BlindRound,
  scores: ReadonlyMap<string, Score>,
  artworksById: ReadonlyMap<string, Artwork>,
  stylesById: ReadonlyMap<string, Style>,
  families: readonly Family[],
): RevealGroup[] {
  const items = round.artworkIds.flatMap((id): (RevealItem & { family: string })[] => {
    const art = artworksById.get(id)
    const style = art?.styleIds.map((s) => stylesById.get(s)).find(Boolean)
    if (!art || !style) return []
    return [{ artworkId: id, styleId: style.id, family: style.family, score: scores.get(id) }]
  })
  return families
    .map((family) => ({
      family,
      items: items.filter((i) => i.family === family.id).map(({ family: _f, ...rest }) => rest),
    }))
    .filter((g) => g.items.length > 0)
}

/** 顶部一句总结：高分（喜欢、超爱）最多的大类，并列时最多说两个 */
export function revealSummary(groups: readonly RevealGroup[]): string {
  const counts = groups
    .map((g) => ({ name: g.family.nameZh, high: g.items.filter((i) => (i.score ?? 0) >= 1).length }))
    .filter((c) => c.high > 0)
    .sort((a, b) => b.high - a.high)
  if (counts.length === 0) return '这一轮没有给出“喜欢”以上的分。换一轮，或者去导览慢慢看。'
  const top = counts.filter((c) => c.high === counts[0]!.high).slice(0, 2)
  return `你给高分最多的是${top.map((c) => c.name).join('、')}。`
}

/** 题材提醒：高分图里同一题材占 60% 以上时提示（至少 3 张高分图才说） */
export function subjectHint(
  groups: readonly RevealGroup[],
  artworksById: ReadonlyMap<string, Artwork>,
  subjectNames: Readonly<Record<string, string>>,
): string | null {
  const high = groups.flatMap((g) => g.items).filter((i) => (i.score ?? 0) >= 1)
  if (high.length < 3) return null
  const counts = new Map<string, number>()
  for (const item of high)
    for (const s of artworksById.get(item.artworkId)?.subjects ?? []) counts.set(s, (counts.get(s) ?? 0) + 1)
  const [subject, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
  if (!subject || !count || count / high.length < 0.6) return null
  const name = subjectNames[subject] ?? subject
  return `高分图里 ${Math.round((count / high.length) * 100)}% 是${name}：可能你喜欢的是${name}题材，而不只是画风。`
}
