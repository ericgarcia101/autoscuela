import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { BookOpen, Check, Plus, Search, Upload, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Badge, Button, Card, EmptyState, Field, Modal, PageLoader } from '@/components/ui'
import ImportQuestionsModal from '@/components/ImportQuestionsModal'
import type { LicenseClass, Topic } from '@/lib/types'

// `q_text` viene así de la RPC `staff_questions` para no chocar con el tipo
// `text` de Postgres en el `returns table`.
interface Row {
  id: string
  q_text: string
  options: string[]
  correct_index: number
  explanation: string
  legal_ref: string | null
  difficulty: number
  tags: string[]
  licenses: LicenseClass[]
  topic_code: string
  topic_name: string
  source: string
  status: string
  school_id: string | null
  times_answered: number
  success_rate: number | null
  total_count: number
}

const PAGE = 25
const EMPTY = {
  text: '',
  options: ['', '', ''],
  correct_index: 0,
  explanation: '',
  legal_ref: '',
  difficulty: 2,
  topic_id: '',
  licenses: ['B'] as LicenseClass[],
}

export default function QuestionBank() {
  const { school } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')
  const [page, setPage] = useState(0)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<typeof EMPTY & { id?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data: topics } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data } = await supabase.from('topics').select('*').is('parent_id', null).order('position')
      return (data ?? []) as Topic[]
    },
    staleTime: 10 * 60_000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['question-bank', search, topic, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('staff_questions', {
        p_search: search || null,
        p_topic: topic || null,
        p_limit: PAGE,
        p_offset: page * PAGE,
      })
      if (error) throw error
      return (data ?? []) as Row[]
    },
  })

  async function save() {
    if (!editing) return
    setError('')
    setSaving(true)
    try {
      const payload = {
        school_id: school!.id,          // las preguntas creadas aquí son privadas
        topic_id: editing.topic_id,
        text: editing.text.trim(),
        options: editing.options.map((o) => o.trim()).filter(Boolean),
        correct_index: editing.correct_index,
        explanation: editing.explanation.trim(),
        legal_ref: editing.legal_ref.trim() || null,
        difficulty: editing.difficulty,
        licenses: editing.licenses,
        source: 'school' as const,
        status: 'published' as const,
      }

      if (payload.options.length < 2) throw new Error('Hacen falta al menos dos opciones.')
      if (payload.correct_index >= payload.options.length) {
        throw new Error('La opción correcta señalada no existe.')
      }
      if (!payload.topic_id) throw new Error('Elige un bloque del temario.')

      const { error: saveError } = editing.id
        ? await supabase.from('questions').update(payload).eq('id', editing.id)
        : await supabase.from('questions').insert(payload)

      if (saveError) throw saveError

      qc.invalidateQueries({ queryKey: ['question-bank'] })
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido guardar.')
    } finally {
      setSaving(false)
    }
  }

  const total = data?.[0]?.total_count ?? 0
  const totalPages = Math.ceil(Number(total) / PAGE)

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Banco de preguntas</h1>
          <p className="mt-1 text-sm text-ink-500">
            {total} preguntas disponibles para tus alumnos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setImportOpen(true)}
            icon={<Upload className="h-4 w-4" />}
          >
            Importar CSV
          </Button>
          <Button
            onClick={() => { setEditing({ ...EMPTY, topic_id: topics?.[0]?.id ?? '' }); setError('') }}
            icon={<Plus className="h-4 w-4" />}
          >
            Nueva pregunta
          </Button>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-10"
            placeholder="Buscar en el enunciado o el artículo…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <select
          className="input w-auto"
          value={topic}
          onChange={(e) => { setTopic(e.target.value); setPage(0) }}
        >
          <option value="">Todos los bloques</option>
          {topics?.map((t) => (
            <option key={t.code} value={t.code}>{t.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : data?.length ? (
        <>
          <div className="space-y-3">
            {data.map((q) => (
              <Card key={q.id} className="p-5">
                <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone="brand">{q.topic_name}</Badge>
                  <Badge>Dificultad {q.difficulty}</Badge>
                  {q.school_id ? (
                    <Badge tone="success">Propia</Badge>
                  ) : (
                    <Badge>Banco base</Badge>
                  )}
                  {q.success_rate != null && (
                    <Badge tone={q.success_rate >= 70 ? 'neutral' : 'danger'}>
                      {q.success_rate} % de acierto ({q.times_answered})
                    </Badge>
                  )}
                  {q.school_id && (
                    <button
                      onClick={() => {
                        setEditing({
                          id: q.id,
                          text: q.q_text,
                          options: q.options,
                          correct_index: q.correct_index,
                          explanation: q.explanation,
                          legal_ref: q.legal_ref ?? '',
                          difficulty: q.difficulty,
                          topic_id: topics?.find((t) => t.code === q.topic_code)?.id ?? '',
                          licenses: q.licenses,
                        })
                        setError('')
                      }}
                      className="ml-auto text-sm text-brand-600 hover:underline dark:text-brand-400"
                    >
                      Editar
                    </button>
                  )}
                </div>

                <p className="font-medium leading-snug">{q.q_text}</p>

                <ul className="mt-3 space-y-1.5">
                  {q.options.map((o, i) => (
                    <li
                      key={i}
                      className={clsx(
                        'flex items-start gap-2 rounded-lg px-3 py-1.5 text-sm',
                        i === q.correct_index
                          ? 'bg-emerald-50 font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                          : 'text-ink-500',
                      )}
                    >
                      {i === q.correct_index
                        ? <Check className="mt-0.5 h-4 w-4 shrink-0" />
                        : <span className="w-4 shrink-0 text-center">{String.fromCharCode(65 + i)}</span>}
                      {o}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 rounded-xl bg-ink-50 p-3.5 dark:bg-ink-950/60">
                  <p className="text-sm text-ink-600 dark:text-ink-300">{q.explanation}</p>
                  {q.legal_ref && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-500">
                      <BookOpen className="h-3.5 w-3.5" /> {q.legal_ref}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <span className="px-2 text-sm tabular-nums text-ink-500">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="No hay preguntas con ese filtro"
          description="Cambia la búsqueda o añade preguntas propias."
        />
      )}

      {/* Editor */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        wide
        title={editing?.id ? 'Editar pregunta' : 'Nueva pregunta'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Guardar</Button>
          </>
        }
      >
        {editing && (
          <>
            <Field label="Bloque del temario">
              <select
                className="input"
                value={editing.topic_id}
                onChange={(e) => setEditing({ ...editing, topic_id: e.target.value })}
              >
                <option value="">Selecciona un bloque…</option>
                {topics?.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Enunciado">
              <textarea
                className="input min-h-[80px] resize-y"
                value={editing.text}
                onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              />
            </Field>

            <Field label="Opciones" hint="Marca el círculo de la respuesta correcta.">
              <div className="space-y-2">
                {editing.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct"
                      checked={editing.correct_index === i}
                      onChange={() => setEditing({ ...editing, correct_index: i })}
                      className="h-4 w-4 shrink-0 accent-emerald-600"
                      aria-label={`Marcar opción ${i + 1} como correcta`}
                    />
                    <input
                      className="input"
                      value={o}
                      onChange={(e) => {
                        const next = [...editing.options]
                        next[i] = e.target.value
                        setEditing({ ...editing, options: next })
                      }}
                      placeholder={`Opción ${String.fromCharCode(65 + i)}`}
                    />
                    {editing.options.length > 2 && (
                      <button
                        onClick={() =>
                          setEditing({
                            ...editing,
                            options: editing.options.filter((_, j) => j !== i),
                            correct_index: Math.min(
                              editing.correct_index,
                              editing.options.length - 2,
                            ),
                          })
                        }
                        className="shrink-0 rounded-lg p-2 text-ink-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        aria-label="Quitar opción"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {editing.options.length < 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing({ ...editing, options: [...editing.options, ''] })}
                    icon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Añadir opción
                  </Button>
                )}
              </div>
            </Field>

            <Field label="Explicación" hint="Es lo que el alumno lee al corregir. Sé concreto.">
              <textarea
                className="input min-h-[80px] resize-y"
                value={editing.explanation}
                onChange={(e) => setEditing({ ...editing, explanation: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Referencia legal" hint="p. ej. Art. 48 RGC">
                <input
                  className="input"
                  value={editing.legal_ref}
                  onChange={(e) => setEditing({ ...editing, legal_ref: e.target.value })}
                />
              </Field>
              <Field label="Dificultad (1 a 5)">
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="input"
                  value={editing.difficulty}
                  onChange={(e) => setEditing({ ...editing, difficulty: Number(e.target.value) })}
                />
              </Field>
            </div>

            {error && (
              <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                {error}
              </p>
            )}
          </>
        )}
      </Modal>

      <ImportQuestionsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        schoolId={school!.id}
        topics={topics ?? []}
        onDone={() => qc.invalidateQueries({ queryKey: ['question-bank'] })}
      />
    </div>
  )
}
