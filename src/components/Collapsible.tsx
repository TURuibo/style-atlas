import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

/** 可折叠的内容块（SPEC §4.5），用原生 details，无需脚本、读屏友好 */
export function Collapsible({
  title,
  children,
  defaultOpen = false,
  aside,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  aside?: ReactNode
}) {
  return (
    <details open={defaultOpen} className="group mt-6 border-t border-line pt-2">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <h2 className="font-serif text-lg font-semibold">{title}</h2>
        <span className="flex items-center gap-2 text-xs text-muted">
          {aside}
          <ChevronDown size={18} aria-hidden className="transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </span>
      </summary>
      <div className="pb-1 pt-2">{children}</div>
    </details>
  )
}
