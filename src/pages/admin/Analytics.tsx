import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { BookOpen, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { pct, shortDate } from '@/lib/format'
import { Card, EmptyState, PageLoader, StatTile } from '@/components/ui'
import type { StudentOverview } from '@/lib/types'

interface Activity { day: string; sessions: number; active_students: number; avg_score: number | null }
interface HardQuestion {
  question_id: string; q_text: string; topic_name: string | null
  legal_ref: string | null; attempts: number; accuracy: number
}

const RANGES = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
]

export default function Analytics() {
  const { school } = useAuth()
  const [days, setDays] = useState(30)

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', school?.id, days],
    enabled: !!school?.id,
    queryFn: async () => {
      const [activity, hardest, overview, topics] = await Promise.all([
        supabase.rpc('school_activity', { p_days: days }),
        supabase.rpc('school_hardest_questions', { p_limit: 15 }),
        supabase.rpc('school_student_overview'),
        supabase.from('topics').select('id, name, code').is('parent_id', null).order('position'),
      ])
      return {
        activity: (activity.data ?? []) as Activity[],
        hardest: (hardest.data ?? []) as HardQuestion[],
        students: (overview.data ?? []) as StudentOverview[],
        topics: (topics.data ?? []) as { id: string; name: string; code: string }[],
      }
    },
  })

  const chart = useMemo(
    () =>
      (data?.activity ?? []).map((a) => ({
        day: shortDate(a.day).replace(/ \d{4}$/, ''),
        tests: a.sessions,
        alumnos: a.active_students,
        media: a.avg_score,
      })),
    [data?.activity],
  )

  if (isLoading) return <PageLoader />

  const students = data?.students ?? []
  const withData = students.filter((s) => s.sessions > 0)
  const avgSchool = withData.length
    ? withData.reduce((sum, s) => sum + (s.avg_score ?? 0), 0) / withData.length
    : 0
  const totalTests = (data?.activity ?? []).reduce((s, a) => s + Number(a.sessions), 0)
  const readyCount = students.filter((s) => (s.avg_score ?? 0) >= 88 && s.sessions >= 8).length
  const atRisk = students.filter((s) => s.sessions >= 3 && (s.avg_score ?? 0) < 65)

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analítica</h1>
          <p className="mt-1 text-sm text-ink-500">
            Cómo va tu academia y dónde conviene reforzar la clase teórica.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={
                days === r.days
                  ? 'rounded-full bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white'
                  : 'rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800'
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Tests realizados"
          value={totalTests}
          hint={`En los últimos ${days} días`}
          icon={<BookOpen className="h-5 w-5" />}
          tone="brand"
        />
        <StatTile
          label="Media de la academia"
          value={pct(avgSchool, 1)}
          hint={`${withData.length} alumnos con datos`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone={avgSchool >= 80 ? 'success' : 'warning'}
        />
        <StatTile
          label="Listos para examen"
          value={readyCount}
          hint="Media ≥ 88 % con 8+ tests"
          icon={<Users className="h-5 w-5" />}
          tone="success"
        />
        <StatTile
          label="En riesgo"
          value={atRisk.length}
          hint="Media por debajo del 65 %"
          icon={<TrendingDown className="h-5 w-5" />}
          tone={atRisk.length ? 'danger' : 'neutral'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Tests y alumnos activos por día</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 5, right: 10, bottom: 5, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-200 dark:text-ink-800" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" stroke="currentColor" className="text-ink-400" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="currentColor" className="text-ink-400" />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="tests" name="Tests" fill="#1c5cf5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="alumnos" name="Alumnos" fill="#8ec4ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Nota media diaria</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 5, right: 10, bottom: 5, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-200 dark:text-ink-800" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" stroke="currentColor" className="text-ink-400" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`${v} %`, 'Media']}
                />
                <Line
                  type="monotone"
                  dataKey="media"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Lo más fallado */}
      <section>
        <h2 className="mb-3 font-semibold">Preguntas que más se fallan</h2>
        <p className="mb-4 text-sm text-ink-500">
          Ordenadas por porcentaje de acierto. Son las candidatas naturales para repasar en clase.
        </p>
        {data?.hardest.length ? (
          <Card className="divide-y divide-ink-200 dark:divide-ink-800">
            {data.hardest.map((q, i) => (
              <div key={q.question_id} className="flex items-start gap-4 px-5 py-3.5">
                <span className="mt-0.5 w-6 shrink-0 text-sm font-semibold tabular-nums text-ink-400">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{q.q_text}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    {q.topic_name} · {q.attempts} respuestas
                    {q.legal_ref && ` · ${q.legal_ref}`}
                  </p>
                </div>
                <div className="w-24 shrink-0 text-right">
                  <span className="text-sm font-semibold tabular-nums text-rose-600">
                    {q.accuracy} %
                  </span>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
                    <div
                      className="h-full rounded-full bg-rose-500"
                      style={{ width: `${q.accuracy}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon={<TrendingDown className="h-8 w-8" />}
            title="Sin datos suficientes"
            description="Cada pregunta necesita al menos 5 respuestas para entrar en este ranking."
          />
        )}
      </section>

      {/* Alumnos en riesgo */}
      {atRisk.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Alumnos que necesitan atención</h2>
          <Card className="divide-y divide-ink-200 dark:divide-ink-800">
            {atRisk.map((s) => (
              <div key={s.student_id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.full_name}</p>
                  <p className="text-sm text-ink-500">
                    {s.sessions} tests · racha de {s.current_streak} días
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-rose-600">
                  {pct(s.avg_score, 0)}
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  )
}
