import type { Score } from '../lib/storage'

export const scoreLabels: Record<Score, string> = {
  [-2]: '讨厌',
  [-1]: '不太喜欢',
  [0]: '一般',
  [1]: '喜欢',
  [2]: '超爱',
}

const order: Score[] = [-2, -1, 0, 1, 2]

/** 5 档评分（SPEC §4.1）。手势在盲测里另做。 */
export function RatingBar({ value, onRate, label }: { value?: Score; onRate: (score: Score) => void; label?: string }) {
  return (
    <div role="group" aria-label={label ?? '评分'} className="grid grid-cols-5 gap-1.5">
      {order.map((score) => {
        const selected = value === score
        return (
          <button
            key={score}
            type="button"
            aria-pressed={selected}
            onClick={() => onRate(score)}
            className={`flex min-h-12 flex-col items-center justify-center rounded-xl border text-xs active:scale-95 ${
              selected ? 'border-accent bg-accent text-paper' : 'border-line bg-surface text-ink'
            }`}
          >
            <span aria-hidden className="text-[10px] tracking-widest opacity-70">
              {score > 0 ? '+'.repeat(score) : score < 0 ? '−'.repeat(-score) : '·'}
            </span>
            {scoreLabels[score]}
          </button>
        )
      })}
    </div>
  )
}
