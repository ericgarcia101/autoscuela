import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  CalendarDays, CalendarPlus, Check, Mail, MailWarning, MapPin, Trash2, User,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { dateTime } from '@/lib/format'
import { Badge, Button, Card, EmptyState, Field, Modal, PageLoader } from '@/components/ui'
import type { Lesson } from '@/lib/types'

interface StudentOption {
  id: string
  full_name: string
  email: string | null
}

interface LessonRow extends Lesson {
  student: { id: string; full_name: string; email: string | null } | null
}

/** Resultado del aviso, para contarle al admin qué ha pasado de verdad. */
type NotifyOutcome =
  | { sent: true; emailed: boolean; reason?: string }
  | { sent: false; error: string }

const DURATIONS = [45, 60, 90, 120]

/** `datetime-local` da hora local sin zona; se convierte a ISO con la del navegador. */
function toIso(local: string) {
  return new Date(local).toISOString()
}

/** Valor por defecto del formulario: mañana a las 10:00. */
function defaultSlot() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    + `T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Practices() {
  const { school } = useAuth()
  const qc = useQueryClient()

  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [startsAt, setStartsAt] = useState(defaultSlot)
  const [duration, setDuration] = useState(60)
  const [pickup, setPickup] = useState('')
  const [note, setNote] = useState('')
  const [outcome, setOutcome] = useState<NotifyOutcome | null>(null)

  const { data: students } = useQuery({
    queryKey: ['practice-students', school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('school_id', school!.id)
        .eq('role', 'student')
        .eq('is_active', true)
        .order('full_name')
      if (error) throw error
      return (data ?? []) as StudentOption[]
    },
  })

  const { data: lessons, isLoading } = useQuery({
    queryKey: ['practices', school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*, student:profiles!lessons_student_id_fkey(id, full_name, email)')
        .eq('school_id', school!.id)
        .order('starts_at', { ascending: true })
        .limit(100)
      if (error) throw error
      return (data ?? []) as LessonRow[]
    },
  })

  const schedule = useMutation({
    mutationFn: async (): Promise<NotifyOutcome> => {
      const { data: lesson, error } = await supabase
        .from('lessons')
        .insert({
          school_id: school!.id,
          student_id: studentId,
          starts_at: toIso(startsAt),
          duration_min: duration,
          pickup_point: pickup.trim() || null,
          student_visible_notes: note.trim() || null,
          status: 'scheduled',
        })
        .select('id')
        .single()
      if (error) throw error

      // El aviso va aparte: si el correo falla, la clase ya está guardada y el
      // alumno la ve igualmente en su agenda.
      const { data: notify, error: notifyError } = await supabase.functions.invoke(
        'notify-lesson',
        { body: { lesson_id: lesson.id } },
      )
      if (notifyError) return { sent: false, error: notifyError.message }
      return { sent: true, emailed: !!notify?.emailed, reason: notify?.reason }
    },
    onSuccess: (result) => {
      setOutcome(result)
      setOpen(false)
      setPickup('')
      setNote('')
      qc.invalidateQueries({ queryKey: ['practices'] })
    },
  })

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lessons')
        .update({ status: 'cancelled' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['practices'] }),
  })

  if (isLoading) return <PageLoader />

  const now = new Date()
  const upcoming = (lessons ?? []).filter(
    (l) => l.status === 'scheduled' && new Date(l.starts_at) >= now,
  )
  const past = (lessons ?? []).filter(
    (l) => l.status !== 'scheduled' || new Date(l.starts_at) < now,
  )

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clases prácticas</h1>
          <p className="mt-1 text-sm text-ink-500">
            Programa una clase de conducción y avisa al alumno por correo.
          </p>
        </div>
        <Button
          onClick={() => { setOutcome(null); setOpen(true) }}
          icon={<CalendarPlus className="h-4 w-4" />}
        >
          Programar clase
        </Button>
      </header>

      {/* Resultado del último aviso */}
      {outcome && (
        <Card
          className={clsx(
            'flex items-start gap-3 p-4',
            outcome.sent && outcome.emailed
              ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
              : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
          )}
        >
          {outcome.sent && outcome.emailed ? (
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          )}
          <div className="min-w-0 flex-1 text-sm">
            {outcome.sent && outcome.emailed && (
              <p className="text-emerald-900 dark:text-emerald-100">
                Clase programada y correo enviado al alumno.
              </p>
            )}
            {outcome.sent && !outcome.emailed && (
              <p className="text-amber-900 dark:text-amber-100">
                Clase programada. El alumno la ve en su agenda y en su panel de inicio,
                pero <strong>no se ha enviado el correo</strong>:{' '}
                {outcome.reason === 'sin_proveedor'
                  ? 'todavía no hay proveedor de email configurado.'
                  : outcome.reason === 'alumno_sin_correo'
                    ? 'el alumno no tiene dirección de correo en su ficha.'
                    : outcome.reason}
              </p>
            )}
            {!outcome.sent && (
              <p className="text-amber-900 dark:text-amber-100">
                Clase programada, pero el aviso falló: {outcome.error}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Próximas */}
      <section>
        <h2 className="mb-3 font-semibold">Próximas clases</h2>
        {upcoming.length ? (
          <Card className="divide-y divide-ink-200 dark:divide-ink-800">
            {upcoming.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{dateTime(l.starts_at)}</p>
                  <p className="flex flex-wrap items-center gap-x-2.5 text-sm text-ink-500">
                    <Link
                      to={`/alumnos/${l.student?.id}`}
                      className="inline-flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400"
                    >
                      <User className="h-3.5 w-3.5" />
                      {l.student?.full_name || 'Alumno'}
                    </Link>
                    <span>· {l.duration_min} min</span>
                    {l.pickup_point && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {l.pickup_point}
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancel.mutate(l.id)}
                  icon={<Trash2 className="h-4 w-4" />}
                >
                  Cancelar
                </Button>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon={<CalendarDays className="h-8 w-8" />}
            title="Sin clases programadas"
            description="Programa la primera clase práctica y el alumno recibirá el aviso."
            action={
              <Button onClick={() => { setOutcome(null); setOpen(true) }}>
                Programar clase
              </Button>
            }
          />
        )}
      </section>

      {/* Historial */}
      {!!past.length && (
        <section>
          <h2 className="mb-3 font-semibold">Anteriores</h2>
          <Card className="divide-y divide-ink-200 dark:divide-ink-800">
            {past.slice(0, 20).map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{dateTime(l.starts_at)}</p>
                  <p className="truncate text-xs text-ink-500">
                    {l.student?.full_name || 'Alumno'} · {l.duration_min} min
                  </p>
                </div>
                <Badge
                  tone={
                    l.status === 'completed' ? 'success'
                      : l.status === 'no_show' ? 'danger'
                        : l.status === 'cancelled' ? 'neutral' : 'brand'
                  }
                >
                  {l.status === 'completed' ? 'Hecha'
                    : l.status === 'no_show' ? 'No vino'
                      : l.status === 'cancelled' ? 'Cancelada' : 'Programada'}
                </Badge>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Alta */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Programar clase práctica"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => schedule.mutate()}
              loading={schedule.isPending}
              disabled={!studentId || !startsAt}
              icon={<Mail className="h-4 w-4" />}
            >
              Programar y avisar
            </Button>
          </>
        }
      >
        <Field label="Alumno">
          <select
            className="input"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="">Elige un alumno…</option>
            {(students ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name || s.email || 'Alumno'}
                {!s.email ? ' (sin correo)' : ''}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Día y hora">
          <input
            type="datetime-local"
            className="input"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </Field>

        <Field label="Duración">
          <select
            className="input"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>{d} minutos</option>
            ))}
          </select>
        </Field>

        <Field label="Punto de recogida" hint="Opcional. Aparece en el correo y en su agenda.">
          <input
            className="input"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="Puerta de la autoescuela"
          />
        </Field>

        <Field label="Nota para el alumno" hint="Opcional. La lee el alumno, no es una nota interna.">
          <textarea
            className="input min-h-[90px] resize-y"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Trae el permiso provisional y ropa cómoda."
          />
        </Field>

        {schedule.isError && (
          <p className="text-sm text-rose-600">
            No se ha podido programar: {(schedule.error as Error).message}
          </p>
        )}
      </Modal>
    </div>
  )
}
