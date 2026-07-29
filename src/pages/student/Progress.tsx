import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Award, Lock, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { pct, shortDate } from '@/lib/format'
import { Badge, Card, PageLoader, ProgressBar } from '@/components/ui'
import type { Achievement, Readiness, StudentStats, TestSession, TopicBreakdown } from '@/lib/types'

const TIER_TONE: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  silver: 'bg-ink-200 text-ink-700 dark:bg-ink-700 dark:text-ink-200',
  gold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  platinum: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
}

export default function Progress() {
  const { profile } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['progress', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const [breakdown, readiness, stats, achievements, earned, sessions] = await Promise.all([
        supabase.rpc('student_topic_breakdown'),
        supabase.rpc('student_readiness'),
        supabase.from('student_stats').select('*').eq('student_id', profile!.id).maybeSingle(),
        supabase.from('achievements').select('*').order('position'),
        supabase.from('student_achievements').select('code, earned_at')
          .eq('student_id', profile!.id),
        supabase.from('test_sessions')
          .select('score, finished_at, title')
          .eq('student_id', profile!.id).eq('status', 'completed')
          .not('score', 'is', null)
          .order('finished_at', { ascending: true }).limit(40),
      ])

      return {
        breakdown: (breakdown.data ?? []) as TopicBreakdown[],
        readiness: readiness.data as Readiness | null,
        stats: stats.data as StudentStats | null,
        achievements: (achievements.data ?? []) as Achievement[],
        earned: new Set((earned.data ?? []).map((e: { code: string }) => e.code)),
        sessions: (sessions.data ?? []) as Pick<TestSession, 'score' | 'finished_at' | 'title'>[],
      }
    },
  })

  if (isLoading) return <PageLoader />

  const worked = (data?.breakdown ?? []).filter((b) => b.answered > 0)
  const radarData = worked.slice(0, 10).map((b) => ({
    topic: b.topic_name.length > 18 ? `${b.topic_name.slice(0, 16)}…` : b.topic_name,
    accuracy: b.accuracy,
  }))
  const trend = (data?.sessions ?? []).map((s, i) => ({
    n: i + 1,
    score: s.score,
    date: shortDate(s.finished_at),
  }))
  const accuracyGlobal = data?.stats?.questions_answered
    ? (data.stats.questions_correct / data.stats.questions_answered) * 100
    : 0

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Mi progreso</h1>
        <p className="mt-1 text-sm text-ink-500">
          Cobertura del temario: {pct(data?.readiness?.coverage, 1)} del banco de preguntas visto.
        </p>
      </header>

      {/* Evolución */}
      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Evolución de tus notas</h2>
        {trend.length >= 2 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-200 dark:text-ink-800" />
                <XAxis dataKey="n" tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #d5d9e2' }}
                  formatter={(v: number) => [`${v} %`, 'Nota']}
                  labelFormatter={(_, p) => p?.[0]?.payload?.date ?? ''}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#1c5cf5"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-ink-500">
            Haz al menos dos tests para ver tu evolución.
          </p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radar por bloques */}
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Dominio por bloque</h2>
          {radarData.length >= 3 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="currentColor" className="text-ink-200 dark:text-ink-800" />
                  <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10 }} />
                  <Radar
                    dataKey="accuracy"
                    stroke="#1c5cf5"
                    fill="#1c5cf5"
                    fillOpacity={0.25}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [`${v} %`, 'Acierto']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-ink-500">
              Necesitas practicar al menos tres bloques del temario.
            </p>
          )}
        </Card>

        {/* Detalle por tema */}
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Acierto por tema</h2>
          {worked.length ? (
            <div className="space-y-3.5">
              {worked
                .slice()
                .sort((a, b) => a.accuracy - b.accuracy)
                .map((b) => (
                  <div key={b.topic_id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium">{b.topic_name}</span>
                      <span className="shrink-0 text-sm tabular-nums text-ink-500">
                        {b.accuracy} % <span className="text-xs">({b.answered})</span>
                      </span>
                    </div>
                    <ProgressBar
                      value={b.accuracy}
                      tone={b.accuracy >= 85 ? 'success' : b.accuracy >= 70 ? 'brand' : 'danger'}
                    />
                  </div>
                ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-ink-500">
              Aún no hay datos. Haz tu primer test.
            </p>
          )}
        </Card>
      </div>

      {/* Resumen numérico */}
      <Card className="grid grid-cols-2 divide-x divide-y divide-ink-200 sm:grid-cols-4 sm:divide-y-0 dark:divide-ink-800">
        {[
          { label: 'Preguntas respondidas', value: data?.stats?.questions_answered ?? 0 },
          { label: 'Acierto global', value: pct(accuracyGlobal, 1) },
          { label: 'Horas de estudio', value: Math.round((data?.stats?.study_minutes ?? 0) / 60) },
          { label: 'Mejor racha', value: `${data?.stats?.longest_streak ?? 0} días` },
        ].map((s) => (
          <div key={s.label} className="px-4 py-5 text-center">
            <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-ink-500">{s.label}</p>
          </div>
        ))}
      </Card>

      {/* Logros */}
      <section>
        <h2 className="mb-3.5 flex items-center gap-2 font-semibold">
          <Trophy className="h-4.5 w-4.5 text-amber-500" />
          Logros
          <Badge>{data?.earned.size ?? 0}/{data?.achievements.length ?? 0}</Badge>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data?.achievements.map((a) => {
            const unlocked = data.earned.has(a.code)
            return (
              <Card
                key={a.code}
                className={clsx('flex items-center gap-3.5 p-4', !unlocked && 'opacity-55')}
              >
                <div
                  className={clsx(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                    unlocked ? TIER_TONE[a.tier] : 'bg-ink-100 text-ink-400 dark:bg-ink-800',
                  )}
                >
                  {unlocked ? <Award className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.name}</p>
                  <p className="truncate text-sm text-ink-500">{a.description}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-400">
                  +{a.points}
                </span>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
