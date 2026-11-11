import { describe, expect, it } from 'vitest'
import type { Artwork, Family, Style } from '../src/content/schema'
import { blindCandidates, orderNoRepeat, pickFirstRound, pickNextRound, type BlindCandidate } from '../src/lib/blind'
import { seededRandom } from '../src/lib/random'
import { revealGroups, revealSummary, roundScores, subjectHint } from '../src/lib/reveal'
import type { BlindRound, Rating } from '../src/lib/storage'
import { chapterProgress, homeChapterOf, nextStation, previousStation } from '../src/lib/tour'

const attrs = (v: number) => ({ lineMass: v, flatVolume: -v, sparseDense: v, naturalStylized: 0, mutedVivid: v })

/** 5 个大类、每类 2 种风格、每种 4 幅：40 张候选 */
function fixture(): BlindCandidate[] {
  const out: BlindCandidate[] = []
  const families = ['f1', 'f2', 'f3', 'f4', 'f5']
  families.forEach((family, fi) => {
    for (let si = 0; si < 2; si++) {
      for (let k = 0; k < 4; k++) {
        out.push({
          id: `${family}-s${si}-${k}`,
          styleId: `${family}-s${si}`,
          family,
          attributes: attrs(((fi + si + k) % 5) - 2),
          subjects: [k % 2 ? 'landscape' : 'figures'],
        })
      }
    }
  })
  return out
}

describe('盲测抽图', () => {
  it('首轮 24 张：不重复、每个大类至少 2 张、同一风格不相邻', () => {
    for (const seed of [1, 2, 3, 42, 2026]) {
      const cands = fixture()
      const ids = pickFirstRound(cands, seededRandom(seed))
      expect(ids).toHaveLength(24)
      expect(new Set(ids).size).toBe(24)
      const byId = new Map(cands.map((c) => [c.id, c]))
      for (const f of ['f1', 'f2', 'f3', 'f4', 'f5'])
        expect(ids.filter((id) => byId.get(id)!.family === f).length).toBeGreaterThanOrEqual(2)
      for (let i = 1; i < ids.length; i++) expect(byId.get(ids[i]!)!.styleId).not.toBe(byId.get(ids[i - 1]!)!.styleId)
    }
  })

  it('同一种子结果相同', () => {
    expect(pickFirstRound(fixture(), seededRandom(7))).toEqual(pickFirstRound(fixture(), seededRandom(7)))
  })

  it('图不够时有多少给多少', () => {
    expect(pickFirstRound(fixture().slice(0, 10), seededRandom(1))).toHaveLength(10)
  })

  it('下一轮 12 张，优先没出现过的', () => {
    const cands = fixture()
    const first = pickFirstRound(cands, seededRandom(1))
    const next = pickNextRound(cands, first, seededRandom(2))
    expect(next).toHaveLength(12)
    expect(next.filter((id) => first.includes(id))).toHaveLength(0)
  })

  it('排序：只要一种风格不超过一半，就能排开', () => {
    const items: BlindCandidate[] = ['a', 'a', 'a', 'b', 'b', 'c'].map((s, i) => ({
      id: String(i),
      styleId: s,
      family: 'f',
      attributes: attrs(0),
      subjects: [],
    }))
    const out = orderNoRepeat(items, seededRandom(3))
    for (let i = 1; i < out.length; i++) expect(out[i]!.styleId).not.toBe(out[i - 1]!.styleId)
  })

  it('候选只收已上线、有图的风格里允许盲测的作品', () => {
    const style = (id: string, status: 'ready' | 'draft', imageMode: Style['imageMode']) =>
      ({ id, status, imageMode, family: 'f', attributes: attrs(0) }) as Style
    const styles = new Map([
      ['ok', style('ok', 'ready', 'public-domain')],
      ['wip', style('wip', 'draft', 'public-domain')],
    ])
    const art = (id: string, styleId: string, blindEligible = true) =>
      ({ id, styleIds: [styleId], blindEligible, subjects: [], attributes: { mutedVivid: 2 } }) as unknown as Artwork
    const out = blindCandidates([art('a', 'ok'), art('b', 'wip'), art('c', 'ok', false)], styles)
    expect(out.map((c) => c.id)).toEqual(['a'])
    expect(out[0]!.attributes.mutedVivid).toBe(2)
  })
})

describe('揭晓', () => {
  const family = (id: string, order: number, nameZh: string) => ({ id, order, nameZh }) as Family
  const families = [family('print', 1, '版画'), family('poster', 2, '装饰艺术与海报')]
  const stylesById = new Map([
    ['ukiyo-e', { id: 'ukiyo-e', family: 'print', nameZh: '浮世绘' } as Style],
    ['art-nouveau', { id: 'art-nouveau', family: 'poster', nameZh: '新艺术运动' } as Style],
  ])
  const art = (id: string, styleId: string, subjects: string[]) => ({ id, styleIds: [styleId], subjects }) as unknown as Artwork
  const arts = [
    art('a1', 'ukiyo-e', ['landscape']),
    art('a2', 'ukiyo-e', ['landscape']),
    art('b1', 'art-nouveau', ['figures']),
    art('b2', 'art-nouveau', ['landscape']),
  ]
  const artworksById = new Map(arts.map((a) => [a.id, a]))
  const round: BlindRound = {
    number: 1,
    artworkIds: ['a1', 'b1', 'a2', 'b2'],
    position: 4,
    startedAt: '2026-11-11T10:00:00.000Z',
    completedAt: '2026-11-11T10:04:00.000Z',
  }
  const r = (id: string, score: Rating['score'], at: string, context: Rating['context'] = 'blind'): Rating => ({
    target: 'artwork',
    id,
    score,
    context,
    at,
  })

  it('现代专场按风格分组，按给出的风格顺序排', () => {
    const scores = new Map<string, Rating['score']>([
      ['b1', 2],
      ['b2', 1],
      ['a1', -1],
    ])
    const groups = revealGroups(round, scores, artworksById, stylesById, families, ['art-nouveau'])
    expect(groups.map((g) => [g.id, g.nameZh, g.items.map((i) => i.artworkId)])).toEqual([
      ['art-nouveau', '新艺术运动', ['b1', 'b2']],
      ['ukiyo-e', '浮世绘', ['a1', 'a2']],
    ])
    expect(revealSummary(groups)).toBe('你给高分最多的是新艺术运动。')
  })

  it('只算本轮里的盲测评分', () => {
    const ratings = [
      r('a1', -2, '2026-11-10T09:00:00.000Z'),
      r('a1', 2, '2026-11-11T10:01:00.000Z'),
      r('a2', 1, '2026-11-11T10:02:00.000Z'),
      r('b1', 2, '2026-11-11T10:02:30.000Z', 'browse'),
      r('b2', 1, '2026-11-11T10:03:00.000Z'),
    ]
    const scores = roundScores(round, ratings)
    expect([...scores.entries()]).toEqual([
      ['a1', 2],
      ['a2', 1],
      ['b2', 1],
    ])
    const groups = revealGroups(round, scores, artworksById, stylesById, families)
    expect(groups.map((g) => [g.id, g.items.map((i) => i.artworkId)])).toEqual([
      ['print', ['a1', 'a2']],
      ['poster', ['b1', 'b2']],
    ])
    expect(revealSummary(groups)).toBe('你给高分最多的是版画。')
    expect(subjectHint(groups, artworksById, { landscape: '风景' })).toBe(
      '高分图里 100% 是风景：可能你喜欢的是风景题材，而不只是画风。',
    )
  })

  it('没有高分时给另一句话，高分太少不提醒题材', () => {
    const groups = revealGroups(round, new Map(), artworksById, stylesById, families)
    expect(revealSummary(groups)).toContain('没有给出')
    expect(subjectHint(groups, artworksById, {})).toBeNull()
  })
})

describe('导览站序', () => {
  const chapters = [
    { id: 'm1', group: 'modern' as const, styles: ['x', 'y'] },
    { id: 'm2', group: 'modern' as const, styles: ['manga'] },
    { id: 'a', group: 'history' as const, styles: ['a1', 'a2'] },
    { id: 'b', group: 'history' as const, styles: [] },
    { id: 'c', group: 'history' as const, styles: ['c1', 'manga'] },
  ]
  it('下一站跨章，最后一站之后为空', () => {
    expect(nextStation(chapters, { chapter: 'a', style: 'a1' })).toEqual({ chapter: 'a', style: 'a2' })
    expect(nextStation(chapters, { chapter: 'a', style: 'a2' })).toEqual({ chapter: 'c', style: 'c1' })
    expect(nextStation(chapters, { chapter: 'c', style: 'manga' })).toBeNull()
    expect(previousStation(chapters, { chapter: 'c', style: 'c1' })).toEqual({ chapter: 'a', style: 'a2' })
    expect(previousStation(chapters, { chapter: 'a', style: 'a1' })).toBeNull()
  })
  it('现代线路和溯源各走各的，不互相串', () => {
    expect(nextStation(chapters, { chapter: 'm1', style: 'y' })).toEqual({ chapter: 'm2', style: 'manga' })
    expect(nextStation(chapters, { chapter: 'm2', style: 'manga' })).toBeNull()
    // 同一种风格在溯源里的位置不同
    expect(previousStation(chapters, { chapter: 'c', style: 'manga' })).toEqual({ chapter: 'c', style: 'c1' })
    expect(previousStation(chapters, { chapter: 'm1', style: 'x' })).toBeNull()
  })
  it('找不到当前站时回到本组第一站', () => {
    expect(nextStation(chapters, { chapter: 'm1', style: 'gone' })).toEqual({ chapter: 'm1', style: 'x' })
    expect(nextStation(chapters, { chapter: 'b', style: 'gone' })).toEqual({ chapter: 'a', style: 'a1' })
  })
  it('风格的“家”：线路上的段优先，否则是大类', () => {
    expect(homeChapterOf(chapters, 'manga', 'satire-comics')).toBe('m2')
    expect(homeChapterOf(chapters, 'a1', 'a')).toBe('a')
  })
  it('章节进度', () => {
    expect(chapterProgress(['a1', 'a2'], ['a2', 'x'])).toEqual({ seen: 1, total: 2 })
  })
})
