import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  ArrowLeft, ClipboardList, CreditCard, GraduationCap, MessageSquare,
  Save, StickyNote, TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { dateTime, euros, pct, relative, shortDate, STATUS_LABEL } from '@/lib/format'
import { Badge, Button, Card, Field, Modal, PageLoader, ProgressBar, StatTile } from '@/components/ui'
import AssignTestModal from '@/components/AssignTestModal'
import type {
  Assignment, Exam, Lesson, Payment, Profile, Readiness, StudentStatus,
  TestSession, TopicBreakdown,
} from '@/lib/types'

const STATUSES: StudentStatus[] = [
  'lead', 'enrolled', 'theory_pass', 'practical', 'graduated', 'paused', 'dropped',
]

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>()
  const { school } = useAuth()
  const qc = useQueryClient()

  const [assignOpen, setAssignOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<StudentStatus>('enrolled')
  const [examDate, setExamDate] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['student-detail', id],
    enabled: !!id,
    queryFn: async () => {
      const studentId = id!
      const [profile, readiness, breakdown, sessions, assignments, lessons, payments, exams] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', studentId).single(),
          supabase.rpc('student_readiness', { p_student: studentId }),
          supabase.rpc('student_topic_breakdown', { p_student: studentId }),
          supabase.from('test_sessions').select('*')
            .eq('student_id', studentId).eq('status', 'completed')
            .order('finished_at', { ascending: false }).limit(10),
          supabase.from('assignments').select('*')
            .eq('student_id', studentId).order('created_at', { ascending: false }).limit(10),
          supabase.from('lessons').select('*')
            .eq('student_id', studentId).order('starts_at', { ascending: false }).limit(10),
          supabase.from('payments').select('*')
            .eq('student_id', studentId).order('created_at', { ascending: false }),
          supabase.from('exams').select('*')
            .eq('student_id', studentId).order('scheduled_at', { ascending: false }),
        ])

      const p = profile.data as unknown as Profile
      setNotes(p?.notes ?? '')
      setStatus(p?.status ?? 'enrolled')
      setExamDate(p?.theory_exam_date ?? '')

      return {
        profile: p,
        readiness: readiness.data as Readiness | null,
        breakdown: (breakdown.data ?? []) as TopicBreakdown[],
        sessions: (sessions.data ?? []) as TestSession[],
        assignments: (assignments.data ?? []) as Assignment[],
        lessons: (lessons.data ?? []) as Lesson[],
        payments: (payments.data ?? []) as Payment[],
        exams: (exams.data ?? []) as Exam[],
      }
    },
  })

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          notes,
          status,
          theory_exam_date: examDate || null,
        })
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-detail', id] })
      setEditOpen(false)
    },
  })

  if (isLoading || !data?.profile) return <PageLoader />

  const p = data.profile
  const worked = data.breakdown.filter((b) => b.answered > 0)
  const owed = data.payments
    .filter((x) => x.status === 'pending' || x.status === 'overdue')
    .reduce((s, x) => s + x.amount_cents, 0)

  return (
    <div className="space-y-7">
      <div>
        <Link
          to="/alumnos"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 dark:hover:text-ink-200"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a alumnos
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{p.full_name || 'Sin nombre'}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-500">
              {p.email}
              {p.phone && <>· {p.phone}</>}
              <Badge>{STATUS_LABEL[p.status]}</Badge>
              <Badge tone="brand">Permiso {p.target_license}</Badge>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setAssignOpen(true)}
              icon={<ClipboardList className="h-4 w-4" />}
            >
              Asignar test
            </Button>
            <Link to="/mensajes">
              <Button variant="secondary" icon={<MessageSquare className="h-4 w-4" />}>
                Escribir
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => setEditOpen(true)}
              icon={<StickyNote className="h-4 w-4" />}
            >
              Editar ficha
            </Button>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Preparación"
          value={`${data.readiness?.readiness?.toFixed(0) ?? 0}/100`}
          hint={data.readiness?.verdict === 'listo' ? 'Puede examinarse' : 'Sigue practicando'}
          icon={<TrendingUp className="h-5 w-5" />}
          tone={(data.readiness?.readiness ?? 0) >= 85 ? 'success' : 'brand'}
        />
        <StatTile
          label="Media reciente"
          value={pct(data.readiness?.recent_average, 1)}
          hint={`${data.readiness?.sessions ?? 0} tests contabilizados`}
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatTile
          label="Cobertura del temario"
          value={pct(data.readiness?.coverage, 1)}
          hint="Del banco de preguntas"
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatTile
          label="Pendiente de pago"
          value={euros(owed)}
          hint={`${data.payments.length} recibos`}
          icon={<CreditCard className="h-5 w-5" />}
          tone={owed > 0 ? 'warning' : 'success'}
        />
      </div>

      {p.notes && (
        <Card className="border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            <StickyNote className="h-3.5 w-3.5" /> Nota interna
          </p>
          <p className="whitespace-pre-wrap text-sm text-amber-900 dark:text-amber-100">{p.notes}</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Nivel por bloque */}
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Nivel por bloque del temario</h2>
          {worked.length ? (
            <div className="space-y-3.5">
              {worked.sort((a, b) => a.accuracy - b.accuracy).map((b) => (
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
            <p className="py-8 text-center text-sm text-ink-500">
              El alumno todavía no ha respondido preguntas.
            </p>
          )}
        </Card>

        {/* Tareas asignadas */}
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Tareas asignadas</h2>
          {data.assignments.length ? (
            <div className="space-y-2.5">
              {data.assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-ink-200 px-4 py-3 dark:border-ink-700"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-ink-500">
                      {a.due_at ? `Entrega ${shortDate(a.due_at)}` : 'Sin fecha límite'}
                      {a.best_score != null && ` · Mejor nota: ${a.best_score} %`}
                    </p>
                  </div>
                  <Badge
                    tone={
                      a.status === 'completed' ? 'success'
                        : a.status === 'overdue' ? 'danger'
                          : a.status === 'in_progress' ? 'brand' : 'neutral'
                    }
                  >
                    {a.status === 'completed' ? 'Hecha'
                      : a.status === 'overdue' ? 'Fuera de plazo'
                        : a.status === 'in_progress' ? 'En curso' : 'Pendiente'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-ink-500">Sin tareas asignadas.</p>
              <Button size="sm" className="mt-3" onClick={() => setAssignOpen(true)}>
                Asignar la primera
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Últimos tests */}
      <section>
        <h2 className="mb-3 font-semibold">Últimos tests</h2>
        {data.sessions.length ? (
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
                    {s.correct}/{s.total_questions} · {relative(s.finished_at)}
                  </p>
                </div>
              </Link>
            ))}
          </Card>
        ) : (
          <Card className="p-8 text-center text-sm text-ink-500">Sin tests completados.</Card>
        )}
      </section>

      {/* Clases y exámenes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">Clases prácticas</h2>
          {data.lessons.length ? (
            <Card className="divide-y divide-ink-200 dark:divide-ink-800">
              {data.lessons.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{dateTime(l.starts_at)}</p>
                    {l.instructor_notes && (
                      <p className="truncate text-xs text-ink-500">{l.instructor_notes}</p>
                    )}
                  </div>
                  <Badge tone={l.status === 'completed' ? 'success' : l.status === 'no_show' ? 'danger' : 'brand'}>
                    {l.status === 'completed' ? 'Hecha'
                      : l.status === 'no_show' ? 'No vino'
                        : l.status === 'cancelled' ? 'Cancelada' : 'Programada'}
                  </Badge>
                </div>
              ))}
            </Card>
          ) : (
            <Card className="p-8 text-center text-sm text-ink-500">Sin clases registradas.</Card>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Exámenes</h2>
          {data.exams.length ? (
            <Card className="divide-y divide-ink-200 dark:divide-ink-800">
              {data.exams.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {e.kind === 'theory' ? 'Teórico' : e.kind === 'practical' ? 'Circulación' : 'Maniobras'}
                    </p>
                    <p className="text-xs text-ink-500">{dateTime(e.scheduled_at)}</p>
                  </div>
                  <Badge
                    tone={e.result === 'passed' ? 'success' : e.result === 'failed' ? 'danger' : 'brand'}
                  >
                    {e.result === 'passed' ? 'Apto' : e.result === 'failed' ? 'No apto' : 'Convocado'}
                  </Badge>
                </div>
              ))}
            </Card>
          ) : (
            <Card className="p-8 text-center text-sm text-ink-500">Sin convocatorias.</Card>
          )}
        </section>
      </div>

      {/* Modales */}
      <AssignTestModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        studentIds={[p.id]}
        studentName={p.full_name}
        schoolId={school!.id}
        onDone={() => qc.invalidateQueries({ queryKey: ['student-detail', id] })}
      />

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar ficha del alumno"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => saveProfile.mutate()}
              loading={saveProfile.isPending}
              icon={<Save className="h-4 w-4" />}
            >
              Guardar
            </Button>
          </>
        }
      >
        <Field label="Estado del alumno">
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as StudentStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </Field>

        <Field label="Fecha prevista del examen teórico" hint="Opcional. El alumno la verá en su agenda.">
          <input
            type="date"
            className="input"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </Field>

        <Field label="Nota interna" hint="Sólo la ve el equipo de la autoescuela, nunca el alumno.">
          <textarea
            className="input min-h-[110px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones, incidencias, acuerdos de pago…"
          />
        </Field>

        {saveProfile.isError && (
          <p className="text-sm text-rose-600">
            No se ha podido guardar: {(saveProfile.error as Error).message}
          </p>
        )}
      </Modal>
    </div>
  )
}
