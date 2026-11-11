import { del, get, set } from 'idb-keyval'
import { z } from 'zod'

/** 用户数据只存在本机（SPEC §10.5）。所有读写都经过这里。 */

export const SCHEMA_VERSION = 1 as const
export const STORAGE_KEY = 'style-atlas:user-state'

export type Score = -2 | -1 | 0 | 1 | 2
export const scoreValues: readonly Score[] = [-2, -1, 0, 1, 2]

const ScoreSchema = z.union([z.literal(-2), z.literal(-1), z.literal(0), z.literal(1), z.literal(2)])

export const RatingSchema = z.object({
  target: z.enum(['artwork', 'style']),
  id: z.string(),
  score: ScoreSchema,
  context: z.enum(['blind', 'tour', 'browse']),
  at: z.string(),
})
export type Rating = z.infer<typeof RatingSchema>
export type RatingTarget = Rating['target']
export type RatingContext = Rating['context']

/** 一轮盲测（SPEC §4.2）。position 是下一张要看的序号；看完一轮写 completedAt。 */
export const BlindRoundSchema = z.object({
  number: z.number().int().positive(),
  artworkIds: z.array(z.string()),
  position: z.number().int().nonnegative(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
})
export type BlindRound = z.infer<typeof BlindRoundSchema>

const SettingsSchema = z.object({
  tourOrder: z.enum(['history', 'taste']).default('history'),
  includeArtistNames: z.boolean().default(true),
})

export const UserStateSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  createdAt: z.string(),
  ratings: z.array(RatingSchema).default([]),
  favorites: z.array(z.string()).default([]),
  notes: z.record(z.string(), z.string()).default({}),
  progress: z
    .object({
      visitedStyles: z.array(z.string()).default([]),
      tour: z.object({ family: z.string(), style: z.string().optional() }).optional(),
      blindRounds: z.array(BlindRoundSchema).default([]),
      /** 看过首次打开的说明页 */
      introSeenAt: z.string().optional(),
    })
    .default({ visitedStyles: [], blindRounds: [] }),
  prompts: z.array(z.object({ subject: z.string(), text: z.string(), at: z.string() })).default([]),
  exercisesDone: z.array(z.string()).default([]),
  settings: SettingsSchema.default({ tourOrder: 'history', includeArtistNames: true }),
  lastBackupAt: z.string().optional(),
})
export type UserState = z.infer<typeof UserStateSchema>

export function createDefaultState(now: Date = new Date()): UserState {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now.toISOString(),
    ratings: [],
    favorites: [],
    notes: {},
    progress: { visitedStyles: [], blindRounds: [] },
    prompts: [],
    exercisesDone: [],
    settings: { tourOrder: 'history', includeArtistNames: true },
  }
}

/** 把存储里读出的任意值变成当前版本的状态；读不懂时返回 null。 */
export function migrate(raw: unknown): UserState | null {
  if (!raw || typeof raw !== 'object') return null
  const version = (raw as { schemaVersion?: unknown }).schemaVersion
  if (version === SCHEMA_VERSION) {
    const parsed = UserStateSchema.safeParse(raw)
    return parsed.success ? parsed.data : null
  }
  // 以后升级 schemaVersion 时在这里逐级迁移
  return null
}

/** 还没看完的那一轮盲测（最多一轮） */
export function activeBlindRound(state: UserState): BlindRound | undefined {
  const last = state.progress.blindRounds.at(-1)
  return last && !last.completedAt ? last : undefined
}

/** 最近看完的一轮盲测 */
export function lastCompletedBlindRound(state: UserState): BlindRound | undefined {
  return [...state.progress.blindRounds].reverse().find((r) => r.completedAt)
}

/** 同一对象只取最新一次评分（SPEC §9.1）。键为 `${target}:${id}`。 */
export function latestRatings(ratings: readonly Rating[]): Map<string, Rating> {
  const latest = new Map<string, Rating>()
  for (const rating of ratings) {
    const key = `${rating.target}:${rating.id}`
    const prev = latest.get(key)
    if (!prev || prev.at <= rating.at) latest.set(key, rating)
  }
  return latest
}

/** 某个对象最新一次的分数；给组件选取用，返回原始值，避免每次生成新对象 */
export function latestScore(ratings: readonly Rating[], target: RatingTarget, id: string): Score | undefined {
  let best: Rating | undefined
  for (const r of ratings) if (r.target === target && r.id === id && (!best || best.at <= r.at)) best = r
  return best?.score
}

export interface KeyValueStore {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  del(key: string): Promise<void>
}

export const idbStore: KeyValueStore = {
  get: (key) => get(key),
  set: (key, value) => set(key, value),
  del: (key) => del(key),
}

export function memoryStore(): KeyValueStore {
  const map = new Map<string, unknown>()
  return {
    get: async (key) => structuredClone(map.get(key)),
    set: async (key, value) => void map.set(key, structuredClone(value)),
    del: async (key) => void map.delete(key),
  }
}

/** 读状态。读到看不懂的数据时，先另存一份再返回默认状态，绝不静默覆盖。 */
export async function loadState(store: KeyValueStore, now: Date = new Date()): Promise<UserState> {
  let raw: unknown
  try {
    raw = await store.get(STORAGE_KEY)
  } catch {
    return createDefaultState(now)
  }
  if (raw === undefined || raw === null) return createDefaultState(now)
  const state = migrate(raw)
  if (state) return state
  try {
    await store.set(`${STORAGE_KEY}:unreadable:${now.toISOString()}`, raw)
  } catch {
    // 存不下就算了，至少不覆盖原数据之外的东西
  }
  return createDefaultState(now)
}

export async function saveState(store: KeyValueStore, state: UserState): Promise<boolean> {
  try {
    await store.set(STORAGE_KEY, state)
    return true
  } catch {
    return false
  }
}

/** 请求持久化存储（SPEC §10.5）。浏览器不支持时返回 null。 */
export async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return null
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return null
  }
}

export async function isStoragePersisted(): Promise<boolean | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return null
    return await navigator.storage.persisted()
  } catch {
    return null
  }
}
