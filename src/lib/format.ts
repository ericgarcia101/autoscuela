import { formatDistanceToNow, format, isToday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'

export function euros(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
    .format(cents / 100)
}

export function pct(value: number | null | undefined, digits = 0): string {
  if (value == null) return '—'
  return `${value.toFixed(digits)} %`
}

export function relative(iso: string | null | undefined): string {
  if (!iso) return 'nunca'
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es })
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isToday(d)) return `hoy a las ${format(d, 'HH:mm')}`
  if (isTomorrow(d)) return `mañana a las ${format(d, 'HH:mm')}`
  return format(d, "d 'de' MMMM 'a las' HH:mm", { locale: es })
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return format(new Date(iso), 'd MMM yyyy', { locale: es })
}

export function duration(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} s`
  return `${m} min ${s.toString().padStart(2, '0')} s`
}

export function clock(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60)
  const s = Math.max(0, seconds) % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export const STATUS_LABEL: Record<string, string> = {
  lead: 'Interesado',
  enrolled: 'Matriculado',
  theory_pass: 'Teórico aprobado',
  practical: 'En prácticas',
  graduated: 'Titulado',
  paused: 'En pausa',
  dropped: 'Baja',
}

export const STATUS_TONE: Record<string, string> = {
  lead: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
  enrolled: 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200',
  theory_pass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  practical: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  graduated: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  paused: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400',
  dropped: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
}

export const CATEGORY_LABEL: Record<string, string> = {
  examen: 'Exámenes oficiales',
  temario: 'Por temario',
  senales: 'Señales',
  personalizado: 'Personalizados',
  reto: 'Retos',
  nivel: 'Por dificultad',
  libre: 'Práctica libre',
  general: 'Otros',
}

export const CATEGORY_ORDER = [
  'examen', 'personalizado', 'temario', 'senales', 'reto', 'nivel', 'libre', 'general',
]
