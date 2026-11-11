import { describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  createDefaultState,
  latestRatings,
  loadState,
  memoryStore,
  migrate,
  saveState,
  type Rating,
} from '../src/lib/storage'

const now = new Date('2026-11-11T10:00:00Z')

describe('storage', () => {
  it('没有数据时返回默认状态', async () => {
    const state = await loadState(memoryStore(), now)
    expect(state).toEqual(createDefaultState(now))
  })

  it('写入后能原样读回', async () => {
    const store = memoryStore()
    const state = createDefaultState(now)
    state.favorites.push('met-45434')
    state.notes['ukiyo-e'] = '喜欢它的蓝'
    expect(await saveState(store, state)).toBe(true)
    expect(await loadState(store, now)).toEqual(state)
  })

  it('读不懂的数据会另存一份，不被默认状态覆盖', async () => {
    const store = memoryStore()
    await store.set(STORAGE_KEY, { schemaVersion: 99, whatever: true })
    const state = await loadState(store, now)
    expect(state.ratings).toEqual([])
    expect(await store.get(`${STORAGE_KEY}:unreadable:${now.toISOString()}`)).toEqual({
      schemaVersion: 99,
      whatever: true,
    })
    expect(await store.get(STORAGE_KEY)).toEqual({ schemaVersion: 99, whatever: true })
  })

  it('migrate 补齐缺省字段', () => {
    const migrated = migrate({ schemaVersion: 1, createdAt: now.toISOString() })
    expect(migrated?.settings.tourOrder).toBe('history')
    expect(migrated?.progress.visitedStyles).toEqual([])
  })

  it('migrate 拒绝非法评分', () => {
    const bad = { ...createDefaultState(now), ratings: [{ target: 'style', id: 'x', score: 3, context: 'blind', at: '' }] }
    expect(migrate(bad)).toBeNull()
  })

  it('同一对象只取最新一次评分', () => {
    const ratings: Rating[] = [
      { target: 'style', id: 'ukiyo-e', score: 1, context: 'tour', at: '2026-11-01T00:00:00Z' },
      { target: 'style', id: 'ukiyo-e', score: -1, context: 'browse', at: '2026-11-02T00:00:00Z' },
      { target: 'artwork', id: 'ukiyo-e', score: 2, context: 'blind', at: '2026-11-01T00:00:00Z' },
    ]
    const latest = latestRatings(ratings)
    expect(latest.size).toBe(2)
    expect(latest.get('style:ukiyo-e')?.score).toBe(-1)
    expect(latest.get('artwork:ukiyo-e')?.score).toBe(2)
  })
})
