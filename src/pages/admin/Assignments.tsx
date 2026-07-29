import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { ClipboardList, Plus, Search, Trash2, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { relative, shortDate } from '@/lib/format'
import { Badge, Button, Card, EmptyState, PageLoader } from '@/components/ui'
import AssignTestModal from '@/components/AssignTestModal'
import type { AssignmentStatus, StudentOverview } from '@/lib/types'

interface Row {
  id: string
  title: string
  message: string | null
  due_at: string | null
  status: AssignmentStatus
  attempts_used: number
  attempts_allowed: number
  best_score: number | null
  created_at: string
  student: { id: string; full_name: string } | null
}

const STATUS_TONE: Record<AssignmentStatus, 'brand' | 'success' | 'danger' | 'neutral' | 'warning'> = {
  pending: 'warning',
  in_progress: 'brand',
  completed: 'success',
  overdue: 'danger',
  cancelled: 'neutral',
}

const STATUS_TEXT: Record<AssignmentStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  completed: 'Completada',
  overdue: 'Fuera de plazo',
  cancelled: 'Cancelada',
}

export default function Assignments() {
  const { school } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<AssignmentStatus | 'all'>('all')

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments', school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*, student:profiles!assignments_student_id_fkey(id, full_name)')
        .eq('school_id', school!.id)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return (data ?? []) as Row[]
    },
  })

  const { data: students } = useQuery({
    queryKey: ['students-lite', school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const { data } = await supabase.rpc('school_student_overview')
      return (data ?? []) as StudentOverview[]
    },
  })

  const rows = useMemo(() => {
    let list = assignments ?? []
    if (filter !== 'all') list = list.filter((a) => a.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.student?.full_name ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [assignments, filter, search])

  async function cancel(id: string) {
    await supabase.from('assignments').update({ status: 'cancelled' }).eq('id', id)
    qc.invalidateQueries({ queryKey: ['assignments'] })
  }

  if (isLoading) return <PageLoader />

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tareas asignadas</h1>
          <p className="mt-1 text-sm text-ink-500">
            {assignments?.filter((a) => a.status === 'pending').length ?? 0} pendientes de{' '}
            {assignments?.length ?? 0} en total
          </p>
        </div>
        <Button
          onClick={() => { setPicked([]); setOpen(true) }}
          icon={<Plus className="h-4 w-4" />}
        >
          Nueva asignación
        </Button>
      </header>

      {/* Selección múltiple de alumnos */}
      <Card className="mb-5 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4" />
            Asignar a varios alumnos a la vez
          </h2>
          {picked.length > 0 && (
            <Button size="sm" onClick={() => setOpen(true)}>
              Asignar a {picked.length}
            </Button>
          )}
        </div>
        <div className="thin-scroll flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
          {(students ?? []).map((s) => {
            const on = picked.includes(s.student_id)
            return (
              <button
                key={s.student_id}
                onClick={() =>
                  setPicked((prev) =>
                    on ? prev.filter((x) => x !== s.student_id) : [...prev, s.student_id],
                  )
                }
                className={clsx(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  on
                    ? 'bg-brand-600 text-white'
                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700',
                )}
              >
                {s.full_name || 'Sin nombre'}
              </button>
            )
          })}
          {!students?.length && (
            <p className="text-sm text-ink-500">Todavía no hay alumnos registrados.</p>
          )}
        </div>
      </Card>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-10"
            placeholder="Buscar por título o alumno…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(['all', 'pending', 'in_progress', 'completed', 'overdue'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === f
                ? 'bg-brand-600 text-white'
                : 'bg-white text-ink-600 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800',
            )}
          >
            {f === 'all' ? 'Todas' : STATUS_TEXT[f]}
          </button>
        ))}
      </div>

      {rows.length ? (
        <Card className="divide-y divide-ink-200 dark:divide-ink-800">
          {rows.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.title}</p>
                <p className="mt-0.5 text-sm text-ink-500">
                  {a.student ? (
                    <Link
                      to={`/alumnos/${a.student.id}`}
                      className="hover:underline"
                    >
                      {a.student.full_name}
                    </Link>
                  ) : 'Alumno eliminado'}
                  {' · '}Enviada {relative(a.created_at)}
                  {a.due_at && ` · Entrega ${shortDate(a.due_at)}`}
                </p>
                {a.message && (
                  <p className="mt-1 truncate text-xs italic text-ink-400">«{a.message}»</p>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {a.best_score != null && (
                  <span
                    className={clsx(
                      'text-sm font-semibold tabular-nums',
                      a.best_score >= 88 ? 'text-emerald-600' : 'text-rose-600',
                    )}
                  >
                    {a.best_score} %
                  </span>
                )}
                <span className="text-xs text-ink-400 tabular-nums">
                  {a.attempts_used}/{a.attempts_allowed}
                </span>
                <Badge tone={STATUS_TONE[a.status]}>{STATUS_TEXT[a.status]}</Badge>
                {['pending', 'in_progress'].includes(a.status) && (
                  <button
                    onClick={() => cancel(a.id)}
                    className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    aria-label="Cancelar tarea"
                    title="Cancelar tarea"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title={search || filter !== 'all' ? 'Nada coincide con el filtro' : 'Sin tareas asignadas'}
          description="Selecciona alumnos arriba y envíales un test a medida."
          action={
            <Button onClick={() => setOpen(true)} icon={<Plus className="h-4 w-4" />}>
              Nueva asignación
            </Button>
          }
        />
      )}

      <AssignTestModal
        open={open}
        onClose={() => setOpen(false)}
        studentIds={picked.length ? picked : (students ?? []).map((s) => s.student_id)}
        schoolId={school!.id}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ['assignments'] })
          setPicked([])
        }}
      />
    </div>
  )
}
