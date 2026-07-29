import { useState } from 'react'
import { AlertTriangle, FileUp, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Badge, Button, Card, Field, Modal } from '@/components/ui'
import type { Topic } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  schoolId: string
  topics: Topic[]
  onDone?: () => void
}

interface ParsedRow {
  line: number
  topic_code: string
  text: string
  options: string[]
  correct_index: number
  explanation: string
  legal_ref: string | null
  difficulty: number
  error?: string
}

const HEADERS = [
  'tema', 'pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d',
  'correcta', 'explicacion', 'articulo', 'dificultad',
]

const TEMPLATE = `${HEADERS.join(';')}
senales;¿Qué indica una señal triangular de fondo blanco y borde rojo?;Advertencia de peligro;Prohibición;Obligación;;A;Las triangulares con borde rojo advierten de un peligro próximo.;Art. 149 RGC;1`

/** Divide una línea CSV respetando comillas dobles. */
function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === delim && !inQuotes) {
      out.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

export default function ImportQuestionsModal({ open, onClose, schoolId, topics, onDone }: Props) {
  const { profile } = useAuth()
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [filename, setFilename] = useState('')
  const [licenseAck, setLicenseAck] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [error, setError] = useState('')

  function parse(csv: string) {
    setError('')
    setResult(null)

    const lines = csv.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) { setError('El archivo no tiene filas de datos.'); return }

    // El delimitador se detecta del encabezado: Excel en España exporta con ";"
    const delim = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ';' : ','
    const header = splitCsvLine(lines[0], delim).map((h) => h.toLowerCase())

    const col = (name: string) => header.indexOf(name)
    if (col('pregunta') === -1 || col('correcta') === -1) {
      setError(`Faltan columnas obligatorias. El encabezado debe incluir: ${HEADERS.join(', ')}`)
      return
    }

    const validCodes = new Set(topics.map((t) => t.code))
    const parsed: ParsedRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const c = splitCsvLine(lines[i], delim)
      const get = (name: string) => (col(name) >= 0 ? (c[col(name)] ?? '') : '')

      const options = ['opcion_a', 'opcion_b', 'opcion_c', 'opcion_d']
        .map(get)
        .filter(Boolean)

      const rawCorrect = get('correcta').toUpperCase()
      const correct = /^[A-D]$/.test(rawCorrect)
        ? rawCorrect.charCodeAt(0) - 65
        : Number(rawCorrect) - 1

      const topicCode = get('tema').toLowerCase()

      const row: ParsedRow = {
        line: i + 1,
        topic_code: topicCode,
        text: get('pregunta'),
        options,
        correct_index: correct,
        explanation: get('explicacion'),
        legal_ref: get('articulo') || null,
        difficulty: Math.min(5, Math.max(1, Number(get('dificultad')) || 2)),
      }

      if (!row.text) row.error = 'Enunciado vacío'
      else if (options.length < 2) row.error = 'Necesita al menos dos opciones'
      else if (Number.isNaN(correct) || correct < 0 || correct >= options.length) {
        row.error = 'La respuesta correcta no es válida (usa A, B, C o D)'
      } else if (!validCodes.has(topicCode)) {
        row.error = `Bloque desconocido: "${topicCode}"`
      }

      parsed.push(row)
    }

    setRows(parsed)
  }

  async function runImport() {
    const valid = rows.filter((r) => !r.error)
    if (!valid.length) return

    setImporting(true)
    setError('')
    try {
      const topicByCode = new Map(topics.map((t) => [t.code, t.id]))

      const payload = valid.map((r) => ({
        school_id: schoolId,
        topic_id: topicByCode.get(r.topic_code)!,
        text: r.text,
        options: r.options,
        correct_index: r.correct_index,
        explanation: r.explanation,
        legal_ref: r.legal_ref,
        difficulty: r.difficulty,
        source: 'school' as const,
        status: 'published' as const,
        created_by: profile!.id,
      }))

      // Se insertan por lotes: Supabase limita el tamaño de la petición.
      let imported = 0
      for (let i = 0; i < payload.length; i += 200) {
        const { error: insertError } = await supabase
          .from('questions')
          .insert(payload.slice(i, i + 200))
        if (insertError) throw insertError
        imported += Math.min(200, payload.length - i)
      }

      await supabase.from('question_imports').insert({
        school_id: schoolId,
        filename,
        total_rows: rows.length,
        imported,
        skipped: rows.length - imported,
        errors: rows.filter((r) => r.error).map((r) => ({ line: r.line, error: r.error })),
        license_ack: licenseAck,
        created_by: profile!.id,
      })

      setResult({ imported, skipped: rows.length - imported })
      onDone?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La importación ha fallado.')
    } finally {
      setImporting(false)
    }
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob(['﻿' + TEMPLATE], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-preguntas.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const validCount = rows.filter((r) => !r.error).length
  const errorRows = rows.filter((r) => r.error)

  return (
    <Modal
      open={open}
      onClose={() => { setRows([]); setResult(null); setError(''); onClose() }}
      wide
      title="Importar preguntas desde CSV"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button
            onClick={runImport}
            loading={importing}
            disabled={!validCount || !licenseAck || !!result}
            icon={<Upload className="h-4 w-4" />}
          >
            Importar {validCount || ''} preguntas
          </Button>
        </>
      }
    >
      {result ? (
        <div className="py-6 text-center">
          <p className="text-lg font-semibold text-emerald-600">
            {result.imported} preguntas importadas
          </p>
          {result.skipped > 0 && (
            <p className="mt-1 text-sm text-ink-500">{result.skipped} filas descartadas por errores.</p>
          )}
        </div>
      ) : (
        <>
          <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Sube sólo material sobre el que tengas derechos. Las preguntas de exámenes oficiales
              de la DGT están protegidas y no pueden reproducirse sin licencia.
            </p>
          </div>

          <Field
            label="Archivo CSV"
            hint={`Columnas esperadas: ${HEADERS.join(', ')}. Separador ; o ,`}
          >
            <div className="flex flex-wrap gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800">
                <FileUp className="h-4 w-4" />
                {filename || 'Elegir archivo…'}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setFilename(file.name)
                    file.text().then(parse)
                  }}
                />
              </label>
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                Descargar plantilla
              </Button>
            </div>
          </Field>

          {rows.length > 0 && (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Badge tone="success">{validCount} válidas</Badge>
                {errorRows.length > 0 && <Badge tone="danger">{errorRows.length} con errores</Badge>}
              </div>

              {errorRows.length > 0 && (
                <Card className="mb-4 max-h-40 overflow-y-auto p-3.5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Filas descartadas
                  </p>
                  <ul className="space-y-1 text-sm text-rose-600">
                    {errorRows.slice(0, 20).map((r) => (
                      <li key={r.line}>Línea {r.line}: {r.error}</li>
                    ))}
                    {errorRows.length > 20 && (
                      <li className="text-ink-400">…y {errorRows.length - 20} más</li>
                    )}
                  </ul>
                </Card>
              )}

              {validCount > 0 && (
                <Card className="mb-4 max-h-48 overflow-y-auto p-3.5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Vista previa
                  </p>
                  <ul className="space-y-2 text-sm">
                    {rows.filter((r) => !r.error).slice(0, 5).map((r) => (
                      <li key={r.line} className="border-b border-ink-100 pb-2 dark:border-ink-800">
                        <p className="font-medium">{r.text}</p>
                        <p className="text-xs text-emerald-600">
                          ✓ {r.options[r.correct_index]}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={licenseAck}
                  onChange={(e) => setLicenseAck(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-brand-600"
                />
                <span className="text-ink-600 dark:text-ink-300">
                  Confirmo que la autoescuela tiene derecho a usar este material y asume la
                  responsabilidad de su contenido. Queda registrado con mi usuario y la fecha.
                </span>
              </label>
            </>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </p>
          )}
        </>
      )}
    </Modal>
  )
}
