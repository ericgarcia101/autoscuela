import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  AlarmClock, AlertTriangle, Anchor, Bike, BookOpen, Bookmark, Brain, BrainCircuit,
  Bus, CalendarCheck, CalendarRange, CheckCheck, CircleArrowRight, CircleSlash,
  CircleX, ClipboardCheck, ClipboardList, Clock, Dices, FileText, Flag, Gauge, Gem,
  GitFork, GraduationCap, Heart, Infinity as InfinityIcon, Info, Layers, Leaf,
  Milestone, Minus, Move, OctagonAlert, Play, RectangleHorizontal, Route, Scale,
  Shield, Shuffle, SignalHigh, SignalLow, SignalMedium, Signpost, Siren,
  SlidersHorizontal, Skull, Sparkles, Swords, Timer, TrafficCone, TrendingDown,
  TriangleAlert, Trophy, Truck, Wine, Wrench, XCircle, Zap,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CATEGORY_LABEL, CATEGORY_ORDER } from '@/lib/format'
import { Badge, Button, Card, PageLoader } from '@/components/ui'
import type { TestTemplate } from '@/lib/types'

/**
 * Mapa explícito de iconos. Un `import * as Icons` sería más corto, pero
 * arrastra el paquete entero de lucide al bundle (~600 kB) porque impide el
 * tree-shaking.
 */
const ICONS: Record<string, typeof ClipboardList> = {
  'alarm-clock': AlarmClock, 'alert-triangle': AlertTriangle, anchor: Anchor,
  bike: Bike, 'book-open': BookOpen, bookmark: Bookmark, brain: Brain,
  'brain-circuit': BrainCircuit, bus: Bus, 'calendar-check': CalendarCheck,
  'calendar-range': CalendarRange, 'check-check': CheckCheck,
  'circle-arrow-right': CircleArrowRight, 'circle-slash': CircleSlash,
  'circle-x': CircleX, 'clipboard-check': ClipboardCheck,
  'clipboard-list': ClipboardList, crown: Trophy, dices: Dices,
  'file-text': FileText, flag: Flag, flame: Zap, gauge: Gauge, gem: Gem,
  'git-fork': GitFork, 'graduation-cap': GraduationCap, 'heart-pulse': Heart,
  infinity: InfinityIcon, info: Info, layers: Layers, leaf: Leaf,
  milestone: Milestone, minus: Minus, move: Move, 'octagon-alert': OctagonAlert,
  'rectangle-horizontal': RectangleHorizontal, route: Route, scale: Scale,
  shield: Shield, shuffle: Shuffle, 'signal-high': SignalHigh,
  'signal-low': SignalLow, 'signal-medium': SignalMedium, 'sign-post': Signpost,
  siren: Siren, skull: Skull, 'sliders-horizontal': SlidersHorizontal,
  sparkles: Sparkles, swords: Swords, timer: Timer, 'traffic-cone': TrafficCone,
  'trending-down': TrendingDown, 'triangle-alert': TriangleAlert, trophy: Trophy,
  truck: Truck, wine: Wine, wrench: Wrench, zap: Zap,
}

function TemplateIcon({ name, className }: { name: string | null; className?: string }) {
  const Cmp = ICONS[name ?? ''] ?? ClipboardList
  return <Cmp className={className} />
}

export default function TestCatalog() {
  const navigate = useNavigate()
  const [category, setCategory] = useState<string>('todos')
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_templates')
        .select('*')
        .eq('is_active', true)
        .order('position')
      if (error) throw error
      return data as TestTemplate[]
    },
    staleTime: 5 * 60_000,
  })

  const categories = useMemo(() => {
    const present = new Set((templates ?? []).map((t) => t.category))
    return ['todos', ...CATEGORY_ORDER.filter((c) => present.has(c))]
  }, [templates])

  const visible = useMemo(
    () => (templates ?? []).filter((t) => category === 'todos' || t.category === category),
    [templates, category],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, TestTemplate[]>()
    for (const t of visible) {
      const list = map.get(t.category) ?? []
      list.push(t)
      map.set(t.category, list)
    }
    return [...map.entries()].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]),
    )
  }, [visible])

  async function start(template: TestTemplate) {
    setStarting(template.code)
    setError('')
    try {
      const { data, error } = await supabase.rpc('start_test_session', {
        p_template_code: template.code,
      })
      if (error) throw error
      navigate(`/test/${data}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se ha podido iniciar el test. Inténtalo de nuevo.',
      )
      setStarting(null)
    }
  }

  if (isLoading) return <PageLoader label="Cargando modalidades de test…" />

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Hacer un test</h1>
        <p className="mt-1 text-sm text-ink-500">
          {templates?.length ?? 0} modalidades disponibles. Todas las preguntas incluyen la
          explicación y el artículo que la respalda.
        </p>
      </header>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="thin-scroll mb-7 flex gap-2 overflow-x-auto pb-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={clsx(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              category === c
                ? 'bg-brand-600 text-white'
                : 'bg-white text-ink-600 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800',
            )}
          >
            {c === 'todos' ? 'Todos' : CATEGORY_LABEL[c] ?? c}
          </button>
        ))}
      </div>

      <div className="space-y-9">
        {grouped.map(([cat, list]) => (
          <section key={cat}>
            <h2 className="mb-3.5 text-sm font-semibold uppercase tracking-wide text-ink-500">
              {CATEGORY_LABEL[cat] ?? cat}
            </h2>
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((t) => (
                <Card
                  key={t.id}
                  className="group flex flex-col p-5 transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                      <TemplateIcon name={t.icon} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold leading-tight">{t.name}</h3>
                    </div>
                  </div>

                  <p className="mb-4 flex-1 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
                    {t.description}
                  </p>

                  <div className="mb-4 flex flex-wrap gap-1.5">
                    <Badge>{t.question_count} preguntas</Badge>
                    {t.time_limit_sec && (
                      <Badge tone="warning">
                        <Clock className="h-3 w-3" />
                        {Math.round(t.time_limit_sec / 60)} min
                      </Badge>
                    )}
                    {t.max_failures !== null && (
                      <Badge tone="danger">
                        {t.max_failures === 0 ? 'Sin fallos' : `Máx. ${t.max_failures} fallos`}
                      </Badge>
                    )}
                    {t.instant_feedback && <Badge tone="success">Corrige al momento</Badge>}
                  </div>

                  <Button
                    onClick={() => start(t)}
                    loading={starting === t.code}
                    disabled={!!starting}
                    icon={<Play className="h-4 w-4" />}
                    className="w-full"
                  >
                    Empezar
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
