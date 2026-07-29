import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, School } from '@/lib/types'

interface AuthValue {
  session: Session | null
  profile: Profile | null
  school: School | null
  loading: boolean
  isStaff: boolean
  isAdmin: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    setProfile(prof as Profile | null)

    if (prof?.school_id) {
      const { data: sch } = await supabase
        .from('schools')
        .select('*')
        .eq('id', prof.school_id)
        .maybeSingle()
      setSchool(sch as School | null)
    } else {
      setSchool(null)
    }
  }

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session?.user) await loadProfile(data.session.user.id)
      if (active) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return
      setSession(newSession)
      if (newSession?.user) {
        await loadProfile(newSession.user.id)
      } else {
        setProfile(null)
        setSchool(null)
      }
      setLoading(false)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Marca de presencia: alimenta la columna "última conexión" del panel del admin
  useEffect(() => {
    if (!session?.user) return
    const ping = () =>
      supabase.from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', session.user.id)
        .then(undefined, () => {})
    ping()
    const id = setInterval(ping, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [session?.user?.id])

  const value = useMemo<AuthValue>(() => ({
    session,
    profile,
    school,
    loading,
    isStaff: !!profile && ['instructor', 'admin', 'owner'].includes(profile.role),
    isAdmin: !!profile && ['admin', 'owner'].includes(profile.role),
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id)
    },
    signOut: async () => {
      await supabase.auth.signOut()
      setProfile(null)
      setSchool(null)
    },
  }), [session, profile, school, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
