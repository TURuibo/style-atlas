import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'

export function Page({
  title,
  kicker,
  subtitle,
  back,
  children,
}: {
  title: string
  kicker?: ReactNode
  subtitle?: ReactNode
  back?: boolean
  children: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-xl px-5 pb-28 pt-safe">
      <header className="pt-6 pb-4">
        {back && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm text-muted active:bg-line/60"
          >
            <ChevronLeft size={18} aria-hidden />
            返回
          </button>
        )}
        {kicker && <div className="text-xs tracking-wide text-muted">{kicker}</div>}
        <h1 className="font-serif text-[1.75rem] leading-tight font-semibold">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
      </header>
      {children}
    </div>
  )
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mt-7">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>{children}</div>
}

/**
 * 32px 高的小标签、小按钮：看起来不变，用 ::after 把可点区域上下各撑 6px 到 44px。
 * 放这类元素的容器行距要不小于 12px（gap-y-3），免得上下两行的可点区域叠在一起。
 */
export const hitArea44 = "relative after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']"

export function Chip({ children, to }: { children: ReactNode; to?: string }) {
  const cls =
    'inline-flex min-h-8 items-center rounded-full border border-line bg-surface px-3 text-xs text-muted'
  return to ? (
    <Link to={to} className={`${cls} ${hitArea44} active:bg-line/60`}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  )
}

export function ListLink({
  to,
  title,
  detail,
  leading,
  badge,
}: {
  to: string
  title: ReactNode
  detail?: ReactNode
  leading?: ReactNode
  badge?: ReactNode
}) {
  return (
    <Link
      to={to}
      className="flex min-h-14 items-center gap-3 border-b border-line py-3 last:border-b-0 active:opacity-70"
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-medium">
          <span className="truncate">{title}</span>
          {badge}
        </div>
        {detail && <div className="mt-0.5 text-sm leading-snug text-muted">{detail}</div>}
      </div>
      <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
    </Link>
  )
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'accent' }) {
  const cls = tone === 'accent' ? 'bg-accent-soft text-accent' : 'bg-line/70 text-muted'
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-normal ${cls}`}>{children}</span>
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  type = 'button',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const styles = {
    primary: 'bg-accent text-paper',
    secondary: 'border border-line bg-surface text-ink',
    danger: 'border border-red-300 bg-surface text-red-700 dark:border-red-900 dark:text-red-300',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium active:opacity-80 disabled:opacity-40 ${styles[variant]}`}
    >
      {children}
    </button>
  )
}
