import { attributeKeys, type Attributes } from '../content/schema'
import { attributeEnds } from '../lib/attributes'

/** 5 维特征条：两端带名字，圆点标出这种风格的位置（−2…+2） */
export function AttributeBars({ attributes }: { attributes: Attributes }) {
  return (
    <ul className="space-y-2.5" aria-label="画面特征">
      {attributeKeys.map((key) => {
        const value = attributes[key]
        const { low, high } = attributeEnds[key]
        const left = ((value + 2) / 4) * 100
        return (
          <li key={key} className="grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-2 text-xs">
            <span className={`text-right ${value < 0 ? 'font-medium text-ink' : 'text-muted'}`}>{low}</span>
            <span className="relative h-5" role="img" aria-label={`${low}到${high}之间，${value}`}>
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
              {[0, 25, 50, 75, 100].map((p) => (
                <span key={p} className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-line" style={{ left: `${p}%` }} />
              ))}
              <span
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
                style={{ left: `${left}%` }}
              />
            </span>
            <span className={value > 0 ? 'font-medium text-ink' : 'text-muted'}>{high}</span>
          </li>
        )
      })}
    </ul>
  )
}
