/**
 * 各来源的候选抓取。只收来源方标为 CC0 / 公共领域、且有图的作品（SPEC §8.1）。
 * 每个函数都把来源的原始字段映射成统一的 RawCandidate；映射函数单独导出，便于测试。
 */
import { getJson, stripHtml } from './http'
import type { Query, RawCandidate } from './types'

// ---------- 大都会艺术博物馆 ----------

export interface MetObject {
  objectID: number
  isPublicDomain: boolean
  primaryImage: string
  primaryImageSmall: string
  title: string
  artistDisplayName: string
  objectDate: string
  medium: string
  culture: string
  objectURL: string
}

export function mapMet(o: MetObject): RawCandidate | null {
  if (!o.isPublicDomain || !o.primaryImageSmall) return null
  return {
    source: 'met',
    sourceId: String(o.objectID),
    title: o.title || '无题',
    artist: o.artistDisplayName || undefined,
    date: o.objectDate || '',
    medium: o.medium || undefined,
    culture: o.culture || undefined,
    sourceUrl: o.objectURL || `https://www.metmuseum.org/art/collection/search/${o.objectID}`,
    previewUrl: o.primaryImageSmall,
    fullUrl: o.primaryImage || o.primaryImageSmall,
    license: 'CC0',
    museum: '大都会艺术博物馆',
  }
}

/** Met 搜索地址。v1 搜索已于 2026-10-01 停用，改用分页的 v1.1；q 放在最后，筛选参数才可靠生效 */
export function metSearchUrl(q: Extract<Query, { source: 'met' }>, limit: number): string {
  const params: string[] = ['hasImages=true']
  if (q.departmentId) params.push(`departmentId=${q.departmentId}`)
  if (q.medium) params.push(`medium=${encodeURIComponent(q.medium)}`)
  if (q.geoLocation) params.push(`geoLocation=${encodeURIComponent(q.geoLocation)}`)
  if (q.artistOrCulture) params.push('artistOrCulture=true')
  if (q.title) params.push('title=true')
  params.push('offset=0', `limit=${Math.min(limit, 500)}`)
  params.push(`q=${encodeURIComponent(q.q ?? '')}`)
  return `https://collectionapi.metmuseum.org/public/collection/v1.1/search?${params.join('&')}`
}

async function metSearch(q: Extract<Query, { source: 'met' }>, limit: number): Promise<number[]> {
  const res = await getJson<{ total: number; objectIDs: number[] | null }>(metSearchUrl(q, limit))
  return res.objectIDs ?? []
}

async function fromMet(q: Extract<Query, { source: 'met' }>): Promise<RawCandidate[]> {
  const max = q.max ?? 8
  let ids = [...(q.ids ?? [])]
  if (q.q) {
    ids = [...ids, ...(await metSearch(q, max * 8))]
  }
  const out: RawCandidate[] = []
  for (const id of ids.slice(0, max * 8)) {
    if (out.length >= max) break
    try {
      const o = await getJson<MetObject>(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)
      if (q.culture && !(o.culture ?? '').toLowerCase().includes(q.culture.toLowerCase())) continue
      const c = mapMet(o)
      if (c) out.push(c)
    } catch {
      // 单个对象失败不影响其他
    }
  }
  return out
}

// ---------- 芝加哥艺术博物馆 ----------

export interface AicArtwork {
  id: number
  title: string
  artist_display?: string
  date_display?: string
  medium_display?: string
  place_of_origin?: string
  image_id: string | null
  is_public_domain: boolean
  thumbnail?: { width?: number; height?: number } | null
}

const AIC_FIELDS = 'id,title,artist_display,date_display,medium_display,place_of_origin,image_id,is_public_domain,thumbnail'
const AIC_IIIF = 'https://www.artic.edu/iiif/2'

export function mapAic(a: AicArtwork): RawCandidate | null {
  if (!a.is_public_domain || !a.image_id) return null
  return {
    source: 'aic',
    sourceId: String(a.id),
    title: a.title || '无题',
    artist: a.artist_display?.split('\n')[0] || undefined,
    date: a.date_display ?? '',
    medium: a.medium_display || undefined,
    culture: a.place_of_origin || undefined,
    sourceUrl: `https://www.artic.edu/artworks/${a.id}`,
    previewUrl: `${AIC_IIIF}/${a.image_id}/full/400,/0/default.jpg`,
    fullUrl: `${AIC_IIIF}/${a.image_id}/full/1686,/0/default.jpg`,
    license: 'CC0',
    museum: '芝加哥艺术博物馆',
    width: a.thumbnail?.width,
    height: a.thumbnail?.height,
  }
}

async function fromAic(q: Extract<Query, { source: 'aic' }>): Promise<RawCandidate[]> {
  const max = q.max ?? 6
  const found: AicArtwork[] = []
  if (q.ids?.length) {
    const res = await getJson<{ data: AicArtwork[] }>(
      `https://api.artic.edu/api/v1/artworks?ids=${q.ids.join(',')}&fields=${AIC_FIELDS}`,
    )
    found.push(...res.data)
  }
  if (q.q || q.artist) {
    const must: unknown[] = [{ term: { is_public_domain: true } }]
    if (q.artist) {
      // 先按名字查到画家 id，再按 artist_ids 精确筛选，比全文搜索准
      const agents = await getJson<{ data: { id: number; title: string }[] }>(
        `https://api.artic.edu/api/v1/agents/search?q=${encodeURIComponent(q.artist)}&fields=id,title&limit=1`,
      )
      const agent = agents.data[0]
      if (!agent) throw new Error(`AIC 找不到画家：${q.artist}`)
      must.push({ term: { artist_ids: agent.id } })
    }
    const res = await getJson<{ data: AicArtwork[] }>(`https://api.artic.edu/api/v1/artworks/search?params=${encodeURIComponent(JSON.stringify(aicSearchBody(q, must, max)))}`)
    found.push(...res.data)
  }
  return found.map(mapAic).filter((c): c is RawCandidate => c !== null).slice(0, max)
}

export function aicSearchBody(q: Extract<Query, { source: 'aic' }>, must: unknown[], max: number) {
  return {
    ...(q.q ? { q: q.q } : {}),
    query: { bool: { must } },
    fields: AIC_FIELDS,
    limit: Math.min(max * 3, 60),
  }
}

// ---------- 克利夫兰艺术博物馆 ----------

export interface CmaArtwork {
  id: number
  title: string
  creation_date?: string
  technique?: string
  culture?: string[]
  url?: string
  share_license_status?: string
  creators?: { description?: string }[]
  images?: {
    web?: { url: string; width?: string | number; height?: string | number }
    print?: { url: string; width?: string | number; height?: string | number }
  } | null
}

export function mapCma(a: CmaArtwork): RawCandidate | null {
  const web = a.images?.web?.url
  if (a.share_license_status !== 'CC0' || !web) return null
  return {
    source: 'cma',
    sourceId: String(a.id),
    title: a.title || '无题',
    artist: a.creators?.[0]?.description || undefined,
    date: a.creation_date ?? '',
    medium: a.technique || undefined,
    culture: a.culture?.[0] || undefined,
    sourceUrl: a.url || `https://clevelandart.org/art/${a.id}`,
    previewUrl: web,
    fullUrl: a.images?.print?.url || web,
    license: 'CC0',
    museum: '克利夫兰艺术博物馆',
    width: Number(a.images?.print?.width ?? a.images?.web?.width) || undefined,
    height: Number(a.images?.print?.height ?? a.images?.web?.height) || undefined,
  }
}

async function fromCma(q: Extract<Query, { source: 'cma' }>): Promise<RawCandidate[]> {
  const max = q.max ?? 6
  const found: CmaArtwork[] = []
  for (const id of q.ids ?? []) {
    try {
      const res = await getJson<{ data: CmaArtwork }>(`https://openaccess-api.clevelandart.org/api/artworks/${id}`)
      found.push(res.data)
    } catch {
      // 跳过
    }
  }
  if (q.q) {
    // cc0 参数不带值
    let url = `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(q.q)}&cc0&has_image=1&limit=${max * 2}`
    if (q.type) url += `&type=${encodeURIComponent(q.type)}`
    if (q.department) url += `&department=${encodeURIComponent(q.department)}`
    const res = await getJson<{ data: CmaArtwork[] }>(url)
    found.push(...res.data)
  }
  return found.map(mapCma).filter((c): c is RawCandidate => c !== null).slice(0, max)
}

// ---------- 维基共享资源 ----------

export interface CommonsPage {
  pageid: number
  title: string
  imageinfo?: {
    url: string
    thumburl?: string
    width?: number
    height?: number
    mime?: string
    descriptionurl: string
    extmetadata?: Record<string, { value: string }>
  }[]
}

/** 公共领域或 CC0 才收；作者卒年由人工在挑图时核对（SPEC §8.1） */
export function isCommonsPublicDomain(licenseShortName: string): boolean {
  return /^(public domain|pd\b|pd-|cc0)/i.test(licenseShortName.trim())
}

export function mapCommons(p: CommonsPage): RawCandidate | null {
  const info = p.imageinfo?.[0]
  if (!info) return null
  if (info.mime && !/^image\/(jpeg|png|tiff|webp)$/.test(info.mime)) return null
  const meta = info.extmetadata ?? {}
  const license = stripHtml(meta.LicenseShortName?.value)
  if (!isCommonsPublicDomain(license)) return null
  // iiurlwidth=1600 的缩略图（原图更小时就是原图），预览和下载都用它，避免下载几十 MB 的原图或 TIFF
  const image = info.thumburl ?? info.url
  return {
    source: 'commons',
    sourceId: String(p.pageid),
    title: stripHtml(meta.ObjectName?.value) || p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
    artist: stripHtml(meta.Artist?.value) || undefined,
    date: stripHtml(meta.DateTimeOriginal?.value),
    sourceUrl: info.descriptionurl,
    previewUrl: image,
    fullUrl: image,
    license: /cc0/i.test(license) ? 'CC0' : 'PD',
    museum: '维基共享资源',
    width: info.width,
    height: info.height,
  }
}

async function fromCommons(q: Extract<Query, { source: 'commons' }>): Promise<RawCandidate[]> {
  const max = q.max ?? 8
  const base =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
    '&iiprop=url|size|mime|extmetadata&iiurlwidth=1600'
  const pages: CommonsPage[] = []
  if (q.titles?.length) {
    const res = await getJson<{ query?: { pages?: Record<string, CommonsPage> } }>(
      `${base}&titles=${encodeURIComponent(q.titles.join('|'))}`,
    )
    pages.push(...Object.values(res.query?.pages ?? {}))
  }
  if (q.search) {
    const res = await getJson<{ query?: { pages?: Record<string, CommonsPage & { index?: number }> } }>(
      `${base}&generator=search&gsrnamespace=6&gsrlimit=${Math.min(max * 3, 50)}&gsrsearch=${encodeURIComponent(q.search)}`,
    )
    const found = Object.values(res.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    pages.push(...found)
  }
  return pages.map(mapCommons).filter((c): c is RawCandidate => c !== null).slice(0, max)
}

// ---------- 美国国会图书馆 ----------

type OneOrMany = string | string[] | undefined
const asList = (v: OneOrMany): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v])

export interface LocFile {
  url: string
  mimetype?: string
  width?: number
  height?: number
}

export interface LocItemResponse {
  item?: {
    id?: string
    library_of_congress_control_number?: string
    title?: string
    date?: string
    created_published_date?: string
    contributor_names?: string[]
    medium?: OneOrMany
    rights_advisory?: OneOrMany
    rights?: OneOrMany
  }
  resources?: { image?: string; files?: LocFile[][] }[]
}

/** 只收权利声明为“No known restrictions”的条目（SPEC §8.1） */
export function isLocUnrestricted(item: LocItemResponse['item']): boolean {
  const text = [...asList(item?.rights_advisory), ...asList(item?.rights)].join(' ')
  return /no known restrictions/i.test(text)
}

const lccnOf = (s: string | undefined) => s?.match(/\/item\/([^/?#]+)/)?.[1]

export function mapLoc(res: LocItemResponse): RawCandidate | null {
  const item = res.item
  if (!item || !isLocUnrestricted(item)) return null
  const id = item.library_of_congress_control_number || lccnOf(item.id)
  if (!id) return null
  const jpegs = (res.resources ?? [])
    .flatMap((r) => (r.files ?? []).flat())
    .filter((f) => f.mimetype === 'image/jpeg' && f.url && f.width)
    .sort((a, b) => (a.width ?? 0) - (b.width ?? 0))
  if (jpegs.length === 0) return null
  // 下载用 3000px 以内最大的一档，预览用 400px 以上最小的一档
  const full = [...jpegs].reverse().find((f) => (f.width ?? 0) <= 3000) ?? jpegs[0]!
  const preview = jpegs.find((f) => (f.width ?? 0) >= 400) ?? full
  return {
    source: 'loc',
    sourceId: id,
    title: item.title || '无题',
    artist: item.contributor_names?.[0] || undefined,
    date: item.date || item.created_published_date || '',
    medium: asList(item.medium)[0] || undefined,
    sourceUrl: `https://www.loc.gov/item/${id}/`,
    previewUrl: preview.url,
    fullUrl: full.url,
    license: 'PD',
    museum: '美国国会图书馆',
    width: full.width,
    height: full.height,
  }
}

async function fromLoc(q: Extract<Query, { source: 'loc' }>): Promise<RawCandidate[]> {
  const max = q.max ?? 6
  const ids = [...(q.ids ?? [])]
  if (q.q) {
    const res = await getJson<{ results?: { id?: string; url?: string }[] }>(
      `https://www.loc.gov/photos/?q=${encodeURIComponent(q.q)}&fo=json&c=${Math.min(max * 3, 50)}`,
    )
    for (const r of res.results ?? []) {
      const id = lccnOf(r.id) ?? lccnOf(r.url)
      if (id) ids.push(id)
    }
  }
  const out: RawCandidate[] = []
  const skipped: string[] = []
  for (const id of ids.slice(0, max * 4)) {
    if (out.length >= max) break
    try {
      const res = await getJson<LocItemResponse>(`https://www.loc.gov/item/${id}/?fo=json`)
      const c = mapLoc(res)
      if (c) out.push(c)
      else
        skipped.push(
          `${id}: rights=${JSON.stringify(res.item?.rights_advisory ?? res.item?.rights ?? null).slice(0, 80)} ` +
            `files=${(res.resources ?? []).flatMap((r) => (r.files ?? []).flat()).length}`,
        )
    } catch (error) {
      skipped.push(`${id}: ${String(error).slice(0, 80)}`)
    }
  }
  // 一条都没收到时把原因带回日志，方便排查接口格式
  if (out.length === 0) throw new Error(`LoC 无可用条目：找到 ${ids.length} 个 id；${skipped.slice(0, 3).join(' | ')}`)
  return out
}

export async function fetchQuery(q: Query): Promise<RawCandidate[]> {
  switch (q.source) {
    case 'met':
      return fromMet(q)
    case 'aic':
      return fromAic(q)
    case 'cma':
      return fromCma(q)
    case 'commons':
      return fromCommons(q)
    case 'loc':
      return fromLoc(q)
  }
}
