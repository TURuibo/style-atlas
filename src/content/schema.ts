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

export const imageModes = ['public-domain', 'mixed', 'external-only'] as const

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

export const sources = ['met', 'aic', 'cma', 'commons', 'loc'] as const

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
  license: z.enum(['CC0', 'PD']),
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

export interface ContentBundle {
  builtAt: string
  vocab: Vocab
  families: Family[]
  styles: Style[]
  artworks: Artwork[]
}
