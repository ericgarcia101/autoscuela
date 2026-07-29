import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Check, CreditCard, Download, Plus, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { euros, shortDate } from '@/lib/format'
import { Badge, Button, Card, EmptyState, Field, Modal, PageLoader, StatTile } from '@/components/ui'
import type { PaymentStatus, StudentOverview } from '@/lib/types'

interface Row {
  id: string
  concept: string
  amount_cents: number
  status: PaymentStatus
  method: string | null
  due_date: string | null
  paid_at: string | null
  invoice_ref: string | null
  created_at: string
  student: { id: string; full_name: string } | null
}

const STATUS_TONE: Record<PaymentStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'danger',
  refunded: 'neutral',
  cancelled: 'neutral',
}

const STATUS_TEXT: Record<PaymentStatus, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  overdue: 'Vencido',
  refunded: 'Devuelto',
  cancelled: 'Anulado',
}

const METHODS = ['efectivo', 'transferencia', 'tarjeta', 'bizum', 'domiciliación']

export default function Billing() {
  const { school, profile } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    student_id: '',
    concept: '',
    amount: '',
    due_date: '',
    method: 'transferencia',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['payments', school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const [payments, students] = await Promise.all([
        supabase
          .from('payments')
          .select('*, student:profiles!payments_student_id_fkey(id, full_name)')
          .eq('school_id', school!.id)
          .order('created_at', { ascending: false })
          .limit(300),
        supabase.rpc('school_student_overview'),
      ])
      return {
        payments: (payments.data ?? []) as Row[],
        students: (students.data ?? []) as StudentOverview[],
      }
    },
  })

  const rows = useMemo(() => {
    let list = data?.payments ?? []
    if (filter !== 'all') list = list.filter((p) => p.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.concept.toLowerCase().includes(q) ||
          (p.student?.full_name ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [data?.payments, filter, search])

  const all = data?.payments ?? []
  const collected = all.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount_cents, 0)
  const pending = all.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount_cents, 0)
  const overdue = all.filter((p) => p.status === 'overdue')

  async function markPaid(id: string) {
    await supabase
      .from('payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id)
    qc.invalidateQueries({ queryKey: ['payments'] })
  }

  async function create() {
    setError('')
    const cents = Math.round(parseFloat(form.amount.replace(',', '.')) * 100)
    if (!form.student_id) { setError('Elige un alumno.'); return }
    if (!form.concept.trim()) { setError('Escribe un concepto.'); return }
    if (!Number.isFinite(cents) || cents <= 0) { setError('El importe no es válido.'); return }

    setSaving(true)
    try {
      const { error: insertError } = await supabase.from('payments').insert({
        school_id: school!.id,
        student_id: form.student_id,
        concept: form.concept.trim(),
        amount_cents: cents,
        status: 'pending',
        method: form.method,
        due_date: form.due_date || null,
        created_by: profile!.id,
      })
      if (insertError) throw insertError

      qc.invalidateQueries({ queryKey: ['payments'] })
      setOpen(false)
      setForm({ student_id: '', concept: '', amount: '', due_date: '', method: 'transferencia' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido crear el recibo.')
    } finally {
      setSaving(false)
    }
  }

  function exportCsv() {
    const header = ['Alumno', 'Concepto', 'Importe', 'Estado', 'Método', 'Vencimiento', 'Pagado']
    const lines = rows.map((p) => [
      p.student?.full_name ?? '',
      p.concept,
      (p.amount_cents / 100).toFixed(2),
      STATUS_TEXT[p.status],
      p.method ?? '',
      p.due_date ?? '',
      p.paid_at ?? '',
    ])
    const csv = [header, ...lines]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `cobros-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <PageLoader />

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cobros</h1>
          <p className="mt-1 text-sm text-ink-500">
            Control de recibos de la academia. No procesa pagos: es un registro contable.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={exportCsv}
            icon={<Download className="h-4 w-4" />}
            disabled={!rows.length}
          >
            Exportar
          </Button>
          <Button onClick={() => setOpen(true)} icon={<Plus className="h-4 w-4" />}>
            Nuevo recibo
          </Button>
        </div>
      </header>

      <div className="mb-6 grid gap-3.5 sm:grid-cols-3">
        <StatTile label="Cobrado" value={euros(collected)} tone="success" icon={<Check className="h-5 w-5" />} />
        <StatTile label="Pendiente" value={euros(pending)} tone="warning" icon={<CreditCard className="h-5 w-5" />} />
        <StatTile
          label="Vencido"
          value={euros(overdue.reduce((s, p) => s + p.amount_cents, 0))}
          hint={`${overdue.length} recibos`}
          tone={overdue.length ? 'danger' : 'neutral'}
          icon={<CreditCard className="h-5 w-5" />}
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-10"
            placeholder="Buscar por concepto o alumno…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(['all', 'pending', 'overdue', 'paid'] as const).map((f) => (
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
            {f === 'all' ? 'Todos' : STATUS_TEXT[f]}
          </button>
        ))}
      </div>

      {rows.length ? (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500 dark:border-ink-800">
              <tr>
                <th className="px-5 py-3 font-medium">Alumno</th>
                <th className="px-5 py-3 font-medium">Concepto</th>
                <th className="px-5 py-3 text-right font-medium">Importe</th>
                <th className="px-5 py-3 font-medium">Vencimiento</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200 dark:divide-ink-800">
              {rows.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/50">
                  <td className="px-5 py-3.5 font-medium">{p.student?.full_name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-ink-600 dark:text-ink-300">
                    {p.concept}
                    {p.method && <span className="ml-2 text-xs text-ink-400">{p.method}</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                    {euros(p.amount_cents)}
                  </td>
                  <td className="px-5 py-3.5 text-ink-500">
                    {p.paid_at ? `Pagado ${shortDate(p.paid_at)}` : shortDate(p.due_date)}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={STATUS_TONE[p.status]}>{STATUS_TEXT[p.status]}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {p.status !== 'paid' && p.status !== 'cancelled' && (
                      <Button size="sm" variant="ghost" onClick={() => markPaid(p.id)}>
                        Marcar cobrado
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState
          icon={<CreditCard className="h-8 w-8" />}
          title="Sin recibos"
          description="Crea el primer recibo para llevar el control de cobros."
          action={
            <Button onClick={() => setOpen(true)} icon={<Plus className="h-4 w-4" />}>
              Nuevo recibo
            </Button>
          }
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo recibo"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create} loading={saving}>Crear</Button>
          </>
        }
      >
        <Field label="Alumno">
          <select
            className="input"
            value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: e.target.value })}
          >
            <option value="">Selecciona un alumno…</option>
            {data?.students.map((s) => (
              <option key={s.student_id} value={s.student_id}>{s.full_name}</option>
            ))}
          </select>
        </Field>

        <Field label="Concepto">
          <input
            className="input"
            value={form.concept}
            onChange={(e) => setForm({ ...form, concept: e.target.value })}
            placeholder="Matrícula, pack de 10 clases, tasas DGT…"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Importe (€)">
            <input
              className="input"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="250,00"
            />
          </Field>
          <Field label="Vencimiento">
            <input
              type="date"
              className="input"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Forma de pago prevista">
          <select
            className="input"
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
        </Field>

        {error && (
          <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </p>
        )}
      </Modal>
    </div>
  )
}
