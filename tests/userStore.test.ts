import { beforeEach, describe, expect, it } from 'vitest'
import { activeBlindRound, lastCompletedBlindRound, memoryStore } from '../src/lib/storage'
import { useUserStore } from '../src/store/userStore'

const store = () => useUserStore.getState()

describe('盲测进度（store）', () => {
  beforeEach(async () => {
    await store().init(memoryStore())
    store().reset()
  })

  it('开始、评分、跳过、撤销、完成', () => {
    store().startBlindRound(['a', 'b', 'c'])
    expect(activeBlindRound(store().state)?.position).toBe(0)

    store().rateBlind(2)
    store().skipBlind()
    expect(activeBlindRound(store().state)?.position).toBe(2)
    expect(store().state.ratings.map((r) => [r.id, r.score, r.context])).toEqual([['a', 2, 'blind']])

    // 撤销跳过的 b：只退位置
    store().undoBlind()
    expect(activeBlindRound(store().state)?.position).toBe(1)
    // 再撤销 a：退位置并删掉 a 的评分
    store().undoBlind()
    expect(activeBlindRound(store().state)?.position).toBe(0)
    expect(store().state.ratings).toHaveLength(0)

    store().rateBlind(1)
    store().rateBlind(-1)
    store().rateBlind(0)
    expect(activeBlindRound(store().state)).toBeUndefined()
    const done = lastCompletedBlindRound(store().state)
    expect(done?.completedAt).toBeDefined()
    expect(store().state.ratings).toHaveLength(3)
  })

  it('有没看完的一轮时不会重开', () => {
    store().startBlindRound(['a'])
    store().startBlindRound(['x', 'y'])
    expect(store().state.progress.blindRounds).toHaveLength(1)
  })

  it('撤销不会删掉本轮之前的评分', () => {
    store().rate('artwork', 'a', -2, 'browse')
    store().startBlindRound(['a', 'b'])
    store().skipBlind()
    store().undoBlind()
    expect(store().state.ratings).toHaveLength(1)
  })
})
