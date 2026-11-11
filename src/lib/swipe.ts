/**
 * 盲测手势（SPEC §4.1）：左滑 −1，右滑 +1，上滑 +2；几乎没动又很快松手算“点按”。纯函数。
 */
import type { Score } from './storage'

export type Gesture = { kind: 'rate'; score: Score } | { kind: 'tap' } | { kind: 'none' }

export const SWIPE_MIN_PX = 60
const TAP_MAX_PX = 10
const TAP_MAX_MS = 350

export function classifyGesture(dx: number, dy: number, ms: number): Gesture {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (ax < TAP_MAX_PX && ay < TAP_MAX_PX) return ms <= TAP_MAX_MS ? { kind: 'tap' } : { kind: 'none' }
  // 方向要明确：主方向比另一方向长 1.2 倍以上
  if (ax >= SWIPE_MIN_PX && ax > ay * 1.2) return { kind: 'rate', score: dx > 0 ? 1 : -1 }
  if (dy <= -SWIPE_MIN_PX && ay > ax * 1.2) return { kind: 'rate', score: 2 }
  return { kind: 'none' }
}
