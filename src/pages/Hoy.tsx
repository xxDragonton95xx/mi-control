import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import ComingSoon from '../components/ComingSoon'

export default function Hoy() {
  const { session } = useAuth()
  const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm capitalize text-slate-500 dark:text-slate-400">{hoy}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{session?.user.email}</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 active:bg-slate-200 dark:text-slate-400 dark:active:bg-slate-800"
        >
          <LogOut size={16} /> Salir
        </button>
      </header>
      <ComingSoon title="Hoy" phase={4}>
        Aquí verás tu agenda del día, los pendientes que vencen hoy y cuánto llevas gastado este mes.
      </ComingSoon>
    </div>
  )
}
