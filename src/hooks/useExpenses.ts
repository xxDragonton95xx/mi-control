import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { addMonths, toISODate } from '../lib/format'
import type { Expense } from '../lib/types'

/** Gastos del mes que empieza en `month` (primer día del mes). */
export function useExpenses(month: Date) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const from = toISODate(month)
  const to = toISODate(addMonths(month, 1))

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('spent_on', from)
      .lt('spent_on', to)
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else {
      setError(null)
      setExpenses(data.map((e) => ({ ...e, amount: Number(e.amount) })))
    }
    setLoading(false)
  }, [from, to])

  useEffect(() => {
    setLoading(true)
    reload()
  }, [reload])

  return { expenses, loading, error, reload }
}
