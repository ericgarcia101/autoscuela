// ===========================================================================
// notify-lesson — Edge Function (Deno)
//
// Avisa al alumno de una clase práctica recién programada.
//
// Dos canales, en este orden de importancia:
//   1. Fila en `notifications`. Siempre se crea y no depende de nadie externo.
//      Ojo: hoy la app no tiene aún pantalla que las muestre; el alumno ve la
//      clase en su agenda y en su panel de inicio. La fila queda registrada
//      para cuando exista el centro de notificaciones.
//   2. Correo electrónico, sólo si hay RESEND_API_KEY configurada. Sin clave
//      la función no falla: responde `emailed: false` y el panel lo indica.
//
// Configuración del correo (opcional):
//   supabase secrets set RESEND_API_KEY=re_...
//   supabase secrets set LESSON_FROM="Autoescuela <avisos@tudominio.com>"
//
// Ojo con el remitente: Resend sólo permite enviar desde un dominio que hayas
// verificado. Sin dominio propio se puede usar onboarding@resend.dev, que vale
// para pruebas pero sólo entrega a tu propia dirección.
// ===========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FROM = Deno.env.get('LESSON_FROM') ?? 'Autoescuela <onboarding@resend.dev>'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  })
}

/** Fecha y hora en castellano, en la zona horaria de la autoescuela. */
function formatWhen(iso: string, timeZone: string) {
  const d = new Date(iso)
  const fecha = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone,
  }).format(d)
  const hora = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit', minute: '2-digit', timeZone,
  }).format(d)
  return { fecha, hora }
}

function emailHtml(opts: {
  studentName: string
  schoolName: string
  fecha: string
  hora: string
  duration: number
  pickup: string | null
  note: string | null
}) {
  const { studentName, schoolName, fecha, hora, duration, pickup, note } = opts
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 0;color:#64748b;font-size:14px;">${label}</td>
      <td style="padding:6px 0;font-size:14px;font-weight:600;color:#0f172a;">${value}</td>
    </tr>`

  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border-radius:16px;padding:28px;">
      <p style="margin:0 0 4px;font-size:13px;color:#2563eb;font-weight:600;">${schoolName}</p>
      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Tienes clase práctica</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
        Hola${studentName ? ` ${studentName}` : ''}, te hemos programado una clase de conducción.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${row('Día', fecha)}
        ${row('Hora', hora)}
        ${row('Duración', `${duration} minutos`)}
        ${pickup ? row('Punto de recogida', pickup) : ''}
      </table>
      ${note ? `<p style="margin:0 0 20px;padding:12px 14px;background:#f8fafc;border-radius:10px;font-size:14px;color:#334155;">${note}</p>` : ''}
      <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
        Si no puedes asistir, avísanos con antelación desde el chat de la app.
      </p>
    </div>
  </div>
</body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'No autenticado' }, 401)

    // Cliente con el JWT de quien llama: identifica al usuario respetando RLS.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Sesión no válida' }, 401)

    const body = await req.json()
    const lessonId: string | null = body.lesson_id ?? null
    if (!lessonId) return json({ error: 'Falta lesson_id' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Sólo personal de la autoescuela puede avisar, y sólo de sus clases.
    const { data: caller } = await admin
      .from('profiles')
      .select('school_id, role')
      .eq('id', user.id)
      .single()

    if (!caller || !['instructor', 'admin', 'owner'].includes(caller.role)) {
      return json({ error: 'Sin permiso' }, 403)
    }

    const { data: lesson } = await admin
      .from('lessons')
      .select('id, school_id, student_id, starts_at, duration_min, pickup_point, student_visible_notes')
      .eq('id', lessonId)
      .single()

    if (!lesson) return json({ error: 'Clase no encontrada' }, 404)
    if (lesson.school_id !== caller.school_id) return json({ error: 'Sin permiso' }, 403)

    const [{ data: student }, { data: school }] = await Promise.all([
      admin.from('profiles').select('full_name, email').eq('id', lesson.student_id).single(),
      admin.from('schools').select('name, settings').eq('id', lesson.school_id).single(),
    ])

    // `settings` es el cajón de configuración por autoescuela; si algún día se
    // vende fuera de la península, basta con guardar ahí su zona horaria.
    const timeZone = (school?.settings as { timezone?: string } | null)?.timezone
      || 'Europe/Madrid'
    const { fecha, hora } = formatWhen(lesson.starts_at, timeZone)
    const firstName = (student?.full_name ?? '').split(' ')[0] ?? ''

    // --- 1. Aviso dentro de la app (siempre) ------------------------------
    await admin.from('notifications').insert({
      school_id: lesson.school_id,
      user_id: lesson.student_id,
      kind: 'lesson',
      title: 'Nueva clase práctica',
      body: `${fecha} a las ${hora}`
        + (lesson.pickup_point ? ` · Recogida en ${lesson.pickup_point}` : ''),
      link: '/agenda',
    })

    // --- 2. Correo (sólo si hay proveedor configurado) ---------------------
    const apiKey = Deno.env.get('RESEND_API_KEY')
    const to = student?.email

    if (!apiKey) {
      return json({ ok: true, emailed: false, reason: 'sin_proveedor' })
    }
    if (!to) {
      return json({ ok: true, emailed: false, reason: 'alumno_sin_correo' })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: `Clase práctica el ${fecha} a las ${hora}`,
        html: emailHtml({
          studentName: firstName,
          schoolName: school?.name ?? 'Tu autoescuela',
          fecha,
          hora,
          duration: lesson.duration_min,
          pickup: lesson.pickup_point,
          note: lesson.student_visible_notes,
        }),
      }),
    })

    if (!res.ok) {
      // El aviso in-app ya está puesto: se informa del fallo sin romper el alta.
      return json({ ok: true, emailed: false, reason: await res.text() })
    }

    return json({ ok: true, emailed: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error inesperado' }, 500)
  }
})
