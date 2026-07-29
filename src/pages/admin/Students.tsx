import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Download, MessageSquare, Search, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { pct, relative, STATUS_LABEL, STATUS_TONE } from '@/lib/format'
import { Badge, Button, Card, EmptyState, PageLoader } from '@/components/ui'
import type { StudentOverview, StudentStatus } from '@/lib/types'

type SortKey = 'name' | 'score' | 'activity' | 'sessions'

const FILTERS: { key: StudentStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'enrolled', label: 'Matriculados' },
  { key: 'theory_pass', label: 'Teórico aprobado' },
  { key: 'practical', label: 'En prácticas' },
  { key: 'graduated', label: 'Titulados' },
  { key: 'paused', label: 'En pausa' },
]

export default function Students() {
  const { school } = useAuth()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StudentStatus | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('activity')

  const { data, isLoading } = useQuery({
    queryKey: ['students', school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('school_student_overview')
      if (error) throw error
      return (data ?? []) as StudentOverview[]
    },
  })

  const rows = useMemo(() => {
    let list = data ?? []
    if (status !== 'all') list = list.filter((s) => s.status === status)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) =>
          s.full_name.toLowerCase().includes(q) ||
          (s.email ?? '').toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'name': return a.full_name.localeCompare(b.full_name, 'es')
        case 'score': return (b.avg_score ?? -1) - (a.avg_score ?? -1)
        case 'sessions': return b.sessions - a.sessions
        default:
          return new Date(b.last_activity ?? 0).getTime() - new Date(a.last_activity ?? 0).getTime()
      }
    })
  }, [data, search, status, sort])

  function exportCsv() {
    const header = ['Nombre', 'Email', 'Estado', 'Permiso', 'Tests', 'Media', 'Racha', 'Última actividad']
    const lines = rows.map((s) => [
      s.full_name,
      s.email ?? '',
      STATUS_LABEL[s.status],
      s.target_license,
      s.sessions,
      s.avg_score ?? '',
      s.current_streak,
      s.last_activity ?? '',
    ])
    const csv = [header, ...lines]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `alumnos-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <PageLoader />

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alumnos</h1>
          <p className="mt-1 text-sm text-ink-500">
            {rows.length} de {data?.length ?? 0}
            {school?.seat_limit ? ` · plan de ${school.seat_limit} plazas` : ''}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={exportCsv}
          icon={<Download className="h-4 w-4" />}
          disabled={!rows.length}
        >
          Exportar CSV
        </Button>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-10"
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="activity">Actividad reciente</option>
          <option value="name">Nombre</option>
          <option value="score">Mejor media</option>
          <option value="sessions">Más tests</option>
        </select>
      </div>

      <div className="thin-scroll mb-5 flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={clsx(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              status === f.key
                ? 'bg-brand-600 text-white'
                : 'bg-white text-ink-600 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length ? (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500 dark:border-ink-800">
              <tr>
                <th className="px-5 py-3 font-medium">Alumno</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 text-right font-medium">Tests</th>
                <th className="px-5 py-3 text-right font-medium">Media</th>
                <th className="px-5 py-3 text-right font-medium">Racha</th>
                <th className="px-5 py-3 font-medium">Actividad</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200 dark:divide-ink-800">
              {rows.map((s) => (
                <tr key={s.student_id} className="transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/50">
                  <td className="px-5 py-3.5">
                    <Link to={`/alumnos/${s.student_id}`} className="block">
                      <p className="font-medium">{s.full_name || 'Sin nombre'}</p>
                      <p className="text-xs text-ink-500">{s.email}</p>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_TONE[s.status])}>
                      {STATUS_LABEL[s.status]}
                    </span>
                    <span className="ml-1.5 text-xs text-ink-400">{s.target_license}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{s.sessions}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={clsx(
                        'font-semibold tabular-nums',
                        (s.avg_score ?? 0) >= 88 ? 'text-emerald-600'
                          : (s.avg_score ?? 0) >= 70 ? 'text-brand-600' : 'text-rose-600',
                      )}
                    >
                      {pct(s.avg_score, 0)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-ink-500">
                    {s.current_streak}
                  </td>
                  <td className="px-5 py-3.5 text-ink-500">{relative(s.last_activity)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {s.unread_messages > 0 ? (
                      <Link to="/mensajes">
                        <Badge tone="danger">
                          <MessageSquare className="h-3 w-3" />
                          {s.unread_messages}
                        </Badge>
                      </Link>
                    ) : (
                      <Link
                        to={`/alumnos/${s.student_id}`}
                        className="text-brand-600 hover:underline dark:text-brand-400"
                      >
                        Ficha
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={search || status !== 'all' ? 'Ningún alumno coincide' : 'Todavía no hay alumnos'}
          description={
            search || status !== 'all'
              ? 'Prueba a cambiar el filtro o la búsqueda.'
              : `Comparte el código «${school?.slug ?? ''}» para que se registren.`
          }
        />
      )}
    </div>
  )
}
