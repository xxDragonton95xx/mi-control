export type PaymentMethod = 'efectivo' | 'debito' | 'credito' | 'transferencia'

export type Category = {
  id: string
  name: string
  color: string
  icon: string | null
  monthly_budget: number | null
  sort_order: number
}

export type Expense = {
  id: string
  amount: number
  spent_on: string
  category_id: string | null
  description: string | null
  payment_method: PaymentMethod
  project_id: string | null
  created_at: string
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
]

export const paymentLabel = (m: PaymentMethod) => PAYMENT_METHODS.find((p) => p.value === m)?.label ?? m
