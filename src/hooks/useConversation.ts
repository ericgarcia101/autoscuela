import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ConversationKind, Message } from '@/lib/types'

interface Options {
  /** Conversación existente. Si se omite, se busca o crea por `kind`. */
  conversationId?: string | null
  kind?: ConversationKind
  studentId?: string | null
  schoolId?: string | null
  /** true cuando quien lee es personal de la autoescuela. */
  asStaff?: boolean
}

/**
 * Carga una conversación, la mantiene sincronizada por Realtime y expone
 * `send`. Se usa tanto en el chat del alumno como en la bandeja del admin.
 */
export function useConversation({
  conversationId: fixedId,
  kind = 'support',
  studentId,
  schoolId,
  asStaff = false,
}: Options) {
  const [conversationId, setConversationId] = useState<string | null>(fixedId ?? null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (fixedId) setConversationId(fixedId)
  }, [fixedId])

  // Resuelve (o crea) la conversación del alumno
  useEffect(() => {
    if (fixedId || !studentId || !schoolId) return
    let cancelled = false

    // Al cambiar de alumno hay que soltar el hilo anterior: si no, se verían
    // por un instante los mensajes de la conversación que estaba abierta.
    setConversationId(null)
    setMessages([])

    ;(async () => {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('student_id', studentId)
        .eq('kind', kind)
        .eq('is_archived', false)
        .maybeSingle()

      if (cancelled) return
      if (existing) { setConversationId(existing.id); return }

      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert({
          student_id: studentId,
          school_id: schoolId,
          kind,
          title: kind === 'ai_tutor' ? 'Tutor IA' : 'Autoescuela',
        })
        .select('id')
        .single()

      if (cancelled) return
      if (createError) setError(createError.message)
      else setConversationId(created.id)
    })()

    return () => { cancelled = true }
  }, [fixedId, studentId, schoolId, kind])

  // Carga inicial + suscripción en vivo
  useEffect(() => {
    if (!conversationId) return
    let cancelled = false
    setLoading(true)

    ;(async () => {
      const { data, error: loadError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(300)

      if (cancelled) return
      if (loadError) setError(loadError.message)
      else setMessages((data ?? []) as Message[])
      setLoading(false)

      // Al abrir, se marca como leído del lado que corresponda
      await supabase
        .from('conversations')
        .update(asStaff ? { unread_for_staff: 0 } : { unread_for_student: 0 })
        .eq('id', conversationId)
    })()

    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
          )
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [conversationId, asStaff])

  const send = useCallback(
    async (body: string, senderId: string) => {
      const text = body.trim()
      if (!text || !conversationId) return

      const { data, error: sendError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          author: asStaff ? 'staff' : 'student',
          body: text,
        })
        .select('*')
        .single()

      if (sendError) { setError(sendError.message); return }

      // Se añade de inmediato: Realtime puede tardar unos milisegundos y el
      // usuario debe ver su mensaje al instante.
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message],
      )
    },
    [conversationId, asStaff],
  )

  return { conversationId, messages, setMessages, loading, error, send }
}
