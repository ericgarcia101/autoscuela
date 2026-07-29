import { useState, type FormEvent } from 'react'
import { KeyRound, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Card, Field } from '@/components/ui'
import type { LicenseClass } from '@/lib/types'

const LICENSES: LicenseClass[] = ['AM', 'A1', 'A2', 'A', 'B', 'C', 'D']

/**
 * Pantalla para cuentas que aún no están vinculadas a ninguna autoescuela
 * (p. ej. un alumno que se registró sin código o cuya academia lo cambió).
 */
export default function Onboarding() {
  const { profile, refreshProfile, signOut } = useAuth()
  const [code, setCode] = useState('')
  const [license, setLicense] = useState<LicenseClass>(profile?.target_license ?? 'B')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: school } = await supabase
        .from('schools')
        .select('id, is_active')
        .eq('slug', code.trim().toLowerCase())
        .maybeSingle()

      if (!school) throw new Error('No encontramos ninguna autoescuela con ese código.')
      if (!school.is_active) throw new Error('Esa autoescuela no está activa ahora mismo.')

      // El trigger `guard_profile_privileges` sólo bloquea el cambio de
      // autoescuela cuando ya hay una asignada, así que esta primera
      // vinculación es válida.
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ school_id: school.id, target_license: license })
        .eq('id', profile!.id)

      if (updateError) throw updateError
      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido vincular la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-ink-50 px-4 py-12 dark:bg-ink-950">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-bold">Vincula tu cuenta</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Hola {profile?.full_name || ''}. Introduce el código que te dio tu autoescuela para acceder
          a tus tests y a tu profesor.
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <Field label="Código de la autoescuela">
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                className="input pl-10"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="p. ej. autoescuela-centro"
                required
                autoFocus
              />
            </div>
          </Field>

          <Field label="¿Qué permiso vas a sacarte?">
            <select
              className="input"
              value={license}
              onChange={(e) => setLicense(e.target.value as LicenseClass)}
            >
              {LICENSES.map((l) => (
                <option key={l} value={l}>Permiso {l}</option>
              ))}
            </select>
          </Field>

          {error && (
            <p className="mb-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Entrar
          </Button>
        </form>

        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          icon={<LogOut className="h-4 w-4" />}
          className="mt-4 w-full"
        >
          Cerrar sesión
        </Button>
      </Card>
    </div>
  )
}
