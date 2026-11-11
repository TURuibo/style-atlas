import { Compass, EyeOff, Map, User } from 'lucide-react'
import { Link, useLocation } from 'react-router'

const tabs = [
  { to: '/', label: '导览', icon: Compass, match: (p: string) => p === '/' || p.startsWith('/tour') },
  { to: '/explore', label: '探索', icon: Map, match: (p: string) => p.startsWith('/explore') },
  { to: '/blind', label: '盲测', icon: EyeOff, match: (p: string) => p.startsWith('/blind') },
  { to: '/me', label: '我的', icon: User, match: (p: string) => p.startsWith('/me') || p.startsWith('/about') },
]

export function TabBar() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur pb-safe"
    >
      <ul className="mx-auto flex max-w-xl">
        {tabs.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
