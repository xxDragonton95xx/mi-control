import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

/** Presupuesto mensual general, guardado en el perfil del usuario (se sincroniza entre dispositivos). */
export function useGeneralBudget() {
  const { session } = useAuth()
  const raw = session?.user.user_metadata?.monthly_budget
  const budget = typeof raw === 'number' && raw > 0 ? raw : null

  async function save(value: number | null) {
    const { error } = await supabase.auth.updateUser({ data: { monthly_budget: value } })
    return error?.message ?? null
  }

  return { budget, save }
}
