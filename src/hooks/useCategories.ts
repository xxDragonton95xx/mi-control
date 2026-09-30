import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../lib/types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order').order('name')
    if (error) setError(error.message)
    else {
      setError(null)
      setCategories(data.map((c) => ({ ...c, monthly_budget: c.monthly_budget === null ? null : Number(c.monthly_budget) })))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { categories, loading, error, reload }
}
