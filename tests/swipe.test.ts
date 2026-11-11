import { describe, expect, it } from 'vitest'
import { classifyGesture } from '../src/lib/swipe'

describe('盲测手势', () => {
  it('左滑 −1、右滑 +1、上滑 +2', () => {
    expect(classifyGesture(-80, 5, 200)).toEqual({ kind: 'rate', score: -1 })
    expect(classifyGesture(90, -10, 200)).toEqual({ kind: 'rate', score: 1 })
    expect(classifyGesture(4, -120, 250)).toEqual({ kind: 'rate', score: 2 })
  })
  it('下滑、斜滑、太短都不算评分', () => {
    expect(classifyGesture(0, 120, 200)).toEqual({ kind: 'none' })
    expect(classifyGesture(70, 70, 200)).toEqual({ kind: 'none' })
    expect(classifyGesture(40, 0, 200)).toEqual({ kind: 'none' })
  })
  it('轻点算点按，按太久不算', () => {
    expect(classifyGesture(2, 3, 120)).toEqual({ kind: 'tap' })
    expect(classifyGesture(2, 3, 900)).toEqual({ kind: 'none' })
  })
})
