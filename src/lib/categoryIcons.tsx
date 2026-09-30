import {
  Baby,
  Car,
  Circle,
  CircleEllipsis,
  Coffee,
  Dumbbell,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  PawPrint,
  Plane,
  Popcorn,
  Repeat,
  Shirt,
  ShoppingCart,
  Smartphone,
  Utensils,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  home: House,
  zap: Zap,
  'heart-pulse': HeartPulse,
  popcorn: Popcorn,
  repeat: Repeat,
  'graduation-cap': GraduationCap,
  'circle-ellipsis': CircleEllipsis,
  'shopping-cart': ShoppingCart,
  coffee: Coffee,
  shirt: Shirt,
  gift: Gift,
  plane: Plane,
  'paw-print': PawPrint,
  dumbbell: Dumbbell,
  smartphone: Smartphone,
  wrench: Wrench,
  baby: Baby,
}

export const CATEGORY_COLORS = [
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#64748b', '#a16207',
]

export function CategoryBadge({ icon, color, size = 40 }: { icon: string | null; color: string; size?: number }) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || Circle
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl"
      style={{ width: size, height: size, backgroundColor: `${color}22`, color }}
    >
      <Icon size={size * 0.5} />
    </span>
  )
}
