import { NavLink, Outlet } from 'react-router'
import { CalendarDays, CheckSquare, Home, Target, Wallet } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Hoy', icon: Home },
  { to: '/gastos', label: 'Gastos', icon: Wallet },
  { to: '/pendientes', label: 'Pendientes', icon: CheckSquare },
  { to: '/semana', label: 'Semana', icon: CalendarDays },
  { to: '/metas', label: 'Metas', icon: Target },
]

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col">
      <main className="flex-1 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-28">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <ul className="mx-auto flex max-w-2xl">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                    isActive ? 'text-brand-600 dark:text-brand-500' : 'text-slate-500 dark:text-slate-400'
                  }`
                }
              >
                <Icon size={22} strokeWidth={2} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
