import { useCallback, useEffect, useState, type DependencyList } from 'react'

/**
 * Carga datos de forma asíncrona y expone `reload` para refrescarlos después de guardar.
 * `fn` debe lanzar un error si la consulta falla (ver `must`).
 */
export function useLoad<T>(fn: () => PromiseLike<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    try {
      setData(await fn())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, deps)

  useEffect(() => {
    reload()
  }, [reload])

  return { data, setData, error, reload, loading: data === null && error === null }
}

/** Devuelve `data` de una respuesta de Supabase o lanza su error. */
export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}
