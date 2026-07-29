import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  AlertTriangle, ArrowRight, CalendarDays, CreditCard, MessageSquare, TrendingDown,
  UserCheck, Users,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { euros, pct, relative, shortDate, STATUS_LABEL, STATUS_TONE } from '@/lib/format'
import { Badge, Card, EmptyState, PageLoader, StatTile } from '@/components/ui'
import type { Payment, StudentOverview } from '@/lib/types'

interface Activity { day: string; sessions: number; active_students: number; avg_score: number | null }
interface HardQuestion {
  question_id: string; q_text: string; topic_name: string | null
  legal_ref: string | null; attempts: number; accuracy: number
}

export default function AdminHome() {
  const { school, profile } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-home', school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const [overview, activity, hardest, payments, lessons] = await Promise.all([
        supabase.rpc('school_student_overview'),
        supabase.rpc('school_activity', { p_days: 30 }),
        supabase.rpc('school_hardest_questions', { p_limit: 6 }),
        supabase.from('payments').select('*')
          .eq('school_id', school!.id).in('status', ['pending', 'overdue']),
        supabase.from('lessons').select('id, starts_at, student_id')
          .eq('school_id', school!.id).eq('status', 'scheduled')
          .gte('starts_at', new Date().toISOString())
          .lte('starts_at', new Date(Date.now() + 7 * 864e5).toISOString()),
      ])

      return {
        students: (overview.data ?? []) as StudentOverview[],
        activity: (activity.data ?? []) as Activity[],
        hardest: (hardest.data ?? []) as HardQuestion[],
        payments: (payments.data ?? []) as Payment[],
        lessonsThisWeek: lessons.data?.length ?? 0,
      }
    },
  })

  if (isLoading) return <PageLoader />

  const students = data?.students ?? []
  const active = students.filter(
    (s) => s.last_activity && new Date(s.last_activity) > new Date(Date.now() - 7 * 864e5),
  )
  const stalled = students.filter(
    (s) => ['enrolled', 'practical'].includes(s.status) &&
      (!s.last_activity || new Date(s.last_activity) < new Date(Date.now() - 14 * 864e5)),
  )
  const ready = students.filter((s) => (s.avg_score ?? 0) >= 88 && s.sessions >= 8)
  const unread = students.reduce((sum, s) => sum + s.unread_messages, 0)
  const owed = (data?.payments ?? []).reduce((sum, p) => sum + p.amount_cents, 0)
  const overdue = (data?.payments ?? []).filter((p) => p.status === 'overdue')

  const chart = (data?.activity ?? []).map((a) => ({
    day: shortDate(a.day).replace(/ \d{4}$/, ''),
    tests: a.sessions,
    alumnos: a.active_students,
  }))

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {school?.name ?? 'Panel'}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Hola {profile?.full_name?.split(' ')[0]}. Resumen de los últimos 30 días.
        </p>
      </header>

      {/* Métricas */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Alumnos activos"
          value={active.length}
          hint={`${students.length} en total`}
          icon={<Users className="h-5 w-5" />}
          tone="brand"
        />
        <StatTile
          label="Listos para examen"
          value={ready.length}
          hint="Media ≥ 88 % con 8+ tests"
          icon={<UserCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatTile
          label="Mensajes sin leer"
          value={unread}
          hint={unread ? 'Requieren respuesta' : 'Bandeja al día'}
          icon={<MessageSquare className="h-5 w-5" />}
          tone={unread > 0 ? 'warning' : 'neutral'}
        />
        <StatTile
          label="Pendiente de cobro"
          value={euros(owed)}
          hint={`${overdue.length} recibos vencidos`}
          icon={<CreditCard className="h-5 w-5" />}
          tone={overdue.length > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {/* Avisos accionables */}
      {(stalled.length > 0 || overdue.length > 0) && (
        <div className="grid gap-3.5 md:grid-cols-2">
          {stalled.length > 0 && (
            <Card className="border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    {stalled.length} {stalled.length === 1 ? 'alumno lleva' : 'alumnos llevan'} más de
                    dos semanas sin practicar
                  </p>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                    {stalled.slice(0, 3).map((s) => s.full_name).join(', ')}
                    {stalled.length > 3 && ` y ${stalled.length - 3} más`}
                  </p>
                  <Link
                    to="/alumnos"
                    className="mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-amber-900 hover:underline dark:text-amber-200"
                  >
                    Ver alumnos <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {overdue.length > 0 && (
            <Card className="border-rose-300 bg-rose-50 p-5 dark:border-rose-800 dark:bg-rose-950/30">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-rose-900 dark:text-rose-200">
                    {overdue.length} {overdue.length === 1 ? 'recibo vencido' : 'recibos vencidos'}
                  </p>
                  <p className="mt-1 text-sm text-rose-800 dark:text-rose-300">
                    Suman {euros(overdue.reduce((s, p) => s + p.amount_cents, 0))}
                  </p>
                  <Link
                    to="/cobros"
                    className="mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-rose-900 hover:underline dark:text-rose-200"
                  >
                    Gestionar cobros <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Actividad */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Actividad de la academia</h2>
          <Badge>
            <CalendarDays className="h-3 w-3" />
            {data?.lessonsThisWeek ?? 0} clases esta semana
          </Badge>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 5, right: 10, bottom: 5, left: -22 }}>
              <defs>
                <linearGradient id="gTests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1c5cf5" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1c5cf5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-200 dark:text-ink-800" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" stroke="currentColor" className="text-ink-400" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="currentColor" className="text-ink-400" />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="tests"
                name="Tests"
                stroke="#1c5cf5"
                strokeWidth={2}
                fill="url(#gTests)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alumnos recientes */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Últimos activos</h2>
            <Link to="/alumnos" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
              Ver todos
            </Link>
          </div>
          {students.length ? (
            <Card className="divide-y divide-ink-200 dark:divide-ink-800">
              {students.slice(0, 7).map((s) => (
                <Link
                  key={s.student_id}
                  to={`/alumnos/${s.student_id}`}
                  className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.full_name}</p>
                    <p className="text-sm text-ink-500">
                      {s.sessions} tests · media {pct(s.avg_score, 0)} · {relative(s.last_activity)}
                    </p>
                  </div>
                  {s.unread_messages > 0 && (
                    <Badge tone="danger">{s.unread_messages}</Badge>
                  )}
                  <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_TONE[s.status])}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </Link>
              ))}
            </Card>
          ) : (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="Todavía no hay alumnos"
              description="Comparte el código de tu autoescuela para que se registren."
            />
          )}
        </section>

        {/* Preguntas más falladas */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Lo que más se falla</h2>
            <Link to="/analitica" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
              Analítica
            </Link>
          </div>
          {data?.hardest.length ? (
            <Card className="divide-y divide-ink-200 dark:divide-ink-800">
              {data.hardest.map((q) => (
                <div key={q.question_id} className="px-5 py-3.5">
                  <div className="flex items-start gap-3">
                    <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{q.q_text}</p>
                      <p className="mt-1 text-xs text-ink-500">
                        {q.topic_name} · {q.attempts} intentos
                        {q.legal_ref && ` · ${q.legal_ref}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-rose-600">
                      {q.accuracy} %
                    </span>
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <EmptyState
              icon={<TrendingDown className="h-8 w-8" />}
              title="Sin datos suficientes"
              description="Hacen falta al menos 5 respuestas por pregunta para calcular esto."
            />
          )}
        </section>
      </div>
    </div>
  )
}
