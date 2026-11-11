import { Frown, Heart, Meh, Smile, ThumbsDown, type LucideIcon } from 'lucide-react'
import type { Score } from '../lib/storage'

export const scoreLabels: Record<Score, string> = {
  [-2]: '讨厌',
  [-1]: '不太喜欢',
  [0]: '一般',
  [1]: '喜欢',
  [2]: '超爱',
}

const scoreIcons: Record<Score, LucideIcon> = {
  [-2]: ThumbsDown,
  [-1]: Frown,
  [0]: Meh,
  [1]: Smile,
  [2]: Heart,
}

const order: Score[] = [-2, -1, 0, 1, 2]

/**
 * 5 档评分（SPEC §4.1）：图标加文字。
 * tone="dark" 用在看图器里；compact 用在空间紧的地方（看图器、盲测的拇指区）。
 */
export function RatingBar({
  value,
  onRate,
  label,
  tone = 'light',
  compact = false,
}: {
  value?: Score
  onRate: (score: Score) => void
  label?: string
  tone?: 'light' | 'dark'
  compact?: boolean
}) {
  return (
    <div role="group" aria-label={label ?? '评分'} className="grid grid-cols-5 gap-1.5">
      {order.map((score) => {
        const selected = value === score
        const Icon = scoreIcons[score]
        const colors =
          tone === 'dark'
            ? selected
              ? 'border-white bg-white text-black'
              : 'border-white/25 bg-white/5 text-white'
            : selected
              ? 'border-accent bg-accent text-paper'
              : 'border-line bg-surface text-ink'
        return (
          <button
            key={score}
            type="button"
            aria-pressed={selected}
            aria-label={`${scoreLabels[score]}（${score > 0 ? '+' : ''}${score}）`}
            onClick={() => onRate(score)}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border active:scale-95 motion-reduce:active:scale-100 ${
              compact ? 'min-h-11 text-[11px]' : 'min-h-14 text-xs'
            } ${colors}`}
          >
            <Icon size={compact ? 16 : 18} aria-hidden strokeWidth={selected ? 2.4 : 1.8} />
            <span aria-hidden>{scoreLabels[score]}</span>
          </button>
        )
      })}
    </div>
  )
}
