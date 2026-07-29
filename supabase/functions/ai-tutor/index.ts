// ===========================================================================
// ai-tutor — Edge Function (Deno)
//
// Tutor de IA para el alumno. Tres decisiones de diseño importantes:
//
//   1. La clave del proveedor vive como secreto de la función, nunca en el
//      navegador. El cliente solo habla con esta función.
//   2. Si no hay clave configurada, o el proveedor falla, o el alumno agotó su
//      cuota, responde el MOTOR DETERMINISTA: explicaciones reales del banco de
//      preguntas + analítica de fallos. La app nunca se queda muda y el coste
//      base es 0 €.
//   3. El contexto se construye desde la base de datos (RAG sobre el banco de
//      preguntas con su artículo de referencia), así que el modelo cita
//      normativa concreta en lugar de improvisarla.
//
// Configuración (todo opcional):
//   supabase secrets set AI_PROVIDER=groq AI_API_KEY=gsk_... AI_MODEL=...
// ===========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DAILY_LIMIT = Number(Deno.env.get('AI_DAILY_LIMIT') ?? '40')

// ---------------------------------------------------------------------------
// Proveedores
//
// Contrato común: (prompt de sistema, historial) -> texto.
// Se usa HTTP directo en lugar de los SDK porque esta función habla con cuatro
// proveedores distintos y mezclar SDKs en un solo módulo Deno no aporta nada.
// ---------------------------------------------------------------------------
type ChatMessage = { role: 'user' | 'assistant'; content: string }

interface ProviderResult {
  text: string
  tokensIn: number
  tokensOut: number
  model: string
}

const DEFAULT_MODELS: Record<string, string> = {
  groq: 'llama-3.3-70b-versatile',
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-5',
  ollama: 'llama3.1:8b',
}

async function callGroqOrOpenAI(
  base: string,
  apiKey: string,
  model: string,
  system: string,
  history: ChatMessage[],
): Promise<ProviderResult> {
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: 900,
      temperature: 0.3,
      messages: [{ role: 'system', content: system }, ...history],
    }),
  })
  if (!res.ok) throw new Error(`${base} ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return {
    text: json.choices?.[0]?.message?.content ?? '',
    tokensIn: json.usage?.prompt_tokens ?? 0,
    tokensOut: json.usage?.completion_tokens ?? 0,
    model,
  }
}

async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  history: ChatMessage[],
): Promise<ProviderResult> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: 900, temperature: 0.3 },
    }),
  })
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return {
    text: json.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join('') ?? '',
    tokensIn: json.usageMetadata?.promptTokenCount ?? 0,
    tokensOut: json.usageMetadata?.candidatesTokenCount ?? 0,
    model,
  }
}

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  history: ChatMessage[],
): Promise<ProviderResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: 900, system, messages: history }),
  })
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return {
    text: json.content?.filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text).join('') ?? '',
    tokensIn: json.usage?.input_tokens ?? 0,
    tokensOut: json.usage?.output_tokens ?? 0,
    model,
  }
}

async function callOllama(
  host: string,
  model: string,
  system: string,
  history: ChatMessage[],
): Promise<ProviderResult> {
  const res = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'system', content: system }, ...history],
    }),
  })
  if (!res.ok) throw new Error(`ollama ${res.status}`)
  const json = await res.json()
  return { text: json.message?.content ?? '', tokensIn: 0, tokensOut: 0, model }
}

async function callProvider(
  system: string,
  history: ChatMessage[],
): Promise<ProviderResult | null> {
  const provider = (Deno.env.get('AI_PROVIDER') ?? '').toLowerCase()
  const apiKey = Deno.env.get('AI_API_KEY') ?? ''
  const model = Deno.env.get('AI_MODEL') || DEFAULT_MODELS[provider]

  if (!provider) return null
  if (provider !== 'ollama' && !apiKey) return null

  switch (provider) {
    case 'groq':
      return await callGroqOrOpenAI('https://api.groq.com/openai/v1', apiKey, model, system, history)
    case 'openai':
      return await callGroqOrOpenAI('https://api.openai.com/v1', apiKey, model, system, history)
    case 'gemini':
      return await callGemini(apiKey, model, system, history)
    case 'anthropic':
      return await callAnthropic(apiKey, model, system, history)
    case 'ollama':
      return await callOllama(Deno.env.get('OLLAMA_HOST') ?? 'http://localhost:11434', model, system, history)
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Motor determinista de respaldo
//
// No inventa nada: recorta y compone material que ya está en la base de datos
// (explicación de la pregunta + artículo) y la analítica real del alumno.
// Es lo que hace que la app siga siendo útil con coste 0 y sin alucinaciones.
// ---------------------------------------------------------------------------
interface Passage {
  text: string
  explanation: string
  legal_ref: string | null
  topic: string
}

function normalise(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const STOPWORDS = new Set([
  'que', 'como', 'para', 'por', 'con', 'los', 'las', 'del', 'una', 'uno', 'the',
  'cual', 'cuando', 'donde', 'esta', 'este', 'sobre', 'puedo', 'debo', 'hay',
  'me', 'mi', 'se', 'de', 'la', 'el', 'en', 'un', 'y', 'a', 'o', 'es', 'si',
])

function scorePassage(query: string, p: Passage): number {
  const terms = normalise(query).split(/\W+/).filter((t) => t.length > 2 && !STOPWORDS.has(t))
  if (terms.length === 0) return 0
  const haystack = normalise(`${p.text} ${p.explanation} ${p.topic} ${p.legal_ref ?? ''}`)
  let hits = 0
  for (const t of terms) if (haystack.includes(t)) hits++
  return hits / terms.length
}

function deterministicAnswer(query: string, passages: Passage[], weakTopics: string[]): string {
  const ranked = passages
    .map((p) => ({ p, score: scorePassage(query, p) }))
    .filter((x) => x.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  if (ranked.length === 0) {
    const weak = weakTopics.length
      ? `\n\nPor lo que veo en tus tests, donde más se te resiste el temario es en: ${weakTopics.slice(0, 3).join(', ')}. Un test de esos bloques te vendría bien.`
      : ''
    return (
      'No he encontrado nada en el temario que responda exactamente a eso. ' +
      'Prueba a preguntarme por un concepto concreto (por ejemplo: "velocidad máxima en autovía", ' +
      '"tasa de alcohol para noveles" o "prioridad en glorieta"), o escribe a tu profesor desde el chat de la autoescuela.' +
      weak
    )
  }

  const parts = ranked.map(({ p }) => {
    const ref = p.legal_ref ? ` _(${p.legal_ref})_` : ''
    return `**${p.topic}**\n${p.explanation}${ref}`
  })

  return (
    parts.join('\n\n') +
    '\n\n---\n_Respuesta compuesta a partir del temario de la autoescuela. ' +
    'Si necesitas que te lo expliquen con más detalle, escribe a tu profesor desde el chat._'
  )
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) {
      return json({ error: 'No autenticado' }, 401)
    }

    // Cliente con el JWT del alumno: sirve para identificarlo respetando RLS.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Sesión no válida' }, 401)

    const body = await req.json()
    const question: string = (body.message ?? '').toString().slice(0, 2000)
    const conversationId: string | null = body.conversation_id ?? null
    if (!question.trim()) return json({ error: 'Mensaje vacío' }, 400)

    // Cliente de servicio: escribe el mensaje de la IA (RLS impide que un
    // usuario inserte mensajes con author = 'ai').
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: profile } = await admin
      .from('profiles')
      .select('school_id, full_name, target_license, status')
      .eq('id', user.id)
      .single()

    // ---- Contexto: temario relevante + rendimiento real del alumno --------
    const terms = normalise(question).split(/\W+/).filter((t) => t.length > 3 && !STOPWORDS.has(t))
    const pattern = terms.length ? terms.slice(0, 6).join('|') : question.slice(0, 40)

    const { data: rows } = await admin
      .from('questions')
      .select('text, explanation, legal_ref, topics(name)')
      .eq('status', 'published')
      .or(`school_id.is.null,school_id.eq.${profile?.school_id ?? '00000000-0000-0000-0000-000000000000'}`)
      .or(`text.imatch.(${pattern}),explanation.imatch.(${pattern})`)
      .limit(12)

    const passages: Passage[] = (rows ?? []).map((r: Record<string, unknown>) => ({
      text: String(r.text ?? ''),
      explanation: String(r.explanation ?? ''),
      legal_ref: (r.legal_ref as string) ?? null,
      topic: (r.topics as { name?: string })?.name ?? 'Temario',
    }))

    const { data: readiness } = await admin.rpc('student_readiness', { p_student: user.id })
    const weakTopics: string[] = readiness?.weak_topics ?? []

    const { data: quotaLeft } = await admin.rpc('ai_quota_remaining', {
      p_student: user.id,
      p_daily_limit: DAILY_LIMIT,
    })

    // ---- Respuesta -------------------------------------------------------
    const startedAt = Date.now()
    let answer = ''
    let usedFallback = true
    let providerName = 'deterministic'
    let modelName = 'rules-v1'
    let tokensIn = 0
    let tokensOut = 0

    if ((quotaLeft ?? 0) > 0) {
      const system = buildSystemPrompt(profile, passages, readiness)
      const history: ChatMessage[] = [
        ...(Array.isArray(body.history) ? body.history.slice(-6) : []),
        { role: 'user', content: question },
      ]

      try {
        const result = await callProvider(system, history)
        if (result?.text) {
          answer = result.text
          usedFallback = false
          providerName = Deno.env.get('AI_PROVIDER') ?? 'unknown'
          modelName = result.model
          tokensIn = result.tokensIn
          tokensOut = result.tokensOut
        }
      } catch (err) {
        // Un proveedor caído no puede tumbar el chat: cae al motor local.
        console.error('proveedor de IA no disponible:', err)
      }
    }

    if (!answer) {
      answer = deterministicAnswer(question, passages, weakTopics)
    }

    // ---- Persistencia ----------------------------------------------------
    if (conversationId) {
      await admin.from('messages').insert({
        conversation_id: conversationId,
        author: 'ai',
        body: answer,
        citations: passages.slice(0, 3).map((p) => ({ ref: p.legal_ref, topic: p.topic })),
      })
    }

    await admin.from('ai_usage').insert({
      school_id: profile?.school_id ?? null,
      student_id: user.id,
      provider: providerName,
      model: modelName,
      kind: 'chat',
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      latency_ms: Date.now() - startedAt,
      fallback_used: usedFallback,
    })

    return json({
      answer,
      fallback_used: usedFallback,
      quota_remaining: Math.max(0, (quotaLeft ?? 0) - (usedFallback ? 0 : 1)),
      citations: passages.slice(0, 3).map((p) => ({ ref: p.legal_ref, topic: p.topic })),
    })
  } catch (err) {
    console.error(err)
    return json({ error: 'Error interno del tutor' }, 500)
  }
})

function buildSystemPrompt(
  profile: Record<string, unknown> | null,
  passages: Passage[],
  readiness: Record<string, unknown> | null,
): string {
  const context = passages.length
    ? passages.map((p, i) =>
      `[${i + 1}] Tema: ${p.topic}\nPregunta: ${p.text}\nExplicación: ${p.explanation}\nBase legal: ${p.legal_ref ?? 'n/d'}`
    ).join('\n\n')
    : '(sin material relevante en el banco de preguntas para esta consulta)'

  return `Eres el tutor de una autoescuela española. Ayudas a ${profile?.full_name ?? 'un alumno'} \
a preparar el permiso ${profile?.target_license ?? 'B'}.

REGLAS INNEGOCIABLES:
- Responde SOLO sobre normativa de circulación española y la preparación del examen de la DGT.
- Fundamenta cada afirmación en el MATERIAL DE APOYO. Si el material no cubre la pregunta, dilo \
claramente y sugiere consultar con el profesor. No inventes artículos, cifras ni sanciones.
- Cita el artículo cuando lo tengas (por ejemplo: "art. 48 RGC").
- No des consejos legales sobre casos personales ni sobre multas ya impuestas: para eso, el profesor.
- Español claro y directo. Máximo 200 palabras salvo que te pidan detalle.

MATERIAL DE APOYO:
${context}

ESTADO DEL ALUMNO:
- Índice de preparación: ${readiness?.readiness ?? 'n/d'} / 100
- Media reciente: ${readiness?.recent_average ?? 'n/d'} %
- Bloques flojos: ${(readiness?.weak_topics as string[])?.join(', ') || 'ninguno detectado todavía'}`
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  })
}
