/**
 * 盲测抽图（SPEC §4.2）。纯函数，随机数从外面传入，便于测试。
 * 首轮 24 张：每个有图的大类至少 2 张，其余用来平衡 5 个画面维度和题材；同一风格不连续出现。
 * 之后每轮 12 张：Phase 4 换成 §9.5 的自适应规则，这里先按“没盲测过的优先”抽。
 */
import type { Artwork, Attributes, Style } from '../content/schema'
import { attributeKeys } from '../content/schema'
import { shuffle } from './random'

export const FIRST_ROUND_SIZE = 24
export const NEXT_ROUND_SIZE = 12
const MIN_PER_FAMILY = 2

export interface BlindCandidate {
  id: string
  styleId: string
  family: string
  attributes: Attributes
  subjects: string[]
}

/** 能进盲测的作品：作品允许、所属风格已上线且有图 */
export function blindCandidates(artworks: readonly Artwork[], stylesById: ReadonlyMap<string, Style>): BlindCandidate[] {
  const out: BlindCandidate[] = []
  for (const art of artworks) {
    if (!art.blindEligible) continue
    const style = art.styleIds.map((id) => stylesById.get(id)).find((s) => s && s.status === 'ready')
    if (!style || style.imageMode === 'external-only') continue
    out.push({
      id: art.id,
      styleId: style.id,
      family: style.family,
      attributes: { ...style.attributes, ...art.attributes },
      subjects: art.subjects,
    })
  }
  return out
}

/** 每维分成低（≤−1）、中、高（≥1）三档，用来数覆盖 */
const band = (v: number) => (v <= -1 ? 'lo' : v >= 1 ? 'hi' : 'mid')

function pickBalanced(
  candidates: readonly BlindCandidate[],
  size: number,
  random: () => number,
  seed: BlindCandidate[] = [],
): BlindCandidate[] {
  const picked = [...seed]
  const styleCount = new Map<string, number>()
  const familyCount = new Map<string, number>()
  const bandCount = new Map<string, number>()
  const subjectCount = new Map<string, number>()
  const add = (c: BlindCandidate) => {
    styleCount.set(c.styleId, (styleCount.get(c.styleId) ?? 0) + 1)
    familyCount.set(c.family, (familyCount.get(c.family) ?? 0) + 1)
    for (const key of attributeKeys) {
      const k = `${key}:${band(c.attributes[key])}`
      bandCount.set(k, (bandCount.get(k) ?? 0) + 1)
    }
    for (const s of c.subjects) subjectCount.set(s, (subjectCount.get(s) ?? 0) + 1)
  }
  picked.forEach(add)

  const styles = new Set(candidates.map((c) => c.styleId)).size
  const styleCap = Math.max(1, Math.ceil(size / Math.max(1, styles)) + 1)
  let pool = shuffle(
    candidates.filter((c) => !picked.some((p) => p.id === c.id)),
    random,
  )

  while (picked.length < size && pool.length > 0) {
    let best: BlindCandidate | undefined
    let bestScore = -Infinity
    for (const c of pool) {
      if ((styleCount.get(c.styleId) ?? 0) >= styleCap) continue
      // 越能补上少见的维度档位、题材、大类、风格，分越高
      let score = 0
      for (const key of attributeKeys) score += 1 / (1 + (bandCount.get(`${key}:${band(c.attributes[key])}`) ?? 0))
      for (const s of c.subjects) score += 0.5 / (1 + (subjectCount.get(s) ?? 0))
      score += 1 / (1 + (familyCount.get(c.family) ?? 0))
      score += 1 / (1 + (styleCount.get(c.styleId) ?? 0))
      score += random() * 0.3
      if (score > bestScore) {
        bestScore = score
        best = c
      }
    }
    if (!best) break
    picked.push(best)
    add(best)
    pool = pool.filter((c) => c.id !== best.id)
  }
  return picked
}

/**
 * 排序：同一风格不相邻。每次从剩余最多的风格里取（不能和上一张同风格），
 * 只要任一风格不超过一半，就一定排得开。
 */
export function orderNoRepeat(items: readonly BlindCandidate[], random: () => number): BlindCandidate[] {
  const groups = new Map<string, BlindCandidate[]>()
  for (const c of shuffle(items, random)) groups.set(c.styleId, [...(groups.get(c.styleId) ?? []), c])
  const out: BlindCandidate[] = []
  let last: string | undefined
  while (out.length < items.length) {
    const options = [...groups.entries()].filter(([style, list]) => list.length > 0 && style !== last)
    const pool = options.length > 0 ? options : [...groups.entries()].filter(([, list]) => list.length > 0)
    const most = Math.max(...pool.map(([, list]) => list.length))
    const top = pool.filter(([, list]) => list.length === most)
    const [style, list] = top[Math.floor(random() * top.length)]!
    out.push(list.shift()!)
    last = style
  }
  return out
}

export function pickFirstRound(
  candidates: readonly BlindCandidate[],
  random: () => number,
  size = FIRST_ROUND_SIZE,
): string[] {
  // 先给每个有图的大类保底 2 张，尽量来自不同风格
  const seed: BlindCandidate[] = []
  const byFamily = new Map<string, BlindCandidate[]>()
  for (const c of shuffle(candidates, random)) byFamily.set(c.family, [...(byFamily.get(c.family) ?? []), c])
  for (const list of byFamily.values()) {
    const styles = new Set<string>()
    for (const c of list) {
      if (seed.filter((s) => s.family === c.family).length >= MIN_PER_FAMILY) break
      if (styles.has(c.styleId) && list.some((o) => !styles.has(o.styleId) && !seed.includes(o))) continue
      seed.push(c)
      styles.add(c.styleId)
    }
  }
  const picked = pickBalanced(candidates, Math.min(size, candidates.length), random, seed.slice(0, size))
  return orderNoRepeat(picked, random).map((c) => c.id)
}

/** 之后的轮次：没在盲测里出现过的优先，其次是最久没出现的 */
export function pickNextRound(
  candidates: readonly BlindCandidate[],
  shownBefore: readonly string[],
  random: () => number,
  size = NEXT_ROUND_SIZE,
): string[] {
  const lastSeen = new Map<string, number>()
  shownBefore.forEach((id, i) => lastSeen.set(id, i))
  const fresh = candidates.filter((c) => !lastSeen.has(c.id))
  let picked = pickBalanced(fresh, Math.min(size, fresh.length), random)
  if (picked.length < size) {
    const old = [...candidates]
      .filter((c) => lastSeen.has(c.id))
      .sort((a, b) => (lastSeen.get(a.id) ?? 0) - (lastSeen.get(b.id) ?? 0))
    picked = [...picked, ...old.slice(0, size - picked.length)]
  }
  return orderNoRepeat(picked, random).map((c) => c.id)
}
