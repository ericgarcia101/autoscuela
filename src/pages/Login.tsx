import { useState, type FormEvent } from 'react'
import { GraduationCap, Mail, Lock, User, KeyRound } from 'lucide-react'
import { supabase, APP_NAME } from '@/lib/supabase'
import { Button, Card, Field } from '@/components/ui'

type Mode = 'signin' | 'signup' | 'reset'

export default function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        })
        if (error) throw error
        setNotice('Te hemos enviado un correo para restablecer la contraseña.')
        return
      }

      if (mode === 'signup') {
        // El código de la autoescuela es su `slug`. Se resuelve antes del alta
        // para que el trigger de la base de datos asigne el tenant correcto.
        let schoolId: string | null = null
        if (schoolCode.trim()) {
          const { data } = await supabase
            .from('schools')
            .select('id')
            .eq('slug', schoolCode.trim().toLowerCase())
            .maybeSingle()
          if (!data) throw new Error('El código de autoescuela no existe. Revísalo con tu academia.')
          schoolId = data.id
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, school_id: schoolId, role: 'student' } },
        })
        if (error) throw error
        setNotice('Cuenta creada. Revisa tu correo para confirmar la dirección.')
        return
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo ha ido mal. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 via-ink-50 to-white px-4 py-12 dark:from-ink-950 dark:via-ink-950 dark:to-ink-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{APP_NAME}</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {mode === 'signup'
              ? 'Crea tu cuenta de alumno'
              : mode === 'reset'
                ? 'Recupera el acceso a tu cuenta'
                : 'Accede para seguir preparando tu examen'}
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <Field label="Nombre y apellidos">
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      className="input pl-10"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                </Field>
                <Field
                  label="Código de tu autoescuela"
                  hint="Te lo facilita la academia al matricularte."
                >
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      className="input pl-10"
                      value={schoolCode}
                      onChange={(e) => setSchoolCode(e.target.value)}
                      placeholder="p. ej. autoescuela-centro"
                      required
                    />
                  </div>
                </Field>
              </>
            )}

            <Field label="Correo electrónico">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  className="input pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </Field>

            {mode !== 'reset' && (
              <Field
                label="Contraseña"
                hint={mode === 'signup' ? 'Mínimo 8 caracteres.' : undefined}
              >
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="password"
                    className="input pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                </div>
              </Field>
            )}

            {error && (
              <p className="mb-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                {error}
              </p>
            )}
            {notice && (
              <p className="mb-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                {notice}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {mode === 'signup' ? 'Crear cuenta' : mode === 'reset' ? 'Enviar enlace' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-5 space-y-2 text-center text-sm">
            {mode === 'signin' && (
              <>
                <button
                  className="text-brand-600 hover:underline dark:text-brand-400"
                  onClick={() => { setMode('signup'); setError(''); setNotice('') }}
                >
                  No tengo cuenta todavía
                </button>
                <br />
                <button
                  className="text-ink-500 hover:underline"
                  onClick={() => { setMode('reset'); setError(''); setNotice('') }}
                >
                  He olvidado mi contraseña
                </button>
              </>
            )}
            {mode !== 'signin' && (
              <button
                className="text-brand-600 hover:underline dark:text-brand-400"
                onClick={() => { setMode('signin'); setError(''); setNotice('') }}
              >
                Volver al inicio de sesión
              </button>
            )}
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-ink-400">
          Al continuar aceptas el tratamiento de tus datos conforme a la política de privacidad de tu
          autoescuela.
        </p>
      </div>
    </div>
  )
}
