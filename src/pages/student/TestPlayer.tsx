import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Check, Flag, Loader2, Timer, X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { clock } from '@/lib/format'
import { Button, Card, PageLoader, ProgressBar } from '@/components/ui'
import type { AnswerFeedback, TestSession } from '@/lib/types'

// Los nombres vienen de la RPC `get_session_questions`, que prefija con `q_`
// las columnas cuyo nombre chocaría con un tipo de Postgres.
interface PlayableQuestion {
  id: string
  q_order: number
  q_text: string
  options: string[]
  image_url: string | null
  image_alt: string | null
  difficulty: number
  topic_name: string | null
  topic_color: string | null
}

interface LocalAnswer {
  /** Índice en las opciones ORIGINALES, que es lo que espera el servidor. */
  selected: number | null
  feedback: AnswerFeedback | null
  flagged: boolean
}

/** Baraja determinista a partir de una semilla, para que el orden no cambie
 *  al volver atrás dentro del mismo test. */
function seededOrder(length: number, seed: string): number[] {
  const idx = Array.from({ length }, (_, i) => i)
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  for (let i = idx.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0
    const j = h % (i + 1)
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

export default function TestPlayer() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<TestSession | null>(null)
  const [questions, setQuestions] = useState<PlayableQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({})
  const [current, setCurrent] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [showGrid, setShowGrid] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [loadError, setLoadError] = useState('')

  const questionStartedAt = useRef<number>(Date.now())
  const finished = useRef(false)

  // --- Carga -------------------------------------------------------------
  useEffect(() => {
    if (!sessionId) return
    let cancelled = false

    ;(async () => {
      try {
        const { data: s, error: sErr } = await supabase
          .from('test_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()
        if (sErr) throw sErr
        if (cancelled) return

        const sess = s as TestSession
        if (sess.status !== 'in_progress') {
          navigate(`/resultado/${sessionId}`, { replace: true })
          return
        }
        setSession(sess)

        const { data: qs, error: qErr } = await supabase.rpc('get_session_questions', {
          p_session: sessionId,
        })
        if (qErr) throw qErr
        if (cancelled) return
        setQuestions((qs ?? []) as PlayableQuestion[])

        if (sess.time_limit_sec) {
          const elapsed = Math.floor((Date.now() - new Date(sess.started_at).getTime()) / 1000)
          setRemaining(Math.max(0, sess.time_limit_sec - elapsed))
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'No se ha podido abrir el test.')
        }
      }
    })()

    return () => { cancelled = true }
  }, [sessionId, navigate])

  const question = questions[current]
  const config = session?.config ?? {}
  const instant = !!config.instant_feedback
  const suddenDeath = !!config.sudden_death

  // Mapa opciones mostradas -> índices originales
  const displayOrder = useMemo(() => {
    if (!question) return []
    if (!config.shuffle_options) return question.options.map((_, i) => i)
    return seededOrder(question.options.length, `${sessionId}:${question.id}`)
  }, [question, config.shuffle_options, sessionId])

  const answered = Object.values(answers).filter((a) => a.selected !== null).length
  const wrong = Object.values(answers).filter((a) => a.feedback?.is_correct === false).length

  // --- Finalizar ---------------------------------------------------------
  const finish = useCallback(async () => {
    if (finished.current || !sessionId) return
    finished.current = true
    setFinishing(true)
    try {
      await supabase.rpc('finish_test_session', { p_session: sessionId })
    } catch {
      // Si la llamada falla, la pantalla de resultado vuelve a intentarlo.
    }
    navigate(`/resultado/${sessionId}`, { replace: true })
  }, [sessionId, navigate])

  // --- Temporizador ------------------------------------------------------
  useEffect(() => {
    if (remaining === null) return
    if (remaining <= 0) { void finish(); return }
    const id = setInterval(() => setRemaining((r) => (r === null ? null : r - 1)), 1000)
    return () => clearInterval(id)
  }, [remaining, finish])

  // --- Responder ---------------------------------------------------------
  const answer = useCallback(async (originalIndex: number) => {
    if (!question || !sessionId || submitting) return
    const existing = answers[question.id]
    if (existing?.feedback && instant) return // ya corregida

    setSubmitting(true)
    const spent = Date.now() - questionStartedAt.current

    setAnswers((prev) => ({
      ...prev,
      [question.id]: {
        selected: originalIndex,
        feedback: prev[question.id]?.feedback ?? null,
        flagged: prev[question.id]?.flagged ?? false,
      },
    }))

    try {
      const { data, error } = await supabase.rpc('submit_answer', {
        p_session: sessionId,
        p_question: question.id,
        p_selected: originalIndex,
        p_time_spent_ms: spent,
        p_flagged: existing?.flagged ?? false,
      })
      if (error) throw error

      const feedback = data as AnswerFeedback

      setAnswers((prev) => ({
        ...prev,
        [question.id]: { ...prev[question.id], selected: originalIndex, feedback },
      }))

      if (suddenDeath && !feedback.is_correct) {
        setTimeout(() => void finish(), 1600)
        return
      }

      // Sin corrección al momento, el test avanza solo. En la última pregunta se
      // queda quieto: cerrar el test es siempre una decisión explícita del alumno.
      if (!instant) {
        setTimeout(() => {
          setCurrent((c) => {
            if (c + 1 >= questions.length) return c
            questionStartedAt.current = Date.now()
            return c + 1
          })
        }, 180)
      }
    } catch (err) {
      console.error(err)
      setAnswers((prev) => ({ ...prev, [question.id]: { ...prev[question.id], selected: null } }))
    } finally {
      setSubmitting(false)
    }
  }, [question, sessionId, submitting, answers, instant, suddenDeath, questions.length, finish])

  function go(delta: number) {
    setCurrent((c) => {
      const next = Math.min(questions.length - 1, Math.max(0, c + delta))
      if (next !== c) questionStartedAt.current = Date.now()
      return next
    })
  }

  async function toggleFlag() {
    if (!question || !sessionId) return
    const next = !answers[question.id]?.flagged
    setAnswers((prev) => ({
      ...prev,
      [question.id]: {
        selected: prev[question.id]?.selected ?? null,
        feedback: prev[question.id]?.feedback ?? null,
        flagged: next,
      },
    }))
    const selected = answers[question.id]?.selected
    if (selected !== null && selected !== undefined) {
      await supabase.rpc('submit_answer', {
        p_session: sessionId,
        p_question: question.id,
        p_selected: selected,
        p_flagged: next,
      })
    }
  }

  // --- Atajos de teclado -------------------------------------------------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!question) return
      const n = Number(e.key)
      if (n >= 1 && n <= displayOrder.length) {
        void answer(displayOrder[n - 1])
      } else if (e.key === 'ArrowRight') {
        go(1)
      } else if (e.key === 'ArrowLeft') {
        go(-1)
      } else if (e.key.toLowerCase() === 'f') {
        void toggleFlag()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (loadError) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <Card className="max-w-md p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
          <p className="text-sm text-ink-600 dark:text-ink-300">{loadError}</p>
          <Button className="mt-5" onClick={() => navigate('/tests')}>Volver a los tests</Button>
        </Card>
      </div>
    )
  }

  if (!session || questions.length === 0) return <PageLoader label="Preparando tu test…" />
  if (finishing) return <PageLoader label="Corrigiendo…" />

  const local = answers[question.id]
  const feedback = local?.feedback
  const showCorrection = instant && !!feedback
  const timeLow = remaining !== null && remaining <= 60

  return (
    <div className="flex min-h-full flex-col bg-ink-50 dark:bg-ink-950">
      {/* Cabecera */}
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/90 backdrop-blur dark:border-ink-800 dark:bg-ink-900/90">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmFinish(true)}
            icon={<X className="h-4 w-4" />}
            aria-label="Salir del test"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{session.title}</p>
            <p className="text-xs text-ink-500">
              Pregunta {current + 1} de {questions.length}
              {session.max_failures !== null && (
                <span className={clsx('ml-2', wrong > 0 && 'text-rose-600 dark:text-rose-400')}>
                  · {wrong}/{session.max_failures} fallos
                </span>
              )}
            </p>
          </div>

          {remaining !== null && (
            <div
              className={clsx(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums',
                timeLow
                  ? 'animate-pulse bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200',
              )}
            >
              <Timer className="h-4 w-4" />
              {clock(remaining)}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGrid((v) => !v)}
            className="tabular-nums"
          >
            {answered}/{questions.length}
          </Button>
        </div>
        <ProgressBar
          value={(answered / questions.length) * 100}
          className="h-1 rounded-none"
        />
      </header>

      {/* Cuadrícula de navegación */}
      {showGrid && (
        <div className="border-b border-ink-200 bg-white px-4 py-4 dark:border-ink-800 dark:bg-ink-900">
          <div className="mx-auto grid max-w-3xl grid-cols-8 gap-2 sm:grid-cols-10">
            {questions.map((q, i) => {
              const a = answers[q.id]
              return (
                <button
                  key={q.id}
                  onClick={() => { setCurrent(i); setShowGrid(false); questionStartedAt.current = Date.now() }}
                  className={clsx(
                    'relative aspect-square rounded-lg text-xs font-semibold transition-colors',
                    i === current && 'ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-ink-900',
                    a?.feedback?.is_correct === true && 'bg-emerald-500 text-white',
                    a?.feedback?.is_correct === false && 'bg-rose-500 text-white',
                    a?.selected !== null && a?.selected !== undefined && !a?.feedback
                      && 'bg-brand-500 text-white',
                    !a?.selected && a?.selected !== 0
                      && 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
                  )}
                >
                  {i + 1}
                  {a?.flagged && (
                    <Flag className="absolute -right-0.5 -top-0.5 h-3 w-3 fill-amber-400 text-amber-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Pregunta */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Card className="overflow-hidden">
          {question.image_url && (
            <img
              src={question.image_url}
              alt={question.image_alt ?? 'Imagen de la pregunta'}
              className="max-h-72 w-full bg-ink-100 object-contain dark:bg-ink-950"
            />
          )}

          <div className="p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              {question.topic_name && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${question.topic_color ?? '#64748b'}1a`,
                    color: question.topic_color ?? '#64748b',
                  }}
                >
                  {question.topic_name}
                </span>
              )}
              <button
                onClick={toggleFlag}
                className={clsx(
                  'ml-auto rounded-lg p-1.5 transition-colors',
                  local?.flagged
                    ? 'text-amber-500'
                    : 'text-ink-300 hover:text-ink-500 dark:text-ink-600',
                )}
                aria-label="Marcar para repasar"
                title="Marcar para repasar (F)"
              >
                <Flag className={clsx('h-4.5 w-4.5', local?.flagged && 'fill-amber-400')} />
              </button>
            </div>

            <h2 className="text-lg font-semibold leading-snug">{question.q_text}</h2>

            <div className="mt-5 space-y-2.5">
              {displayOrder.map((originalIdx, displayIdx) => {
                const isSelected = local?.selected === originalIdx
                const isCorrect = feedback?.correct_index === originalIdx
                const showRight = showCorrection && isCorrect
                const showWrong = showCorrection && isSelected && !isCorrect

                return (
                  <button
                    key={originalIdx}
                    onClick={() => answer(originalIdx)}
                    disabled={submitting || showCorrection}
                    className={clsx(
                      'flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all',
                      'disabled:cursor-default',
                      showRight && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
                      showWrong && 'border-rose-500 bg-rose-50 dark:bg-rose-950/40',
                      !showRight && !showWrong && isSelected
                        && 'border-brand-500 bg-brand-50 dark:bg-brand-950/40',
                      !showRight && !showWrong && !isSelected
                        && 'border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/50 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-brand-700 dark:hover:bg-ink-800',
                    )}
                  >
                    <span
                      className={clsx(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                        showRight && 'bg-emerald-500 text-white',
                        showWrong && 'bg-rose-500 text-white',
                        !showRight && !showWrong && isSelected && 'bg-brand-500 text-white',
                        !showRight && !showWrong && !isSelected
                          && 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
                      )}
                    >
                      {showRight ? <Check className="h-3.5 w-3.5" />
                        : showWrong ? <X className="h-3.5 w-3.5" />
                          : String.fromCharCode(65 + displayIdx)}
                    </span>
                    <span className="flex-1 text-sm leading-relaxed">
                      {question.options[originalIdx]}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Explicación */}
            {showCorrection && feedback && (
              <div
                className={clsx(
                  'mt-5 rounded-xl border p-4 animate-fade-in',
                  feedback.is_correct
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40'
                    : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40',
                )}
              >
                <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                  {feedback.is_correct ? (
                    <><Check className="h-4 w-4 text-emerald-600" /> Correcto</>
                  ) : (
                    <><X className="h-4 w-4 text-rose-600" /> Incorrecto</>
                  )}
                </p>
                <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-200">
                  {feedback.explanation}
                </p>
                {feedback.legal_ref && (
                  <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-ink-500">
                    <BookOpen className="h-3.5 w-3.5" />
                    {feedback.legal_ref}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Navegación */}
        <div className="mt-5 flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => go(-1)}
            disabled={current === 0}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Anterior
          </Button>

          <div className="flex-1" />

          {current < questions.length - 1 ? (
            <Button onClick={() => go(1)} icon={<ArrowRight className="h-4 w-4" />}>
              Siguiente
            </Button>
          ) : (
            <Button variant="success" onClick={() => setConfirmFinish(true)}>
              Terminar test
            </Button>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-ink-400">
          Atajos: <kbd className="rounded bg-ink-200 px-1 dark:bg-ink-800">1-4</kbd> responder ·{' '}
          <kbd className="rounded bg-ink-200 px-1 dark:bg-ink-800">←→</kbd> navegar ·{' '}
          <kbd className="rounded bg-ink-200 px-1 dark:bg-ink-800">F</kbd> marcar
        </p>
      </main>

      {/* Confirmación de salida */}
      {confirmFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold">¿Terminar el test?</h3>
            <p className="mt-2 text-sm text-ink-500">
              Has respondido {answered} de {questions.length} preguntas.
              {answered < questions.length && ' Las que dejes en blanco contarán como falladas.'}
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button
                variant="secondary"
                onClick={() => setConfirmFinish(false)}
                className="flex-1"
              >
                Seguir
              </Button>
              <Button variant="success" onClick={finish} className="flex-1">
                Terminar y corregir
              </Button>
            </div>
          </Card>
        </div>
      )}

      {submitting && !instant && (
        <div className="pointer-events-none fixed bottom-6 right-6 rounded-full bg-ink-900 p-2.5 text-white shadow-lg dark:bg-white dark:text-ink-900">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  )
}
