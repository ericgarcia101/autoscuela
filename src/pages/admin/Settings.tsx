import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Check, Copy, Save, Send, Shield, Sparkles, UserPlus, Users,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { relative } from '@/lib/format'
import { Badge, Button, Card, Field, Modal, PageLoader } from '@/components/ui'
import type { Profile, UserRole } from '@/lib/types'

const ROLE_LABEL: Record<UserRole, string> = {
  student: 'Alumno',
  instructor: 'Profesor',
  admin: 'Administrador',
  owner: 'Titular',
}

export default function Settings() {
  const { school, profile, isAdmin, refreshProfile } = useAuth()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '',
    postal_code: '', province: '', tax_id: '', logo_url: '',
  })
  const [copied, setCopied] = useState(false)
  const [announceOpen, setAnnounceOpen] = useState(false)
  const [announcement, setAnnouncement] = useState({ title: '', body: '', pinned: false })

  useEffect(() => {
    if (school) {
      setForm({
        name: school.name ?? '',
        email: school.email ?? '',
        phone: school.phone ?? '',
        address: school.address ?? '',
        city: school.city ?? '',
        postal_code: school.postal_code ?? '',
        province: school.province ?? '',
        tax_id: school.tax_id ?? '',
        logo_url: school.logo_url ?? '',
      })
    }
  }, [school])

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('school_id', school!.id)
        .in('role', ['instructor', 'admin', 'owner'])
        .order('full_name')
      return (data ?? []) as Profile[]
    },
  })

  const saveSchool = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('schools')
        .update({
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          city: form.city || null,
          postal_code: form.postal_code || null,
          province: form.province || null,
          tax_id: form.tax_id || null,
          logo_url: form.logo_url || null,
        })
        .eq('id', school!.id)
      if (error) throw error
    },
    onSuccess: () => refreshProfile(),
  })

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  })

  const publish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('announcements').insert({
        school_id: school!.id,
        title: announcement.title.trim(),
        body: announcement.body.trim(),
        pinned: announcement.pinned,
        audience: 'students',
        created_by: profile!.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setAnnounceOpen(false)
      setAnnouncement({ title: '', body: '', pinned: false })
    },
  })

  function copyCode() {
    navigator.clipboard.writeText(school?.slug ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return <PageLoader />

  const trialLeft = school?.trial_ends_at
    ? Math.ceil((new Date(school.trial_ends_at).getTime() - Date.now()) / 864e5)
    : null

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="mt-1 text-sm text-ink-500">Datos de la academia, equipo y comunicación.</p>
      </header>

      {/* Código de invitación */}
      <Card className="p-5">
        <h2 className="mb-1.5 flex items-center gap-2 font-semibold">
          <UserPlus className="h-4.5 w-4.5" />
          Código de matriculación
        </h2>
        <p className="mb-4 text-sm text-ink-500">
          Dáselo a tus alumnos: lo introducen al registrarse y quedan vinculados a tu academia.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-xl bg-ink-100 px-4 py-2.5 font-mono text-lg font-semibold dark:bg-ink-800">
            {school?.slug}
          </code>
          <Button
            variant="secondary"
            onClick={copyCode}
            icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          >
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </Card>

      {/* Plan */}
      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <Shield className="h-4.5 w-4.5" />
          Plan contratado
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="brand">
            {school?.plan === 'trial' ? 'Prueba gratuita'
              : school?.plan === 'basic' ? 'Básico'
                : school?.plan === 'pro' ? 'Profesional' : 'Empresa'}
          </Badge>
          <span className="text-sm text-ink-500">
            Hasta {school?.seat_limit} alumnos activos
          </span>
          {school?.plan === 'trial' && trialLeft !== null && (
            <Badge tone={trialLeft <= 7 ? 'danger' : 'warning'}>
              {trialLeft > 0 ? `${trialLeft} días restantes` : 'Prueba caducada'}
            </Badge>
          )}
        </div>
      </Card>

      {/* Datos fiscales */}
      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <Building2 className="h-4.5 w-4.5" />
          Datos de la autoescuela
        </h2>

        {!isAdmin && (
          <p className="mb-4 rounded-xl bg-ink-100 px-3.5 py-2.5 text-sm text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            Sólo un administrador puede modificar estos datos.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre comercial">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={!isAdmin}
            />
          </Field>
          <Field label="CIF / NIF">
            <input
              className="input"
              value={form.tax_id}
              onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
              disabled={!isAdmin}
            />
          </Field>
          <Field label="Correo de contacto">
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={!isAdmin}
            />
          </Field>
          <Field label="Teléfono">
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              disabled={!isAdmin}
            />
          </Field>
          <Field label="Dirección">
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              disabled={!isAdmin}
            />
          </Field>
          <Field label="Ciudad">
            <input
              className="input"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              disabled={!isAdmin}
            />
          </Field>
          <Field label="Código postal">
            <input
              className="input"
              value={form.postal_code}
              onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
              disabled={!isAdmin}
            />
          </Field>
          <Field label="URL del logotipo" hint="Aparecerá en la barra lateral de tus alumnos.">
            <input
              className="input"
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              disabled={!isAdmin}
              placeholder="https://…"
            />
          </Field>
        </div>

        {isAdmin && (
          <Button
            onClick={() => saveSchool.mutate()}
            loading={saveSchool.isPending}
            icon={<Save className="h-4 w-4" />}
          >
            {saveSchool.isSuccess ? 'Guardado' : 'Guardar cambios'}
          </Button>
        )}
        {saveSchool.isError && (
          <p className="mt-3 text-sm text-rose-600">
            {(saveSchool.error as Error).message}
          </p>
        )}
      </Card>

      {/* Equipo */}
      <Card className="p-5">
        <h2 className="mb-1.5 flex items-center gap-2 font-semibold">
          <Users className="h-4.5 w-4.5" />
          Equipo
        </h2>
        <p className="mb-4 text-sm text-ink-500">
          Los profesores se registran como alumnos con el código de la academia y aquí les cambias
          el rol. Es la única vía: nadie puede auto-asignarse permisos.
        </p>

        <div className="divide-y divide-ink-200 dark:divide-ink-800">
          {staff?.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.full_name || 'Sin nombre'}</p>
                <p className="text-sm text-ink-500">
                  {s.email} · última conexión {relative(s.last_seen_at)}
                </p>
              </div>
              {isAdmin && s.id !== profile?.id ? (
                <select
                  className="input w-auto"
                  value={s.role}
                  onChange={(e) => changeRole.mutate({ id: s.id, role: e.target.value as UserRole })}
                >
                  <option value="student">Alumno</option>
                  <option value="instructor">Profesor</option>
                  <option value="admin">Administrador</option>
                  <option value="owner">Titular</option>
                </select>
              ) : (
                <Badge tone={s.role === 'owner' ? 'brand' : 'neutral'}>{ROLE_LABEL[s.role]}</Badge>
              )}
            </div>
          ))}
          {!staff?.length && (
            <p className="py-4 text-sm text-ink-500">Todavía no hay más miembros del equipo.</p>
          )}
        </div>
      </Card>

      {/* Anuncios */}
      <Card className="p-5">
        <h2 className="mb-1.5 flex items-center gap-2 font-semibold">
          <Send className="h-4.5 w-4.5" />
          Tablón de anuncios
        </h2>
        <p className="mb-4 text-sm text-ink-500">
          Publica un aviso que verán todos tus alumnos: cambios de horario, festivos, convocatorias.
        </p>
        <Button variant="secondary" onClick={() => setAnnounceOpen(true)}>
          Publicar anuncio
        </Button>
      </Card>

      {/* IA */}
      <Card className="p-5">
        <h2 className="mb-1.5 flex items-center gap-2 font-semibold">
          <Sparkles className="h-4.5 w-4.5" />
          Tutor con IA
        </h2>
        <p className="text-sm text-ink-500">
          El tutor funciona por defecto con el motor local (coste 0 €), que compone las respuestas
          a partir de las explicaciones del banco de preguntas. Para respuestas conversacionales,
          configura un proveedor como secreto de la Edge Function:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-ink-900 px-4 py-3 text-xs text-ink-100">
{`supabase secrets set AI_PROVIDER=groq AI_API_KEY=gsk_...`}
        </pre>
        <p className="mt-3 text-xs text-ink-400">
          La clave nunca llega al navegador. Cada alumno tiene una cuota diaria configurable con
          AI_DAILY_LIMIT.
        </p>
      </Card>

      <Modal
        open={announceOpen}
        onClose={() => setAnnounceOpen(false)}
        title="Publicar anuncio"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAnnounceOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => publish.mutate()}
              loading={publish.isPending}
              disabled={!announcement.title.trim() || !announcement.body.trim()}
            >
              Publicar
            </Button>
          </>
        }
      >
        <Field label="Título">
          <input
            className="input"
            value={announcement.title}
            onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
            placeholder="Cierre por festivo"
          />
        </Field>
        <Field label="Mensaje">
          <textarea
            className="input min-h-[110px] resize-y"
            value={announcement.body}
            onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })}
          />
        </Field>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={announcement.pinned}
            onChange={(e) => setAnnouncement({ ...announcement, pinned: e.target.checked })}
            className="h-4 w-4 accent-brand-600"
          />
          Fijar en lo alto del tablón
        </label>
        {publish.isError && (
          <p className="mt-3 text-sm text-rose-600">{(publish.error as Error).message}</p>
        )}
      </Modal>
    </div>
  )
}
