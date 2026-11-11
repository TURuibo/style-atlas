import { z } from 'zod'
import { SCHEMA_VERSION, UserStateSchema, type BlindRound, type Rating, type UserState } from './storage'

/** 备份文件（SPEC §4.10、§10.5）：{ app, schemaVersion, exportedAt, data } */
export const BACKUP_APP = 'style-atlas' as const

const BackupSchema = z.object({
  app: z.literal(BACKUP_APP),
  schemaVersion: z.literal(SCHEMA_VERSION),
  exportedAt: z.string(),
  data: UserStateSchema,
})
export type BackupFile = z.infer<typeof BackupSchema>

export function makeBackup(state: UserState, now: Date = new Date()): BackupFile {
  return { app: BACKUP_APP, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), data: state }
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2)
}

export function backupFileName(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `style-atlas-backup-${y}-${m}-${d}.json`
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string }

export function parseBackup(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: '这不是有效的 JSON 文本。' }
  }
  if (!json || typeof json !== 'object' || (json as { app?: unknown }).app !== BACKUP_APP) {
    return { ok: false, error: '这不是画风地图的备份文件。' }
  }
  if ((json as { schemaVersion?: unknown }).schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, error: '备份文件的版本和当前应用不一致。' }
  }
  const parsed = BackupSchema.safeParse(json)
  if (!parsed.success) return { ok: false, error: '备份文件内容不完整，无法导入。' }
  return { ok: true, backup: parsed.data }
}

export interface BackupSummary {
  ratings: number
  favorites: number
  notes: number
  prompts: number
  exportedAt: string
}

export function summarize(backup: BackupFile): BackupSummary {
  return {
    ratings: backup.data.ratings.length,
    favorites: backup.data.favorites.length,
    notes: Object.keys(backup.data.notes).length,
    prompts: backup.data.prompts.length,
    exportedAt: backup.exportedAt,
  }
}

/** 超过 14 天没备份、且新增 20 次评分时提醒（SPEC §4.10） */
export const BACKUP_REMIND_DAYS = 14
export const BACKUP_REMIND_RATINGS = 20

export function needsBackupReminder(state: UserState, now: Date = new Date()): boolean {
  const since = state.lastBackupAt ?? state.createdAt
  const days = (now.getTime() - Date.parse(since)) / 86_400_000
  const newRatings = state.ratings.filter((r) => r.at > since).length
  return days > BACKUP_REMIND_DAYS && newRatings >= BACKUP_REMIND_RATINGS
}

const ratingKey = (r: Rating) => `${r.target}:${r.id}:${r.at}`
const union = (a: readonly string[], b: readonly string[]) => [...new Set([...a, ...b])]

/** 两台设备的盲测记录按开始时间并在一起，重新编号 */
function mergeRounds(a: readonly BlindRound[], b: readonly BlindRound[]): BlindRound[] {
  const byStart = new Map<string, BlindRound>()
  for (const r of [...a, ...b]) {
    const prev = byStart.get(r.startedAt)
    // 同一轮两边都有时，取看得更多的那份
    if (!prev || r.position > prev.position) byStart.set(r.startedAt, r)
  }
  return [...byStart.values()]
    .sort((x, y) => x.startedAt.localeCompare(y.startedAt))
    .map((r, i) => ({ ...r, number: i + 1 }))
}

/**
 * 合并导入：评分、收藏、练习、看过的风格取并集（评分按时间去重）；
 * 笔记同一风格以较新的备份为准；设置保留当前的。
 */
export function mergeStates(current: UserState, incoming: UserState): UserState {
  const ratings = new Map<string, Rating>()
  for (const r of [...current.ratings, ...incoming.ratings]) ratings.set(ratingKey(r), r)
  const prompts = new Map<string, UserState['prompts'][number]>()
  for (const p of [...current.prompts, ...incoming.prompts]) prompts.set(`${p.at}:${p.text}`, p)

  return {
    ...current,
    createdAt: current.createdAt < incoming.createdAt ? current.createdAt : incoming.createdAt,
    ratings: [...ratings.values()].sort((a, b) => a.at.localeCompare(b.at)),
    favorites: union(current.favorites, incoming.favorites),
    notes: { ...current.notes, ...incoming.notes },
    progress: {
      visitedStyles: union(current.progress.visitedStyles, incoming.progress.visitedStyles),
      tour: current.progress.tour ?? incoming.progress.tour,
      blindRounds: mergeRounds(current.progress.blindRounds, incoming.progress.blindRounds),
      introSeenAt: [current.progress.introSeenAt, incoming.progress.introSeenAt].filter(Boolean).sort()[0],
    },
    prompts: [...prompts.values()].sort((a, b) => a.at.localeCompare(b.at)),
    exercisesDone: union(current.exercisesDone, incoming.exercisesDone),
  }
}
