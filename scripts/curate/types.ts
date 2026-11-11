/** 挑图管线的数据格式（SPEC §10.4） */

export type SourceId = 'met' | 'aic' | 'cma' | 'commons' | 'loc'

/** 一条候选作品。n 是联系表上的编号（从 1 开始）。 */
export interface Candidate {
  n: number
  source: SourceId
  sourceId: string
  title: string
  artist?: string
  date: string
  medium?: string
  culture?: string
  sourceUrl: string
  previewUrl: string
  fullUrl: string
  license: 'CC0' | 'PD'
  museum: string
  width?: number
  height?: number
}

export type RawCandidate = Omit<Candidate, 'n'>

export type Query =
  | {
      source: 'met'
      q?: string
      ids?: number[]
      departmentId?: number
      artistOrCulture?: boolean
      /** Met 的 medium 筛选参数，如 Paintings、Prints */
      medium?: string
      /** Met 的 geoLocation 筛选参数，如 China */
      geoLocation?: string
      /** 只在标题里搜 */
      title?: boolean
      /** 只保留 culture 字段包含这段文字的作品，如 China */
      culture?: string
      max?: number
    }
  | {
      source: 'aic'
      q?: string
      /** 画家名：先查到画家 id 再筛选 */
      artist?: string
      ids?: number[]
      max?: number
    }
  | { source: 'cma'; q?: string; ids?: number[]; type?: string; department?: string; max?: number }
  | { source: 'commons'; search?: string; titles?: string[]; max?: number }
  | { source: 'loc'; q?: string; ids?: string[]; max?: number }

/** content/curation/requests/<styleId>.json：去哪里找候选 */
export interface RequestFile {
  styleId: string
  queries: Query[]
}

/** content/curation/picks/<styleId>.json：从联系表里选中的作品 */
export interface PickEntry {
  n: number
  subjects: string[]
  /** 选它的理由，一句话 */
  reason?: string
  /** 是否做这种风格的封面（每种 1 幅，写进风格文件的 coverArtworkId） */
  cover?: boolean
  blindEligible?: boolean
  /** 来源标题太乱时（如维基共享资源的文件名）手工给出的标题，仍用原文 */
  title?: string
  /** 同上，来源年代字段太乱时手工给出 */
  date?: string
  titleZh?: string
  attributes?: Record<string, number>
}

export interface PicksFile {
  styleId: string
  picks: PickEntry[]
}

/** content/curation/candidates/<styleId>.json：工作流写入 */
export interface CandidatesFile {
  styleId: string
  requestHash: string
  fetchedAt: string
  candidates: Candidate[]
  notes: string[]
}
