import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { MessageSquare, Search, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useConversation } from '@/hooks/useConversation'
import ChatThread from '@/components/ChatThread'
import { Badge, Card, EmptyState, Field, PageLoader } from '@/components/ui'
import { initials, relative } from '@/lib/format'
import type { Conversation } from '@/lib/types'

interface Row extends Conversation {
  student: { id: string; full_name: string; email: string | null } | null
}

interface StudentOption {
  id: string
  full_name: string
  email: string | null
}

export default function AdminInbox() {
  const { profile, school } = useAuth()
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  // Alumno elegido en el desplegable cuando todavía no hay conversación abierta
  // con él. `useConversation` la crea al vuelo en cuanto se manda el primero.
  const [startWith, setStartWith] = useState<string>('')

  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['admin-inbox', school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, student:profiles!conversations_student_id_fkey(id, full_name, email)')
        .eq('school_id', school!.id)
        .eq('kind', 'support')
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Row[]
    },
  })

  // Todos los alumnos de la autoescuela, hayan escrito o no
  const { data: students } = useQuery({
    queryKey: ['inbox-students', school?.id],
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

  // Mantiene la lista viva: si llega un mensaje nuevo, sube a lo alto
  useEffect(() => {
    const channel = supabase
      .channel('inbox-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => refetch())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refetch])

  const { messages, loading, send } = useConversation({
    conversationId: selected,
    // Sólo cuando no hay hilo elegido: así el hook busca o crea el del alumno.
    studentId: selected ? null : startWith || null,
    schoolId: school?.id ?? null,
    asStaff: true,
  })

  useEffect(() => {
    if (!selected && !startWith && conversations?.length) setSelected(conversations[0].id)
  }, [conversations, selected, startWith])

  // Si la conversación recién creada ya aparece en la lista, se pasa a ella
  // para que el hilo quede seleccionado como cualquier otro.
  useEffect(() => {
    if (!startWith) return
    const existing = conversations?.find((c) => c.student?.id === startWith)
    if (existing) { setSelected(existing.id); setStartWith('') }
  }, [conversations, startWith])

  if (isLoading) return <PageLoader />

  const filtered = (conversations ?? []).filter((c) =>
    !search.trim() ||
    (c.student?.full_name ?? '').toLowerCase().includes(search.toLowerCase()),
  )
  const active = conversations?.find((c) => c.id === selected)
  // Con quién se está hablando: el hilo abierto, o el alumno recién elegido
  // en el desplegable si todavía no tiene conversación.
  const pending = startWith ? students?.find((s) => s.id === startWith) : undefined
  const peer = active?.student ?? pending ?? null

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Mensajes</h1>
        <p className="mt-1 text-sm text-ink-500">
          {conversations?.filter((c) => c.unread_for_staff > 0).length ?? 0} conversaciones sin leer
        </p>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_1fr]">
          {/* Lista */}
          <Card className="flex min-h-0 flex-col overflow-hidden">
            <div className="space-y-3 border-b border-ink-200 p-3 dark:border-ink-800">
              <Field label="Escribir a un alumno">
                <select
                  className="input"
                  value={startWith || (active?.student?.id ?? '')}
                  onChange={(e) => {
                    const id = e.target.value
                    if (!id) return
                    const existing = conversations?.find((c) => c.student?.id === id)
                    if (existing) { setSelected(existing.id); setStartWith('') }
                    else { setSelected(null); setStartWith(id) }
                  }}
                >
                  <option value="">Elige un alumno…</option>
                  {(students ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.email || 'Alumno'}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  className="input pl-10"
                  placeholder="Buscar en conversaciones…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="thin-scroll flex-1 overflow-y-auto">
              {!conversations?.length && (
                <p className="px-4 py-8 text-center text-sm text-ink-500">
                  Todavía no hay conversaciones. Elige un alumno arriba para
                  escribirle el primero.
                </p>
              )}
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={clsx(
                    'flex w-full items-start gap-3 border-b border-ink-100 px-4 py-3.5 text-left transition-colors dark:border-ink-800',
                    selected === c.id
                      ? 'bg-brand-50 dark:bg-brand-950/30'
                      : 'hover:bg-ink-50 dark:hover:bg-ink-800/50',
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-200 text-xs font-semibold text-ink-700 dark:bg-ink-700 dark:text-ink-200">
                    {initials(c.student?.full_name || '?')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="truncate text-sm font-medium">
                        {c.student?.full_name || 'Alumno'}
                      </p>
                      <span className="ml-auto shrink-0 text-[11px] text-ink-400">
                        {relative(c.last_message_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {c.last_message_text || 'Sin mensajes'}
                    </p>
                  </div>
                  {c.unread_for_staff > 0 && (
                    <Badge tone="danger">{c.unread_for_staff}</Badge>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Conversación */}
          <Card className="flex min-h-0 flex-col bg-ink-50 dark:bg-ink-950/50">
            {peer && (
              <div className="flex items-center gap-3 border-b border-ink-200 px-4 py-3 dark:border-ink-800">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-200 text-xs font-semibold text-ink-700 dark:bg-ink-700 dark:text-ink-200">
                  {initials(peer.full_name || '?')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{peer.full_name}</p>
                  <p className="truncate text-xs text-ink-500">{peer.email}</p>
                </div>
                <Link
                  to={`/alumnos/${peer.id}`}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
                >
                  <User className="h-4 w-4" /> Ver ficha
                </Link>
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col p-4">
              {peer ? (
                <ChatThread
                  messages={messages}
                  loading={loading}
                  viewAs="staff"
                  onSend={(body) => send(body, profile!.id)}
                  placeholder={`Escribir a ${peer.full_name?.split(' ')[0] || 'el alumno'}…`}
                />
              ) : (
                <EmptyState
                  icon={<MessageSquare className="h-8 w-8" />}
                  title="Elige a quién escribir"
                  description="Selecciona un alumno en el desplegable de la izquierda para abrir su chat."
                />
              )}
            </div>
          </Card>
      </div>
    </div>
  )
}
