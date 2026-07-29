import { useEffect, useRef, useState, type FormEvent } from 'react'
import clsx from 'clsx'
import { BookOpen, Send, Sparkles } from 'lucide-react'
import { relative } from '@/lib/format'
import { Button, Spinner } from '@/components/ui'
import type { Message } from '@/lib/types'

interface Props {
  messages: Message[]
  loading: boolean
  sending?: boolean
  onSend: (body: string) => void | Promise<void>
  /** Perspectiva de lectura: cambia qué burbujas van alineadas a la derecha. */
  viewAs: 'student' | 'staff'
  placeholder?: string
  disabled?: boolean
  emptyState?: React.ReactNode
  footerNote?: string
}

export default function ChatThread({
  messages,
  loading,
  sending,
  onSend,
  viewAs,
  placeholder = 'Escribe un mensaje…',
  disabled,
  emptyState,
  footerNote,
}: Props) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, sending])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || disabled) return
    setDraft('')
    await onSend(text)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="thin-scroll flex-1 space-y-3.5 overflow-y-auto px-1 py-4">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : messages.length === 0 ? (
          emptyState ?? (
            <p className="py-10 text-center text-sm text-ink-500">
              Todavía no hay mensajes. Escribe el primero.
            </p>
          )
        ) : (
          messages.map((m) => {
            const mine = viewAs === 'student'
              ? m.author === 'student'
              : m.author === 'staff'
            const isAi = m.author === 'ai'
            const isSystem = m.author === 'system'

            if (isSystem) {
              return (
                <p key={m.id} className="text-center text-xs text-ink-400">{m.body}</p>
              )
            }

            return (
              <div key={m.id} className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
                <div className={clsx('max-w-[85%] sm:max-w-[75%]')}>
                  <div
                    className={clsx(
                      'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      mine
                        ? 'rounded-br-md bg-brand-600 text-white'
                        : isAi
                          ? 'rounded-bl-md border border-brand-200 bg-brand-50 text-ink-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-ink-100'
                          : 'rounded-bl-md bg-white text-ink-800 shadow-sm dark:bg-ink-800 dark:text-ink-100',
                    )}
                  >
                    {isAi && (
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
                        <Sparkles className="h-3.5 w-3.5" /> Tutor
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{m.body}</p>

                    {!!m.citations?.length && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-brand-200/60 pt-2 dark:border-brand-800/60">
                        {m.citations
                          .filter((c) => c.ref)
                          .map((c, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-md bg-white/70 px-1.5 py-0.5 text-[11px] font-medium text-brand-800 dark:bg-ink-900/60 dark:text-brand-300"
                            >
                              <BookOpen className="h-3 w-3" />
                              {c.ref}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                  <p
                    className={clsx(
                      'mt-1 px-1 text-[11px] text-ink-400',
                      mine ? 'text-right' : 'text-left',
                    )}
                  >
                    {relative(m.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-900 dark:bg-brand-950/40">
              <span className="flex gap-1">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </span>
              <span className="text-xs text-brand-700 dark:text-brand-300">escribiendo…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-ink-200 pt-3.5 dark:border-ink-800">
        <textarea
          className="input max-h-32 min-h-[46px] flex-1 resize-none"
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void submit(e as unknown as FormEvent)
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
        />
        <Button
          type="submit"
          disabled={disabled || !draft.trim()}
          loading={sending}
          icon={<Send className="h-4 w-4" />}
          aria-label="Enviar"
        />
      </form>

      {footerNote && <p className="mt-2 text-center text-xs text-ink-400">{footerNote}</p>}
    </div>
  )
}
