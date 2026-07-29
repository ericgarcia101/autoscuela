import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { CalendarDays, Car, CreditCard, GraduationCap, MapPin, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { dateTime, euros, shortDate } from '@/lib/format'
import { Badge, Card, EmptyState, PageLoader } from '@/components/ui'
import type { Exam, Lesson, Payment } from '@/lib/types'

const LESSON_TONE: Record<string, 'brand' | 'success' | 'danger' | 'neutral'> = {
  scheduled: 'brand',
  completed: 'success',
  cancelled: 'neutral',
  no_show: 'danger',
}

const LESSON_LABEL: Record<string, string> = {
  scheduled: 'Programada',
  completed: 'Realizada',
  cancelled: 'Cancelada',
  no_show: 'No presentado',
}

const PAYMENT_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'danger',
  refunded: 'neutral',
  cancelled: 'neutral',
}

const PAYMENT_LABEL: Record<string, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  overdue: 'Vencido',
  refunded: 'Devuelto',
  cancelled: 'Anulado',
}

export default function Agenda() {
  const { profile } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['agenda', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const [lessons, exams, payments] = await Promise.all([
        supabase.from('lessons').select('*')
          .eq('student_id', profile!.id).order('starts_at', { ascending: false }).limit(50),
        supabase.from('exams').select('*')
          .eq('student_id', profile!.id).order('scheduled_at', { ascending: false }),
        supabase.from('payments').select('*')
          .eq('student_id', profile!.id).order('created_at', { ascending: false }),
      ])
      return {
        lessons: (lessons.data ?? []) as Lesson[],
        exams: (exams.data ?? []) as Exam[],
        payments: (payments.data ?? []) as Payment[],
      }
    },
  })

  if (isLoading) return <PageLoader />

  const now = new Date()
  const upcoming = (data?.lessons ?? []).filter(
    (l) => l.status === 'scheduled' && new Date(l.starts_at) >= now,
  )
  const past = (data?.lessons ?? []).filter(
    (l) => l.status !== 'scheduled' || new Date(l.starts_at) < now,
  )
  const pendingTotal = (data?.payments ?? [])
    .filter((p) => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount_cents, 0)

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
        <p className="mt-1 text-sm text-ink-500">
          Tus clases prácticas, convocatorias de examen y estado de cuenta.
        </p>
      </header>

      {/* Exámenes */}
      {!!data?.exams.length && (
        <section>
          <h2 className="mb-3 font-semibold">Convocatorias de examen</h2>
          <div className="space-y-2.5">
            {data.exams.map((e) => (
              <Card key={e.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {e.kind === 'theory' ? 'Teórico'
                      : e.kind === 'practical' ? 'Circulación' : 'Maniobras'} · Permiso {e.license}
                  </p>
                  <p className="text-sm text-ink-500">
                    {dateTime(e.scheduled_at)}
                    {e.location && ` · ${e.location}`}
                  </p>
                </div>
                <Badge
                  tone={
                    e.result === 'passed' ? 'success'
                      : e.result === 'failed' ? 'danger'
                        : e.result === 'scheduled' ? 'brand' : 'neutral'
                  }
                >
                  {e.result === 'passed' ? 'Apto'
                    : e.result === 'failed' ? `No apto${e.faults != null ? ` (${e.faults} faltas)` : ''}`
                      : e.result === 'scheduled' ? 'Convocado'
                        : e.result === 'absent' ? 'No presentado' : 'Anulado'}
                </Badge>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Próximas clases */}
      <section>
        <h2 className="mb-3 font-semibold">Próximas clases prácticas</h2>
        {upcoming.length ? (
          <div className="space-y-2.5">
            {upcoming.map((l) => (
              <Card key={l.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                  <Car className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{dateTime(l.starts_at)}</p>
                  <p className="flex items-center gap-1.5 text-sm text-ink-500">
                    {l.duration_min} min
                    {l.pickup_point && (
                      <>· <MapPin className="h-3.5 w-3.5" /> {l.pickup_point}</>
                    )}
                  </p>
                </div>
                <Badge tone="brand">Programada</Badge>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarDays className="h-8 w-8" />}
            title="No tienes clases programadas"
            description="Contacta con tu autoescuela desde Mensajes para reservar."
          />
        )}
      </section>

      {/* Historial de clases */}
      {!!past.length && (
        <section>
          <h2 className="mb-3 font-semibold">Clases realizadas ({past.length})</h2>
          <Card className="divide-y divide-ink-200 dark:divide-ink-800">
            {past.slice(0, 15).map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{shortDate(l.starts_at)}</p>
                  {l.student_visible_notes && (
                    <p className="mt-0.5 text-sm text-ink-500">{l.student_visible_notes}</p>
                  )}
                </div>
                {l.rating != null && (
                  <span className="flex items-center gap-0.5" title={`${l.rating} de 5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={clsx(
                          'h-3.5 w-3.5',
                          i < l.rating! ? 'fill-amber-400 text-amber-400' : 'text-ink-300',
                        )}
                      />
                    ))}
                  </span>
                )}
                <Badge tone={LESSON_TONE[l.status]}>{LESSON_LABEL[l.status]}</Badge>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Cuenta */}
      {!!data?.payments.length && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Estado de cuenta</h2>
            {pendingTotal > 0 && (
              <Badge tone="warning">Pendiente: {euros(pendingTotal)}</Badge>
            )}
          </div>
          <Card className="divide-y divide-ink-200 dark:divide-ink-800">
            {data.payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.concept}</p>
                  <p className="text-sm text-ink-500">
                    {p.paid_at ? `Pagado el ${shortDate(p.paid_at)}`
                      : p.due_date ? `Vence el ${shortDate(p.due_date)}` : '—'}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">{euros(p.amount_cents)}</span>
                <Badge tone={PAYMENT_TONE[p.status]}>{PAYMENT_LABEL[p.status]}</Badge>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  )
}
