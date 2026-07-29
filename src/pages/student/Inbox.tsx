import { MessageSquare } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useConversation } from '@/hooks/useConversation'
import ChatThread from '@/components/ChatThread'
import { Card, EmptyState } from '@/components/ui'

export default function Inbox() {
  const { profile } = useAuth()
  const { messages, loading, send, error } = useConversation({
    kind: 'support',
    studentId: profile?.id,
    schoolId: profile?.school_id,
  })

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Mensajes</h1>
        <p className="mt-1 text-sm text-ink-500">
          Habla directamente con tu autoescuela: dudas, cambios de clase o papeleo.
        </p>
      </header>

      {error && (
        <p className="mb-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </p>
      )}

      <Card className="flex min-h-0 flex-1 flex-col bg-ink-50 p-4 dark:bg-ink-950/50">
        <ChatThread
          messages={messages}
          loading={loading}
          viewAs="student"
          onSend={(body) => send(body, profile!.id)}
          placeholder="Escribe a tu autoescuela…"
          emptyState={
            <EmptyState
              icon={<MessageSquare className="h-8 w-8" />}
              title="Empieza la conversación"
              description="Tu profesor recibirá el mensaje y te responderá desde el panel de la autoescuela."
            />
          }
          footerNote="Respuesta en horario de oficina. Para urgencias, llama a la academia."
        />
      </Card>
    </div>
  )
}
