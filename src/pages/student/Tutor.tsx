import { useState } from 'react'
import { Info, Sparkles } from 'lucide-react'
import { invokeFunction } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useConversation } from '@/hooks/useConversation'
import ChatThread from '@/components/ChatThread'
import { Badge, Card, EmptyState } from '@/components/ui'
import type { AiReply, Message } from '@/lib/types'

const SUGGESTIONS = [
  '¿Qué velocidad máxima tengo en una vía urbana de dos carriles?',
  '¿Cuál es la tasa de alcohol para conductores noveles?',
  '¿Quién tiene prioridad al entrar en una glorieta?',
  '¿Cuántos puntos me quitan por usar el móvil?',
  'Explícame la diferencia entre STOP y ceda el paso',
]

export default function Tutor() {
  const { profile } = useAuth()
  const { conversationId, messages, setMessages, loading, send } = useConversation({
    kind: 'ai_tutor',
    studentId: profile?.id,
    schoolId: profile?.school_id,
  })
  const [thinking, setThinking] = useState(false)
  const [quota, setQuota] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function ask(question: string) {
    if (!profile || !conversationId) return
    setError('')

    // El mensaje del alumno se guarda con su propia identidad; la respuesta la
    // inserta la Edge Function con la service-role key.
    await send(question, profile.id)
    setThinking(true)

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.author === 'ai' ? ('assistant' as const) : ('user' as const),
        content: m.body,
      }))

      const reply = await invokeFunction<AiReply>('ai-tutor', {
        message: question,
        conversation_id: conversationId,
        history,
      })

      setQuota(reply.quota_remaining)

      // La función ya insertó el mensaje; si Realtime tarda, se pinta aquí.
      setMessages((prev) => {
        if (prev.some((m) => m.author === 'ai' && m.body === reply.answer)) return prev
        const local: Message = {
          id: `local-${Date.now()}`,
          conversation_id: conversationId,
          sender_id: null,
          author: 'ai',
          body: reply.answer,
          citations: reply.citations ?? [],
          read_at: null,
          created_at: new Date().toISOString(),
        }
        return [...prev, local]
      })
    } catch (err) {
      console.error(err)
      setError(
        'El tutor no está disponible ahora mismo. Puedes escribir a tu profesor desde Mensajes.',
      )
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="h-6 w-6 text-brand-600" />
            Tutor
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Resuelve dudas del temario citando el artículo que las respalda.
          </p>
        </div>
        {quota !== null && (
          <Badge tone={quota > 5 ? 'neutral' : 'warning'}>
            {quota} consultas restantes hoy
          </Badge>
        )}
      </header>

      <div className="mb-3 flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          El tutor te orienta sobre el temario, pero no sustituye a tu profesor. Para trámites,
          multas o casos personales, escribe a la autoescuela.
        </p>
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </p>
      )}

      <Card className="flex min-h-0 flex-1 flex-col bg-ink-50 p-4 dark:bg-ink-950/50">
        <ChatThread
          messages={messages}
          loading={loading}
          sending={thinking}
          viewAs="student"
          onSend={ask}
          disabled={thinking}
          placeholder="Pregunta lo que no entiendas del temario…"
          emptyState={
            <div className="py-6">
              <EmptyState
                icon={<Sparkles className="h-8 w-8" />}
                title="Pregúntame lo que quieras del temario"
                description="Respondo con la explicación y el artículo del reglamento que la sustenta."
              />
              <div className="mx-auto mt-5 flex max-w-lg flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="rounded-full border border-ink-200 bg-white px-3.5 py-2 text-left text-sm text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:border-brand-700 dark:hover:bg-ink-800"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          }
        />
      </Card>
    </div>
  )
}
