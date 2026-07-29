import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import {
  BarChart3, BookOpen, CalendarDays, ClipboardList, CreditCard, GraduationCap,
  LayoutDashboard, LogOut, Menu, MessageSquare, Moon, Settings as SettingsIcon,
  Sparkles, Sun, TrendingUp, Users, X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, APP_LOGO } from '@/lib/supabase'
import { initials } from '@/lib/format'
import { Badge } from '@/components/ui'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  badgeKey?: 'messages' | 'tasks'
}

const STUDENT_NAV: NavItem[] = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard },
  { to: '/tests', label: 'Hacer un test', icon: ClipboardList },
  { to: '/progreso', label: 'Mi progreso', icon: TrendingUp },
  { to: '/historial', label: 'Historial', icon: BarChart3 },
  { to: '/temario', label: 'Temario', icon: BookOpen },
  { to: '/tutor', label: 'Tutor IA', icon: Sparkles },
  { to: '/mensajes', label: 'Mensajes', icon: MessageSquare, badgeKey: 'messages' },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
]

const STAFF_NAV: NavItem[] = [
  { to: '/', label: 'Panel', icon: LayoutDashboard },
  { to: '/alumnos', label: 'Alumnos', icon: Users },
  { to: '/mensajes', label: 'Mensajes', icon: MessageSquare, badgeKey: 'messages' },
  { to: '/tareas', label: 'Tareas asignadas', icon: ClipboardList },
  { to: '/preguntas', label: 'Banco de preguntas', icon: BookOpen },
  { to: '/analitica', label: 'Analítica', icon: BarChart3 },
  { to: '/cobros', label: 'Cobros', icon: CreditCard },
  { to: '/ajustes', label: 'Ajustes', icon: SettingsIcon },
]

function useDarkMode() {
  const [dark, setDark] = useState(
    () => localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches),
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])
  return [dark, setDark] as const
}

/** Contador de mensajes sin leer, en vivo. */
function useUnread(isStaff: boolean, userId: string | undefined, schoolId: string | null | undefined) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      const query = supabase.from('conversations').select('unread_for_student, unread_for_staff')
      const { data } = isStaff
        ? await query.eq('school_id', schoolId ?? '').eq('kind', 'support')
        : await query.eq('student_id', userId ?? '').eq('kind', 'support')

      if (cancelled) return
      const total = (data ?? []).reduce(
        (acc: number, row: { unread_for_student: number; unread_for_staff: number }) =>
          acc + (isStaff ? row.unread_for_staff : row.unread_for_student),
        0,
      )
      setCount(total)
    }

    load()
    const channel = supabase
      .channel('unread-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, load)
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [isStaff, userId, schoolId])

  return count
}

export default function Layout() {
  const { profile, school, signOut, isStaff } = useAuth()
  const [dark, setDark] = useDarkMode()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const unread = useUnread(isStaff, profile?.id, profile?.school_id)

  useEffect(() => setMobileOpen(false), [location.pathname])

  const nav = isStaff ? STAFF_NAV : STUDENT_NAV

  return (
    <div className="flex h-full bg-ink-50 dark:bg-ink-950">
      {/* Barra lateral */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-ink-200 bg-white',
          'transition-transform duration-200 dark:border-ink-800 dark:bg-ink-900',
          'lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          {APP_LOGO || school?.logo_url ? (
            <img
              src={school?.logo_url || APP_LOGO}
              alt=""
              className="h-9 w-9 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{school?.name ?? 'Autoescuela'}</p>
            <p className="text-xs text-ink-500">{isStaff ? 'Panel de gestión' : 'Área del alumno'}</p>
          </div>
          <button
            className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 lg:hidden dark:hover:bg-ink-800"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="thin-scroll flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {nav.map(({ to, label, icon: Icon, badgeKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                    : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
                )
              }
            >
              <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={2} />
              <span className="flex-1 truncate">{label}</span>
              {badgeKey === 'messages' && unread > 0 && (
                <Badge tone="danger">{unread > 99 ? '99+' : unread}</Badge>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-ink-200 p-3 dark:border-ink-800">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-200 text-sm font-semibold text-ink-700 dark:bg-ink-700 dark:text-ink-200">
              {initials(profile?.full_name || '?')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile?.full_name || 'Sin nombre'}</p>
              <p className="truncate text-xs text-ink-500">
                {isStaff ? 'Equipo' : `Permiso ${profile?.target_license ?? 'B'}`}
              </p>
            </div>
          </div>
          <div className="mt-1 flex gap-1">
            <button
              onClick={() => setDark(!dark)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {dark ? 'Claro' : 'Oscuro'}
            </button>
            <button
              onClick={signOut}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-ink-200 bg-white/80 px-4 py-3 backdrop-blur lg:hidden dark:border-ink-800 dark:bg-ink-900/80">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">{school?.name ?? 'Autoescuela'}</span>
        </header>

        <main className="thin-scroll flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
