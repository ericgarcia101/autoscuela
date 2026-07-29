import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Send, Sliders } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { CATEGORY_LABEL } from '@/lib/format'
import { Badge, Button, Field, Modal } from '@/components/ui'
import type { TestTemplate, Topic } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  studentIds: string[]
  studentName?: string
  schoolId: string
  onDone?: () => void
}

const STRATEGIES: { value: string; label: string; help: string }[] = [
  { value: 'random', label: 'Aleatorio', help: 'Preguntas al azar del temario elegido.' },
  { value: 'failed', label: 'Sus fallos', help: 'Sólo lo que el alumno ha fallado antes.' },
  { value: 'weakest', label: 'Sus puntos débiles', help: 'Prioriza los bloques con peor acierto.' },
  { value: 'unseen', label: 'Preguntas nuevas', help: 'Las que aún no le han salido nunca.' },
  { value: 'hardest', label: 'Las más difíciles', help: 'Menor tasa de acierto entre todos los alumnos.' },
  { value: 'srs', label: 'Repaso espaciado', help: 'Las que le tocan repasar hoy.' },
  { value: 'exam', label: 'Formato examen', help: 'Distribución equivalente a la del examen oficial.' },
]

/**
 * Asignador de tests personalizados. El profesor combina una plantilla base
 * con reglas propias (temas, dificultad, estrategia) y lo envía a uno o varios
 * alumnos. Las reglas se guardan como snapshot en la asignación.
 */
export default function AssignTestModal({
  open, onClose, studentIds, studentName, schoolId, onDone,
}: Props) {
  const { profile } = useAuth()

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [templateCode, setTemplateCode] = useState('random_30')
  const [strategy, setStrategy] = useState('random')
  const [topics, setTopics] = useState<string[]>([])
  const [count, setCount] = useState(30)
  const [difficulty, setDifficulty] = useState<[number, number]>([1, 5])
  const [dueAt, setDueAt] = useState('')
  const [attempts, setAttempts] = useState(1)
  const [advanced, setAdvanced] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data } = useQuery({
    queryKey: ['assign-options'],
    enabled: open,
    queryFn: async () => {
      const [templates, topicList] = await Promise.all([
        supabase.from('test_templates').select('*').eq('is_active', true).order('position'),
        supabase.from('topics').select('*').is('parent_id', null).order('position'),
      ])
      return {
        templates: (templates.data ?? []) as TestTemplate[],
        topics: (topicList.data ?? []) as Topic[],
      }
    },
  })

  const grouped = useMemo(() => {
    const map = new Map<string, TestTemplate[]>()
    for (const t of data?.templates ?? []) {
      const list = map.get(t.category) ?? []
      list.push(t)
      map.set(t.category, list)
    }
    return [...map.entries()]
  }, [data?.templates])

  const selectedTemplate = data?.templates.find((t) => t.code === templateCode)

  async function submit() {
    setError('')
    setSaving(true)
    try {
      const rules: Record<string, unknown> = { strategy }
      if (topics.length) rules.topics = topics
      if (difficulty[0] !== 1 || difficulty[1] !== 5) rules.difficulty = difficulty

      const rows = studentIds.map((studentId) => ({
        school_id: schoolId,
        student_id: studentId,
        template_id: selectedTemplate?.id ?? null,
        assigned_by: profile!.id,
        title: title.trim() || selectedTemplate?.name || 'Test asignado',
        message: message.trim() || null,
        rules,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        attempts_allowed: attempts,
        status: 'pending' as const,
      }))

      const { error: insertError } = await supabase.from('assignments').insert(rows)
      if (insertError) throw insertError

      // Aviso en la campana del alumno
      await supabase.from('notifications').insert(
        studentIds.map((studentId) => ({
          school_id: schoolId,
          user_id: studentId,
          kind: 'assignment',
          title: 'Nueva tarea de tu profesor',
          body: title.trim() || selectedTemplate?.name || 'Tienes un test pendiente',
          link: '/',
        })),
      )

      onDone?.()
      onClose()
      // Deja el formulario listo para la siguiente asignación
      setTitle(''); setMessage(''); setDueAt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido asignar el test.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={
        studentIds.length === 1
          ? `Asignar test a ${studentName ?? 'el alumno'}`
          : `Asignar test a ${studentIds.length} alumnos`
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} loading={saving} icon={<Send className="h-4 w-4" />}>
            Asignar
          </Button>
        </>
      }
    >
      <Field label="Modalidad de test">
        <select
          className="input"
          value={templateCode}
          onChange={(e) => {
            setTemplateCode(e.target.value)
            const t = data?.templates.find((x) => x.code === e.target.value)
            if (t) {
              setCount(t.question_count)
              setStrategy((t.rules as { strategy?: string })?.strategy ?? 'random')
            }
          }}
        >
          {grouped.map(([cat, list]) => (
            <optgroup key={cat} label={CATEGORY_LABEL[cat] ?? cat}>
              {list.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name} ({t.question_count} preguntas)
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {selectedTemplate?.description && (
          <p className="mt-1.5 text-xs text-ink-500">{selectedTemplate.description}</p>
        )}
      </Field>

      <Field label="Título que verá el alumno" hint="Si lo dejas vacío se usa el nombre de la modalidad.">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={selectedTemplate?.name ?? 'Test asignado'}
        />
      </Field>

      <Field label="Mensaje para el alumno" hint="Opcional. Aparece bajo la tarea en su inicio.">
        <textarea
          className="input min-h-[80px] resize-y"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Repasa especialmente las señales de prioridad antes de hacerlo."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha límite">
          <input
            type="datetime-local"
            className="input"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </Field>
        <Field label="Intentos permitidos">
          <input
            type="number"
            min={1}
            max={10}
            className="input"
            value={attempts}
            onChange={(e) => setAttempts(Number(e.target.value))}
          />
        </Field>
      </div>

      <button
        onClick={() => setAdvanced((v) => !v)}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
      >
        <Sliders className="h-4 w-4" />
        {advanced ? 'Ocultar' : 'Personalizar'} el contenido del test
      </button>

      {advanced && (
        <div className="mb-4 space-y-4 rounded-xl border border-ink-200 p-4 dark:border-ink-700">
          <Field label="Cómo elegir las preguntas">
            <div className="grid gap-2 sm:grid-cols-2">
              {STRATEGIES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStrategy(s.value)}
                  className={clsx(
                    'rounded-xl border-2 px-3.5 py-2.5 text-left transition-colors',
                    strategy === s.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                      : 'border-ink-200 hover:border-brand-300 dark:border-ink-700',
                  )}
                >
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{s.help}</p>
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="Limitar a estos bloques del temario"
            hint="Si no seleccionas ninguno, entra todo el temario."
          >
            <div className="flex flex-wrap gap-1.5">
              {data?.topics.map((t) => {
                const on = topics.includes(t.code)
                return (
                  <button
                    key={t.code}
                    onClick={() =>
                      setTopics((prev) =>
                        on ? prev.filter((c) => c !== t.code) : [...prev, t.code],
                      )
                    }
                    className={clsx(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                      on
                        ? 'bg-brand-600 text-white'
                        : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700',
                    )}
                  >
                    {t.name}
                  </button>
                )
              })}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Número de preguntas: ${count}`}>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </Field>
            <Field label={`Dificultad: ${difficulty[0]} a ${difficulty[1]}`}>
              <div className="flex items-center gap-2">
                <select
                  className="input"
                  value={difficulty[0]}
                  onChange={(e) =>
                    setDifficulty([Number(e.target.value), Math.max(Number(e.target.value), difficulty[1])])
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="text-ink-400">–</span>
                <select
                  className="input"
                  value={difficulty[1]}
                  onChange={(e) =>
                    setDifficulty([Math.min(difficulty[0], Number(e.target.value)), Number(e.target.value)])
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </Field>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge tone="brand">{count} preguntas</Badge>
            <Badge>{STRATEGIES.find((s) => s.value === strategy)?.label}</Badge>
            {topics.length > 0 && <Badge>{topics.length} bloques</Badge>}
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </p>
      )}
    </Modal>
  )
}
