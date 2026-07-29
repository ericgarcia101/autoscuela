import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowRight, BarChart3, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { duration, shortDate } from '@/lib/format'
import { Badge, Card, EmptyState, PageLoader } from '@/components/ui'
import type { TestSession } from '@/lib/types'

const PAGE = 25

export default function History() {
  const { profile } = useAuth()
  const [page, setPage] = useState(0)
  const [only, setOnly] = useState<'all' | 'passed' | 'failed'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['history', profile?.id, page, only],
    enabled: !!profile?.id,
    queryFn: async () => {
      let query = supabase
        .from('test_sessions')
        .select('*', { count: 'exact' })
        .eq('student_id', profile!.id)
        .eq('status', 'completed')
        .order('finished_at', { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1)

      if (only === 'passed') query = query.eq('passed', true)
      if (only === 'failed') query = query.eq('passed', false)

      const { data, count, error } = await query
      if (error) throw error
      return { rows: (data ?? []) as TestSession[], total: count ?? 0 }
    },
  })

  if (isLoading) return <PageLoader />

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE)

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial</h1>
          <p className="mt-1 text-sm text-ink-500">{data?.total ?? 0} tests completados</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-ink-400" />
          {([['all', 'Todos'], ['passed', 'Aprobados'], ['failed', 'Suspensos']] as const).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => { setOnly(key); setPage(0) }}
                className={clsx(
                  'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  only === key
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-ink-600 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800',
                )}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </header>

      {data?.rows.length ? (
        <>
          <Card className="divide-y divide-ink-200 dark:divide-ink-800">
            {data.rows.map((s) => (
              <Link
                key={s.id}
                to={`/resultado/${s.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/50"
              >
                <div
                  className={clsx(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold tabular-nums',
                    s.passed
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
                  )}
                >
                  {Math.round(s.score ?? 0)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="mt-0.5 text-sm text-ink-500">
                    {s.correct} aciertos · {s.incorrect} fallos
                    {s.blank > 0 && ` · ${s.blank} en blanco`}
                    {' · '}{duration(s.duration_sec)}
                  </p>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <Badge tone={s.passed ? 'success' : 'danger'}>
                    {s.passed ? 'Aprobado' : 'Suspenso'}
                  </Badge>
                  <p className="mt-1 text-xs text-ink-400">{shortDate(s.finished_at)}</p>
                </div>

                <ArrowRight className="h-4 w-4 shrink-0 text-ink-400" />
              </Link>
            ))}
          </Card>

          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800"
              >
                Anterior
              </button>
              <span className="px-2 text-sm tabular-nums text-ink-500">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title="Sin tests todavía"
          description={
            only === 'all'
              ? 'Cuando completes tu primer test aparecerá aquí.'
              : 'No hay tests con ese filtro.'
          }
        />
      )}
    </div>
  )
}
