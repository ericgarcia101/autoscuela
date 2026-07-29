import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { BookOpen, ChevronRight, FileText, Link2, Play, Video } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge, Button, Card, EmptyState, PageLoader, ProgressBar } from '@/components/ui'
import type { Topic, TopicBreakdown } from '@/lib/types'

interface Material {
  id: string
  topic_id: string | null
  title: string
  kind: string
  content: string | null
  url: string | null
  duration_min: number | null
}

const KIND_ICON: Record<string, typeof FileText> = {
  article: FileText,
  pdf: FileText,
  video: Video,
  link: Link2,
}

export default function Materials() {
  const navigate = useNavigate()
  const [openTopic, setOpenTopic] = useState<string | null>(null)
  const [reading, setReading] = useState<Material | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const [topics, materials, breakdown] = await Promise.all([
        supabase.from('topics').select('*').is('parent_id', null).order('position'),
        supabase.from('study_materials').select('*').eq('is_published', true).order('position'),
        supabase.rpc('student_topic_breakdown'),
      ])
      return {
        topics: (topics.data ?? []) as Topic[],
        materials: (materials.data ?? []) as Material[],
        breakdown: (breakdown.data ?? []) as TopicBreakdown[],
      }
    },
  })

  async function practiceTopic(code: string) {
    // Las plantillas del sistema siguen el patrón tema_<algo>; si no existe una
    // específica, se recurre al test libre acotado por reglas.
    const { data: id, error } = await supabase.rpc('start_test_session', {
      p_template_code: 'random_30',
      p_overrides: { rules: { topics: [code], strategy: 'random' }, question_count: 20 },
    })
    if (!error) navigate(`/test/${id}`)
  }

  if (isLoading) return <PageLoader />

  const accuracyByTopic = new Map(
    (data?.breakdown ?? []).map((b) => [b.topic_id, b]),
  )

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Temario</h1>
        <p className="mt-1 text-sm text-ink-500">
          Los {data?.topics.length ?? 0} bloques del examen teórico, con tu nivel en cada uno.
        </p>
      </header>

      <div className="space-y-3">
        {data?.topics.map((t) => {
          const stats = accuracyByTopic.get(t.id)
          const mats = (data.materials ?? []).filter((m) => m.topic_id === t.id)
          const open = openTopic === t.id

          return (
            <Card key={t.id} className="overflow-hidden">
              <button
                onClick={() => setOpenTopic(open ? null : t.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/50"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `${t.color ?? '#64748b'}1a`,
                    color: t.color ?? '#64748b',
                  }}
                >
                  <BookOpen className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.name}</p>
                  <p className="truncate text-sm text-ink-500">{t.description}</p>
                  {stats && stats.answered > 0 && (
                    <div className="mt-2 flex items-center gap-2.5">
                      <ProgressBar
                        value={stats.accuracy}
                        tone={
                          stats.accuracy >= 85 ? 'success'
                            : stats.accuracy >= 70 ? 'brand' : 'danger'
                        }
                        className="max-w-[180px]"
                      />
                      <span className="shrink-0 text-xs tabular-nums text-ink-500">
                        {stats.accuracy} % · {stats.answered} preguntas
                      </span>
                    </div>
                  )}
                </div>

                <ChevronRight
                  className={clsx(
                    'h-5 w-5 shrink-0 text-ink-400 transition-transform',
                    open && 'rotate-90',
                  )}
                />
              </button>

              {open && (
                <div className="border-t border-ink-200 px-5 py-4 dark:border-ink-800">
                  <Button
                    size="sm"
                    onClick={() => practiceTopic(t.code)}
                    icon={<Play className="h-3.5 w-3.5" />}
                    className="mb-4"
                  >
                    Practicar este bloque
                  </Button>

                  {mats.length ? (
                    <div className="space-y-2">
                      {mats.map((m) => {
                        const Icon = KIND_ICON[m.kind] ?? FileText
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              if (m.kind === 'article') setReading(m)
                              else if (m.url) window.open(m.url, '_blank', 'noopener')
                            }}
                            className="flex w-full items-center gap-3 rounded-xl border border-ink-200 px-4 py-3 text-left transition-colors hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-ink-400" />
                            <span className="flex-1 text-sm font-medium">{m.title}</span>
                            {m.duration_min && <Badge>{m.duration_min} min</Badge>}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-500">
                      Tu autoescuela aún no ha subido apuntes de este bloque. Puedes practicarlo con
                      tests: cada pregunta trae su explicación y el artículo que la respalda.
                    </p>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {!data?.topics.length && (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="Temario no disponible"
          description="Contacta con tu autoescuela."
        />
      )}

      {/* Lector de apuntes */}
      {reading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm"
          onClick={() => setReading(null)}
        >
          <Card
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4 dark:border-ink-800">
              <h2 className="font-semibold">{reading.title}</h2>
              <Button variant="ghost" size="sm" onClick={() => setReading(null)}>✕</Button>
            </div>
            <div className="thin-scroll max-h-[70vh] overflow-y-auto px-5 py-5">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700 dark:text-ink-200">
                {reading.content}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
