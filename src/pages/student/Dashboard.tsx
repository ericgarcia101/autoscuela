import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  AlarmClock, ArrowRight, Award, CalendarDays, CheckCircle2, Flame, GraduationCap,
  Megaphone, Play, Sparkles, Target, TrendingUp, Trophy,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { dateTime, pct, relative } from '@/lib/format'
import { Badge, Button, Card, EmptyState, PageLoader, ProgressBar, StatTile } from '@/components/ui'
import type {
  Announcement, Assignment, Exam, Lesson, Readiness, StudentStats, TestSession,
} from '@/lib/types'

const VERDICT: Record<Readiness['verdict'], { label: string; tone: string; copy: string }> = {
  listo: {
    label: 'Listo para examinarte',
    tone: 'text-emerald-600 dark:text-emerald-400',
    copy: 'Tus resultados son sólidos y constantes. Habla con tu autoescuela para pedir fecha.',
  },
  casi: {
    label: 'Casi a punto',
    tone: 'text-brand-600 dark:text-brand-400',
    copy: 'Vas muy bien. Refuerza los bloques flojos y estarás listo en pocos días.',
  },
  en_progreso: {
    label: 'En progreso',
    tone: 'text-amber-600 dark:text-amber-400',
    copy: 'Sigue haciendo tests a diario: la constancia es lo que más sube la nota.',
  },
  inicial: {
    label: 'Empezando',
    tone: 'text-ink-500',
    copy: 'Empieza por los tests de temario para cubrir todos los bloques.',
  },
}

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['student-home', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const [readiness, stats, sessions, assignments, lessons, exams, announcements] =
        await Promise.all([
          supabase.rpc('student_readiness'),
          supabase.from('student_stats').select('*').eq('student_id', profile!.id).maybeSingle(),
          supabase.from('test_sessions').select('*')
            .eq('student_id', profile!.id).eq('status', 'completed')
            .order('finished_at', { ascending: false }).limit(5),
          supabase.from('assignments').select('*')
            .eq('student_id', profile!.id).in('status', ['pending', 'in_progress'])
            .order('due_at', { ascending: true, nullsFirst: false }).limit(5),
          supabase.from('lessons').select('*')
            .eq('student_id', profile!.id).eq('status', 'scheduled')
            .gte('starts_at', new Date().toISOString())
            .order('starts_at').limit(3),
          supabase.from('exams').select('*')
            .eq('student_id', profile!.id).eq('result', 'scheduled')
            .order('scheduled_at').limit(2),
          // El filtro por autoescuela, fechas y audiencia lo aplica la política RLS
          // "leer anuncios", así que aquí basta con ordenar y limitar.
          supabase.from('announcements').select('*')
            .order('pinned', { ascending: false })
            .order('publish_at', { ascending: false }).limit(5),
        ])

      return {
        readiness: readiness.data as Readiness | null,
        stats: stats.data as StudentStats | null,
        sessions: (sessions.data ?? []) as TestSession[],
        assignments: (assignments.data ?? []) as Assignment[],
        lessons: (lessons.data ?? []) as Lesson[],
        exams: (exams.data ?? []) as Exam[],
        announcements: (announcements.data ?? []) as Announcement[],
      }
    },
  })

  async function quickStart(code: string) {
    const { data: id, error } = await supabase.rpc('start_test_session', { p_template_code: code })
    if (!error) navigate(`/test/${id}`)
  }

  if (isLoading) return <PageLoader />

  const readiness = data?.readiness
  const stats = data?.stats
  const verdict = readiness ? VERDICT[readiness.verdict] : VERDICT.inicial
  const firstName = profile?.full_name?.split(' ')[0] || ''

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Hola{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Preparando el permiso {profile?.target_license ?? 'B'}
          {stats?.current_streak
            ? ` · ${stats.current_streak} ${stats.current_streak === 1 ? 'día' : 'días'} seguidos estudiando`
            : ''}
        </p>
      </header>

      {/* Tablón de la autoescuela */}
      {!!data?.announcements.length && (
        <section className="space-y-2.5">
          {data.announcements.map((a) => (
            <Card
              key={a.id}
              className={clsx(
                'flex items-start gap-3.5 p-4',
                a.pinned && 'border-brand-300 bg-brand-50/60 dark:border-brand-800 dark:bg-brand-950/30',
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                <Megaphone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium leading-tight">{a.title}</p>
                  {a.pinned && <Badge tone="brand">Fijado</Badge>}
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-500">{a.body}</p>
                <p className="mt-1.5 text-xs text-ink-400">{relative(a.publish_at)}</p>
              </div>
            </Card>
          ))}
        </section>
      )}

      {/* Índice de preparación */}
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-medium text-ink-500">Índice de preparación</p>
            <div className="mt-1.5 flex items-baseline gap-3">
              <span className="text-4xl font-bold tabular-nums">
                {readiness?.readiness?.toFixed(0) ?? '0'}
                <span className="text-lg text-ink-400">/100</span>
              </span>
              <span className={clsx('text-sm font-semibold', verdict.tone)}>{verdict.label}</span>
            </div>
            <ProgressBar
              value={readiness?.readiness ?? 0}
              tone={
                (readiness?.readiness ?? 0) >= 85 ? 'success'
                  : (readiness?.readiness ?? 0) >= 60 ? 'brand' : 'warning'
              }
              className="mt-4"
            />
            <p className="mt-3 text-sm text-ink-500">{verdict.copy}</p>

            {!!readiness?.weak_topics?.length && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
                  Bloques a reforzar
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {readiness.weak_topics.slice(0, 4).map((t) => (
                    <Badge key={t} tone="warning">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5 md:w-56">
            <Button
              size="lg"
              onClick={() => quickStart('examen_oficial_b')}
              icon={<GraduationCap className="h-4.5 w-4.5" />}
            >
              Simulacro de examen
            </Button>
            <Button
              variant="secondary"
              onClick={() => quickStart('mis_fallos')}
              icon={<Target className="h-4 w-4" />}
            >
              Repasar mis fallos
            </Button>
            <Button
              variant="secondary"
              onClick={() => quickStart('reto_diario')}
              icon={<Flame className="h-4 w-4" />}
            >
              Reto diario
            </Button>
          </div>
        </div>
      </Card>

      {/* Métricas */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Media reciente"
          value={pct(readiness?.recent_average, 1)}
          hint="Últimos 10 tests"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="brand"
        />
        <StatTile
          label="Tests completados"
          value={stats?.sessions_completed ?? 0}
          hint={`${stats?.questions_answered ?? 0} preguntas respondidas`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatTile
          label="Racha actual"
          value={`${stats?.current_streak ?? 0} días`}
          hint={`Récord: ${stats?.longest_streak ?? 0} días`}
          icon={<Flame className="h-5 w-5" />}
          tone="warning"
        />
        <StatTile
          label="Puntos"
          value={stats?.points ?? 0}
          hint={`${Math.round((stats?.study_minutes ?? 0) / 60)} h de estudio`}
          icon={<Trophy className="h-5 w-5" />}
          tone="brand"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tareas del profesor */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Tareas de tu profesor</h2>
            {!!data?.assignments.length && (
              <Badge tone="brand">{data.assignments.length} pendientes</Badge>
            )}
          </div>

          {data?.assignments.length ? (
            <div className="space-y-2.5">
              {data.assignments.map((a) => {
                const overdue = a.due_at && new Date(a.due_at) < new Date()
                return (
                  <Card key={a.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-tight">{a.title}</p>
                        {a.message && (
                          <p className="mt-1 text-sm text-ink-500">{a.message}</p>
                        )}
                        {a.due_at && (
                          <p
                            className={clsx(
                              'mt-1.5 flex items-center gap-1.5 text-xs',
                              overdue ? 'text-rose-600 dark:text-rose-400' : 'text-ink-500',
                            )}
                          >
                            <AlarmClock className="h-3.5 w-3.5" />
                            {overdue ? 'Fuera de plazo · ' : 'Entrega '}{dateTime(a.due_at)}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        icon={<Play className="h-3.5 w-3.5" />}
                        onClick={async () => {
                          const { data: id, error } = await supabase.rpc('start_test_session', {
                            p_template_code: 'random_30',
                            p_assignment_id: a.id,
                          })
                          if (!error) navigate(`/test/${id}`)
                        }}
                      >
                        Hacer
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8" />}
              title="Nada pendiente"
              description="Tu profesor no te ha asignado tareas ahora mismo."
            />
          )}
        </section>

        {/* Agenda */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Próximas citas</h2>
            <Link to="/agenda" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
              Ver agenda
            </Link>
          </div>

          {(data?.lessons.length ?? 0) + (data?.exams.length ?? 0) > 0 ? (
            <div className="space-y-2.5">
              {data?.exams.map((e) => (
                <Card key={e.id} className="flex items-center gap-3.5 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      Examen {e.kind === 'theory' ? 'teórico' : 'práctico'} · {e.license}
                    </p>
                    <p className="text-sm text-ink-500">{dateTime(e.scheduled_at)}</p>
                  </div>
                </Card>
              ))}
              {data?.lessons.map((l) => (
                <Card key={l.id} className="flex items-center gap-3.5 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Clase práctica · {l.duration_min} min</p>
                    <p className="text-sm text-ink-500">
                      {dateTime(l.starts_at)}
                      {l.pickup_point ? ` · ${l.pickup_point}` : ''}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarDays className="h-8 w-8" />}
              title="Sin citas programadas"
              description="Cuando tu autoescuela te asigne clases o examen, aparecerán aquí."
            />
          )}
        </section>
      </div>

      {/* Últimos tests */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Tus últimos tests</h2>
          <Link to="/historial" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
            Ver todo
          </Link>
        </div>

        {data?.sessions.length ? (
          <Card className="divide-y divide-ink-200 dark:divide-ink-800">
            {data.sessions.map((s) => (
              <Link
                key={s.id}
                to={`/resultado/${s.id}`}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/50"
              >
                <div
                  className={clsx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums',
                    s.passed
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
                  )}
                >
                  {Math.round(s.score ?? 0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="text-sm text-ink-500">
                    {s.correct}/{s.total_questions} aciertos · {relative(s.finished_at)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-400" />
              </Link>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon={<Award className="h-8 w-8" />}
            title="Todavía no has hecho ningún test"
            description="Empieza por un test de temario para ver dónde estás."
            action={
              <Link to="/tests">
                <Button icon={<Play className="h-4 w-4" />}>Elegir un test</Button>
              </Link>
            }
          />
        )}
      </section>

      {/* Atajo al tutor */}
      <Card className="flex flex-col gap-4 bg-gradient-to-br from-brand-50 to-white p-6 sm:flex-row sm:items-center dark:from-brand-950/40 dark:to-ink-900">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">¿Alguna duda del temario?</h3>
          <p className="mt-0.5 text-sm text-ink-500">
            El tutor te responde citando el artículo concreto de la normativa.
          </p>
        </div>
        <Link to="/tutor">
          <Button variant="secondary">Preguntar</Button>
        </Link>
      </Card>
    </div>
  )
}
