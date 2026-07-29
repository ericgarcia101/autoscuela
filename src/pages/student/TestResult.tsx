import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  BookOpen, Check, Flag, Home, PartyPopper, RefreshCw, Target, TrendingUp, X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { duration, pct } from '@/lib/format'
import { Badge, Button, Card, PageLoader, ProgressBar } from '@/components/ui'
import type { TestSession } from '@/lib/types'

// Nombres tal y como los devuelve la RPC `session_review` (prefijo `q_` para
// evitar colisiones con tipos de Postgres en el `returns table`).
interface ReviewRow {
  question_id: string
  q_order: number
  q_text: string
  options: string[]
  correct_index: number
  selected_index: number | null
  is_correct: boolean | null
  explanation: string
  legal_ref: string | null
  legal_url: string | null
  image_url: string | null
  topic_name: string | null
  flagged: boolean
}

export default function TestResult() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'wrong' | 'flagged'>('wrong')
  const [retrying, setRetrying] = useState(false)

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      if (error) throw error
      return data as TestSession
    },
  })

  // Si el usuario cerró la pestaña antes de que se guardara el cierre,
  // se vuelve a intentar aquí.
  useEffect(() => {
    if (session?.status === 'in_progress' && sessionId) {
      supabase.rpc('finish_test_session', { p_session: sessionId })
        .then(() => window.location.reload())
    }
  }, [session?.status, sessionId])

  const { data: review } = useQuery({
    queryKey: ['review', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('session_review', { p_session: sessionId })
      if (error) throw error
      return (data ?? []) as ReviewRow[]
    },
    enabled: session?.status === 'completed',
  })

  async function retry() {
    if (!session?.template_code) return
    setRetrying(true)
    const { data, error } = await supabase.rpc('start_test_session', {
      p_template_code: session.template_code,
    })
    if (!error) navigate(`/test/${data}`)
    else setRetrying(false)
  }

  if (isLoading || !session) return <PageLoader label="Cargando resultado…" />

  const passed = session.passed === true
  const score = session.score ?? 0
  const rows = (review ?? []).filter((r) =>
    filter === 'all' ? true : filter === 'wrong' ? r.is_correct === false : r.flagged,
  )
  const wrongCount = (review ?? []).filter((r) => r.is_correct === false).length
  const flaggedCount = (review ?? []).filter((r) => r.flagged).length

  return (
    <div className="min-h-full bg-ink-50 dark:bg-ink-950">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Resumen */}
        <Card className="overflow-hidden">
          <div
            className={clsx(
              'px-6 py-8 text-center',
              passed
                ? 'bg-gradient-to-b from-emerald-50 to-transparent dark:from-emerald-950/40'
                : 'bg-gradient-to-b from-rose-50 to-transparent dark:from-rose-950/40',
            )}
          >
            <div
              className={clsx(
                'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl',
                passed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white',
              )}
            >
              {passed ? <PartyPopper className="h-8 w-8" /> : <Target className="h-8 w-8" />}
            </div>

            <h1 className="text-2xl font-bold">
              {passed ? '¡Aprobado!' : 'No ha sido esta vez'}
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">{session.title}</p>

            <p
              className={clsx(
                'mt-5 text-5xl font-bold tabular-nums',
                passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
              )}
            >
              {pct(score, 1)}
            </p>

            <div className="mx-auto mt-5 max-w-xs">
              <ProgressBar value={score} tone={passed ? 'success' : 'danger'} />
              <p className="mt-2 text-xs text-ink-500">
                {session.max_failures !== null
                  ? `Máximo permitido: ${session.max_failures} fallos`
                  : `Necesitas un ${session.pass_threshold} % para aprobar`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-ink-200 border-t border-ink-200 sm:grid-cols-4 dark:divide-ink-800 dark:border-ink-800">
            {[
              { label: 'Aciertos', value: session.correct, tone: 'text-emerald-600' },
              { label: 'Fallos', value: session.incorrect, tone: 'text-rose-600' },
              { label: 'En blanco', value: session.blank, tone: 'text-ink-500' },
              { label: 'Tiempo', value: duration(session.duration_sec), tone: 'text-ink-700 dark:text-ink-200' },
            ].map((s) => (
              <div key={s.label} className="px-4 py-4 text-center">
                <p className={clsx('text-xl font-bold tabular-nums', s.tone)}>{s.value}</p>
                <p className="mt-0.5 text-xs text-ink-500">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Acciones */}
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button onClick={retry} loading={retrying} icon={<RefreshCw className="h-4 w-4" />}>
            Repetir esta modalidad
          </Button>
          {wrongCount > 0 && (
            <Link to="/tests">
              <Button variant="secondary" icon={<TrendingUp className="h-4 w-4" />}>
                Practicar mis fallos
              </Button>
            </Link>
          )}
          <Link to="/" className="ml-auto">
            <Button variant="ghost" icon={<Home className="h-4 w-4" />}>Inicio</Button>
          </Link>
        </div>

        {/* Revisión */}
        {review && review.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-lg font-semibold">Revisión</h2>
              {([
                ['wrong', `Fallos (${wrongCount})`],
                ['flagged', `Marcadas (${flaggedCount})`],
                ['all', `Todas (${review.length})`],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={clsx(
                    'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                    filter === key
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-ink-600 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {rows.length === 0 ? (
              <Card className="p-8 text-center">
                <Check className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                <p className="text-sm text-ink-500">
                  {filter === 'wrong'
                    ? 'No has fallado ninguna. Impecable.'
                    : 'No hay preguntas en este filtro.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-3.5">
                {rows.map((r) => (
                  <Card key={r.question_id} className="p-5">
                    <div className="mb-2.5 flex flex-wrap items-center gap-2">
                      <Badge tone={r.is_correct ? 'success' : 'danger'}>
                        {r.is_correct ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        Pregunta {r.q_order}
                      </Badge>
                      {r.topic_name && <Badge>{r.topic_name}</Badge>}
                      {r.flagged && (
                        <Badge tone="warning"><Flag className="h-3 w-3" /> Marcada</Badge>
                      )}
                    </div>

                    <p className="font-medium leading-snug">{r.q_text}</p>

                    {r.image_url && (
                      <img
                        src={r.image_url}
                        alt=""
                        className="mt-3 max-h-48 rounded-xl object-contain"
                      />
                    )}

                    <div className="mt-3.5 space-y-1.5">
                      {r.options.map((opt, i) => (
                        <div
                          key={i}
                          className={clsx(
                            'flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm',
                            i === r.correct_index && 'bg-emerald-50 dark:bg-emerald-950/40',
                            i === r.selected_index && i !== r.correct_index
                              && 'bg-rose-50 dark:bg-rose-950/40',
                            i !== r.correct_index && i !== r.selected_index && 'text-ink-500',
                          )}
                        >
                          <span className="font-semibold">{String.fromCharCode(65 + i)}.</span>
                          <span className="flex-1">{opt}</span>
                          {i === r.correct_index && (
                            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                          )}
                          {i === r.selected_index && i !== r.correct_index && (
                            <X className="h-4 w-4 shrink-0 text-rose-600" />
                          )}
                        </div>
                      ))}
                      {r.selected_index === null && (
                        <p className="px-3 text-xs italic text-ink-400">
                          No respondiste esta pregunta.
                        </p>
                      )}
                    </div>

                    <div className="mt-3.5 rounded-xl bg-ink-50 p-3.5 dark:bg-ink-950/60">
                      <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-200">
                        {r.explanation}
                      </p>
                      {r.legal_ref && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ink-500">
                          <BookOpen className="h-3.5 w-3.5" />
                          {r.legal_url ? (
                            <a
                              href={r.legal_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="hover:underline"
                            >
                              {r.legal_ref}
                            </a>
                          ) : r.legal_ref}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
