import { describe, expect, it } from 'vitest'
import {
  backupFileName,
  makeBackup,
  mergeStates,
  needsBackupReminder,
  parseBackup,
  serializeBackup,
} from '../src/lib/backup'
import { createDefaultState, loadState, memoryStore, saveState, type UserState } from '../src/lib/storage'

const now = new Date('2026-11-11T10:00:00Z')

function sampleState(): UserState {
  const state = createDefaultState(new Date('2026-11-01T00:00:00Z'))
  state.ratings.push(
    { target: 'style', id: 'ukiyo-e', score: 2, context: 'tour', at: '2026-11-02T00:00:00Z' },
    { target: 'artwork', id: 'met-45434', score: 1, context: 'blind', at: '2026-11-03T00:00:00Z' },
  )
  state.favorites.push('met-45434')
  state.notes['ukiyo-e'] = '喜欢它的蓝'
  state.prompts.push({ subject: 'a fox in the snow', text: 'a fox in the snow, ukiyo-e woodblock print', at: '2026-11-04T00:00:00Z' })
  state.exercisesDone.push('ukiyo-e')
  state.progress.visitedStyles.push('ukiyo-e')
  return state
}

describe('backup', () => {
  it('导出 → 重置 → 导入，状态完全一致（SPEC §4.10 验收）', async () => {
    const store = memoryStore()
    const original = sampleState()
    await saveState(store, original)

    const text = serializeBackup(makeBackup(await loadState(store, now), now))
    await saveState(store, createDefaultState(now))
    expect((await loadState(store, now)).ratings).toHaveLength(0)

    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    await saveState(store, parsed.backup.data)
    expect(await loadState(store, now)).toEqual(original)
  })

  it('拒绝不是本应用的文件', () => {
    expect(parseBackup('{"hello": 1}')).toEqual({ ok: false, error: '这不是画风地图的备份文件。' })
    expect(parseBackup('not json').ok).toBe(false)
  })

  it('拒绝内容不完整的备份', () => {
    const broken = JSON.stringify({ app: 'style-atlas', schemaVersion: 1, exportedAt: now.toISOString(), data: { schemaVersion: 1 } })
    expect(parseBackup(broken).ok).toBe(false)
  })

  it('合并取并集，评分按时间去重', () => {
    const a = sampleState()
    const b = sampleState()
    b.ratings.push({ target: 'style', id: 'art-nouveau', score: 1, context: 'browse', at: '2026-11-05T00:00:00Z' })
    b.favorites.push('aic-1')
    b.notes['art-nouveau'] = '曲线'
    const merged = mergeStates(a, b)
    expect(merged.ratings).toHaveLength(3)
    expect(merged.favorites).toEqual(['met-45434', 'aic-1'])
    expect(merged.notes).toEqual({ 'ukiyo-e': '喜欢它的蓝', 'art-nouveau': '曲线' })
    expect(merged.prompts).toHaveLength(1)
  })

  it('备份文件名带日期', () => {
    expect(backupFileName(new Date(2026, 10, 9))).toBe('style-atlas-backup-2026-11-09.json')
  })

  it('超过 14 天且新增 20 次评分才提醒备份', () => {
    const state = createDefaultState(new Date('2026-10-01T00:00:00Z'))
    expect(needsBackupReminder(state, now)).toBe(false)
    for (let i = 0; i < 20; i++) {
      state.ratings.push({ target: 'artwork', id: `met-${i}`, score: 1, context: 'blind', at: '2026-10-05T00:00:00Z' })
    }
    expect(needsBackupReminder(state, now)).toBe(true)
    state.lastBackupAt = '2026-11-05T00:00:00Z'
    expect(needsBackupReminder(state, now)).toBe(false)
  })
})
