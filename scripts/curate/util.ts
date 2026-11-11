/** 挑图管线里的纯函数，单独放出来便于测试 */
import type { Artwork } from '../../src/content/schema'
import type { Candidate, PickEntry, RawCandidate } from './types'

export const SHEET_PAGE_SIZE = 20

export function artworkIdOf(c: Pick<Candidate, 'source' | 'sourceId'>): string {
  return `${c.source}-${c.sourceId.replace(/[^A-Za-z0-9_-]/g, '_')}`
}

/** 挑图记录优先按作品 id 找候选，没有 id 才按联系表编号 */
export function findCandidate(candidates: Candidate[], pick: PickEntry): Candidate | undefined {
  if (pick.id) return candidates.find((c) => artworkIdOf(c) === pick.id)
  return candidates.find((c) => c.n === pick.n)
}

/** 按 来源+编号 去重，并从 1 开始编号 */
export function dedupe(raw: RawCandidate[]): Candidate[] {
  return mergeCandidates([], raw)
}

/**
 * 把新抓到的候选并进旧的：旧候选保留原编号（来源偶尔限流时也不会丢），新的接在后面编号。
 */
export function mergeCandidates(previous: Candidate[], raw: RawCandidate[]): Candidate[] {
  const out = [...previous]
  const seen = new Set(previous.map((c) => `${c.source}:${c.sourceId}`))
  let next = previous.reduce((max, c) => Math.max(max, c.n), 0) + 1
  for (const c of raw) {
    const key = `${c.source}:${c.sourceId}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...c, n: next++ })
  }
  return out
}

export const licenseZh = (license: 'CC0' | 'PD') => (license === 'CC0' ? 'CC0' : '公共领域')

/** 鸣谢格式（SPEC §8.2 第 3 条）：作品名，作者，年代。馆名，许可。 */
export function creditOf(c: Pick<Candidate, 'title' | 'artist' | 'date' | 'museum' | 'license'>): string {
  const work = [c.title.trim() || '无题', c.artist?.trim() || '佚名', c.date.trim() || '年代不详'].join('，')
  return `${work}。${c.museum}，${licenseZh(c.license)}。`
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export interface ImageInfo {
  width: number
  height: number
  sourceWidth: number
  sourceHeight: number
  palette: string[]
}

/** 由候选、挑图记录和处理后的图片信息拼出 artworks.json 里的一条 */
export function buildArtwork(args: {
  candidate: Candidate
  pick: PickEntry
  styleId: string
  existing?: Artwork
  image: ImageInfo
  today: string
}): Artwork {
  const { pick, styleId, existing, image, today } = args
  const c = { ...args.candidate, title: pick.title ?? args.candidate.title, date: pick.date ?? args.candidate.date }
  const id = artworkIdOf(c)
  return {
    id,
    styleIds: [...new Set([...(existing?.styleIds ?? []), styleId])],
    title: c.title,
    ...(pick.titleZh ? { titleZh: pick.titleZh } : {}),
    ...(c.artist ? { artist: c.artist } : {}),
    date: c.date,
    ...(c.medium ? { medium: c.medium } : {}),
    source: c.source,
    sourceUrl: c.sourceUrl,
    license: c.license,
    credit: creditOf(c),
    downloadedAt: existing?.downloadedAt ?? today,
    img: {
      thumb: `img/art/${id}-480.webp`,
      display: `img/art/${id}-1600.webp`,
      width: image.width,
      height: image.height,
    },
    sourceSize: { width: image.sourceWidth, height: image.sourceHeight },
    palette: image.palette,
    subjects: pick.subjects,
    ...(pick.attributes ? { attributes: pick.attributes } : {}),
    blindEligible: pick.blindEligible ?? true,
  }
}
