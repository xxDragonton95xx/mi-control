const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export const formatMXN = (n: number) => mxn.format(n)

const pad = (n: number) => String(n).padStart(2, '0')

/** Fecha local en formato YYYY-MM-DD (sin desfase por zona horaria). */
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Convierte YYYY-MM-DD a Date local. */
export const fromISODate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toISODate(new Date())

/**
 * Fecha mínima permitida en un campo: hoy, salvo que el registro ya tenga guardada
 * una fecha anterior (para poder editarlo sin que el formulario lo rechace).
 */
export const minDateFor = (saved?: string | null) => {
  const today = todayISO()
  return saved && saved < today ? saved : today
}

export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)

export const monthLabel = (d: Date) => d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

export function dayLabel(iso: string, today: string) {
  if (iso === today) return 'Hoy'
  const yesterday = fromISODate(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (iso === toISODate(yesterday)) return 'Ayer'
  return fromISODate(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })
}

/** Acepta "1,250.50", "$300", "99" → número; NaN si no es válido. */
export const parseAmount = (s: string) => {
  const clean = s.replace(/[^0-9.]/g, '')
  return clean ? Number(clean) : NaN
}
