import { z } from 'zod'

/** 五个画面维度，每维 -2..+2（SPEC §5.4） */
export const attributeKeys = ['lineMass', 'flatVolume', 'sparseDense', 'naturalStylized', 'mutedVivid'] as const
export type AttributeKey = (typeof attributeKeys)[number]

const score = z.number().min(-2).max(2)

export const AttributesSchema = z.object({
  lineMass: score,
  flatVolume: score,
  sparseDense: score,
  naturalStylized: score,
  mutedVivid: score,
})
export type Attributes = z.infer<typeof AttributesSchema>

export const VocabSchema = z.object({
  families: z.record(z.string(), z.string()),
  regions: z.record(z.string(), z.string()),
  eras: z.record(
    z.string(),
    z.object({ zh: z.string(), start: z.number().optional(), end: z.number().optional(), weight: z.number().positive() }),
  ),
  moods: z.record(z.string(), z.string()),
  mediums: z.record(z.string(), z.string()),
  subjects: z.record(z.string(), z.string()),
})
export type Vocab = z.infer<typeof VocabSchema>

export const FamilySchema = z.object({
  id: z.string(),
  order: z.number().int(),
  nameZh: z.string(),
  nameEn: z.string(),
  glance: z.string(),
  summary: z.string(),
  traits: z.array(z.string()).length(3),
  /** 规格里计划的风格数（SPEC §5.1），用于显示进度 */
  planned: z.number().int().positive(),
  coverArtworkIds: z.array(z.string()).default([]),
})
export type Family = z.infer<typeof FamilySchema>

const ArtistSchema = z.object({
  zh: z.string(),
  original: z.string().optional(),
  en: z.string().optional(),
  life: z.string().optional(),
  known: z.string().optional(),
  deathYear: z.number().int().optional(),
})

const MuseumSchema = z.object({
  name: z.string(),
  city: z.string(),
  note: z.string().optional(),
  url: z.url().optional(),
  local: z.enum(['stockholm', 'sweden', 'nordic']).optional(),
})

/** open-license：当代作者自己用 CC0 / CC BY / CC BY-SA 开放的作品（SPEC §8，2026-11-11 起） */
export const imageModes = ['public-domain', 'mixed', 'open-license', 'external-only'] as const

/** 外链按钮组里按风格追加的站内搜索（SPEC §4.5） */
export const externalSites = ['pixiv', 'zcool', 'dribbble', 'xiaohongshu'] as const
export type ExternalSite = (typeof externalSites)[number]

export const StyleFrontmatterSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  status: z.enum(['draft', 'ready']).default('draft'),
  nameZh: z.string().min(1),
  nameEn: z.string().min(1),
  nameOriginal: z.string().optional(),
  family: z.string(),
  regions: z.array(z.string()).min(1),
  era: z.object({ start: z.number().int(), end: z.number().int().nullable(), label: z.string() }),
  imageMode: z.enum(imageModes),
  attributes: AttributesSchema,
  moods: z.array(z.string()).default([]),
  mediums: z.array(z.string()).default([]),
  keyArtists: z.array(ArtistSchema).default([]),
  related: z
    .object({
      influencedBy: z.array(z.string()).default([]),
      influenced: z.array(z.string()).default([]),
      similar: z.array(z.string()).default([]),
    })
    .default({ influencedBy: [], influenced: [], similar: [] }),
  museums: z.array(MuseumSchema).default([]),
  prompt: z.object({
    style: z.string().min(1),
    medium: z.array(z.string()).default([]),
    palette: z.array(z.string()).default([]),
    composition: z.array(z.string()).default([]),
    artistsPD: z.array(z.string()).default([]),
    negative: z.array(z.string()).default([]),
  }),
  externalSearch: z.string().min(1),
  externalExtra: z.array(z.object({ site: z.enum(externalSites), q: z.string().min(1) })).default([]),
  sources: z.array(z.url()).default([]),
  coverArtworkId: z.string().optional(),
})

export const StyleBodySchema = z.object({
  oneLiner: z.string().default(''),
  howToLook: z.array(z.string()).default([]),
  background: z.string().default(''),
  howToDraw: z.string().default(''),
  exercise: z.string().default(''),
})
export type StyleBody = z.infer<typeof StyleBodySchema>

export const StyleSchema = StyleFrontmatterSchema.extend({ body: StyleBodySchema })
export type Style = z.infer<typeof StyleSchema>

/** pratham：Pratham Books / StoryWeaver 的开放图库（GitHub 上的 pb-imagebank） */
export const sources = ['met', 'aic', 'cma', 'commons', 'loc', 'pratham'] as const
export const museumSources: readonly string[] = ['met', 'aic', 'cma']

/** CC BY / CC BY-SA 要署名、写版本并链到许可原文（SPEC §8） */
export const licenses = ['CC0', 'PD', 'CC BY', 'CC BY-SA'] as const
export type License = (typeof licenses)[number]
export const attributionLicenses: readonly License[] = ['CC BY', 'CC BY-SA']

export const ArtworkSchema = z.object({
  id: z.string().regex(/^[a-z]+-[A-Za-z0-9_-]+$/),
  styleIds: z.array(z.string()).min(1),
  title: z.string(),
  titleZh: z.string().optional(),
  artist: z.string().optional(),
  date: z.string(),
  medium: z.string().optional(),
  source: z.enum(sources),
  sourceUrl: z.url(),
  license: z.enum(licenses),
  /** 如 4.0、3.0；只用于 CC BY / CC BY-SA */
  licenseVersion: z.string().optional(),
  licenseUrl: z.url().optional(),
  credit: z.string(),
  downloadedAt: z.string(),
  img: z.object({
    thumb: z.string(),
    display: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  /** 下载时源图的尺寸（SPEC §8.2 第 2 条“原图尺寸”） */
  sourceSize: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).optional(),
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).default([]),
  subjects: z.array(z.string()).default([]),
  attributes: AttributesSchema.partial().optional(),
  blindEligible: z.boolean().default(true),
})
export type Artwork = z.infer<typeof ArtworkSchema>

/** content/plan.yaml：77 种风格的计划清单（SPEC §6），用来显示还没写的风格名 */
export const PlanEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nameZh: z.string().min(1),
  nameEn: z.string(),
  family: z.string(),
  phase: z.string().optional(),
})
export type PlanEntry = z.infer<typeof PlanEntrySchema>

/** content/route.yaml：现代线路（导览主线，2026-11-11 起）。每段一章，站序按 styles 的顺序。 */
export const RouteChapterSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nameZh: z.string().min(1),
  nameEn: z.string().min(1),
  glance: z.string().min(1),
  summary: z.string().min(1),
  traits: z.array(z.string()).length(3),
  /** 写好的和计划中的风格 id；没写的在章节页里列为“待上线” */
  styles: z.array(z.string()).min(1),
  coverArtworkIds: z.array(z.string()).default([]),
})
export type RouteChapter = z.infer<typeof RouteChapterSchema>

export const RouteSchema = z.object({
  nameZh: z.string().min(1),
  summary: z.string().min(1),
  chapters: z.array(RouteChapterSchema).min(1),
})
export type Route = z.infer<typeof RouteSchema>

export interface ContentBundle {
  builtAt: string
  vocab: Vocab
  families: Family[]
  plan: PlanEntry[]
  route: Route
  styles: Style[]
  artworks: Artwork[]
}
