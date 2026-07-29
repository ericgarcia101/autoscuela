# Plataforma para autoescuelas

Aplicación web para autoescuelas: tests de teórica, seguimiento del alumno,
chat con la academia, tutor de IA y panel de gestión.

**Arquitectura:** SPA estática (React + Vite) + Supabase (Postgres, Auth,
Realtime, Edge Functions). Sin servidor propio que mantener y con coste 0 € en
el plan gratuito de Supabase y en cualquier hosting estático.

---

## Lo primero: qué es y qué no es este banco de preguntas

**Las preguntas incluidas NO son preguntas reales de exámenes de la DGT.**

La DGT no publica su banco oficial de exámenes. Lo que circula por internet como
«preguntas del último examen» son reconstrucciones de terceros protegidas por
derechos de autor: incorporarlas sin licencia expone legalmente a la autoescuela
que use la app.

Lo que sí trae este proyecto:

- **165 preguntas redactadas sobre el articulado vigente**, cada una con su
  referencia legal (`Art. 48 RGC`, `Anexo II LSV`, …) para que cualquiera pueda
  auditar la respuesta contra la fuente. Cubren los 15 bloques del temario y
  recogen las reformas recientes: límites urbanos del RD 970/2020, puntos de la
  Ley 18/2021 y baliza V-16 obligatoria desde el 1 de enero de 2026.
- **Un importador CSV** para que la autoescuela cargue su propio banco con
  licencia, con validación, previsualización y una declaración de derechos que
  queda registrada con usuario y fecha.
- **Un editor** en el panel para redactar preguntas propias.

El banco base es un punto de partida defendible y ampliable, no un sustituto de
material con licencia.

---

## Puesta en marcha

### 1. Crear el proyecto de Supabase

En [supabase.com](https://supabase.com) crea un proyecto (plan gratuito).
Copia la URL y la clave `anon` desde **Project Settings → API**.

### 2. Configurar el entorno

```bash
cp .env.example .env
```

Rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

### 3. Aplicar el esquema

Con la CLI de Supabase:

```bash
npx supabase link --project-ref <tu-ref>
npx supabase db push
```

O, sin CLI, pegando los archivos de `supabase/migrations/` **en orden numérico**
en el SQL Editor del panel de Supabase.

### 4. Crear la autoescuela y su titular

En el SQL Editor:

```sql
select create_school('Autoescuela Centro', 'autoescuela-centro', 'B12345678');
```

Regístrate desde la app con ese código (`autoescuela-centro`) y después
promociónate a titular:

```sql
select promote_to_owner('tu-correo@ejemplo.com', 'autoescuela-centro');
```

Recarga la app: ya verás el panel de gestión.

### 5. Arrancar

```bash
npm install
npm run dev
```

---

## Despliegue

La app compila a ficheros estáticos, así que sirve cualquier hosting.

```bash
npm run build      # genera dist/
```

**Vercel / Netlify / Cloudflare Pages:** conecta el repositorio, comando de
build `npm run build`, directorio de salida `dist`, y añade las dos variables
`VITE_SUPABASE_*`. Configura una regla de reescritura de `/*` a `/index.html`
(la app usa rutas de cliente).

### Edge Function del tutor

```bash
npx supabase functions deploy ai-tutor
```

Funciona sin configuración adicional: sin clave de proveedor, responde el motor
determinista local.

---

## El tutor de IA y su coste

La app **nunca deja de funcionar por falta de IA**. Hay dos motores:

1. **Motor determinista (por defecto, 0 €).** Busca en el banco de preguntas por
   coincidencia de términos y compone la respuesta con las explicaciones y los
   artículos reales que ya están en la base de datos, más la analítica de fallos
   del alumno. No inventa nada porque no genera texto nuevo.

2. **Modelo de lenguaje (opcional).** Si configuras un proveedor, el tutor
   responde de forma conversacional, pero con el banco de preguntas inyectado
   como contexto y con instrucciones de no salirse de él.

```bash
# Groq tiene free tier generoso y no pide tarjeta
npx supabase secrets set AI_PROVIDER=groq AI_API_KEY=gsk_...

# Alternativas
npx supabase secrets set AI_PROVIDER=gemini AI_API_KEY=...      # free tier de Google
npx supabase secrets set AI_PROVIDER=openai AI_API_KEY=sk-...   # de pago
npx supabase secrets set AI_PROVIDER=anthropic AI_API_KEY=...   # de pago
npx supabase secrets set AI_PROVIDER=ollama OLLAMA_HOST=http://tu-servidor:11434
```

La clave vive como secreto de la Edge Function: **nunca llega al navegador**.
Cada alumno tiene una cuota diaria (`AI_DAILY_LIMIT`, 40 por defecto) y, al
agotarla, vuelve automáticamente al motor determinista. El consumo queda
registrado en la tabla `ai_usage`.

---

## Qué incluye

### Para el alumno

- **59 modalidades de test**: simulacros de examen oficial (B, AM, A1, A2, C, D,
  BTP), 15 tests de temario, 9 de señales, personalizados según su historial
  (fallos, puntos débiles, repaso espaciado, preguntas nuevas, marcadas),
  retos (muerte súbita, contrarreloj, maratón de 100, reto diario) y práctica libre.
- **Reproductor de test** con temporizador, tope de fallos, corrección inmediata
  opcional, marcado de preguntas, cuadrícula de navegación y atajos de teclado.
- **Revisión completa** tras cada test, con la explicación y el artículo de cada
  pregunta fallada.
- **Índice de preparación** que cruza nota reciente, cobertura del temario y
  constancia para responder a «¿estoy listo para examinarme?».
- Gráficas de evolución, radar de dominio por bloque, rachas y logros.
- Chat con la autoescuela en tiempo real y tutor de IA.
- Agenda de clases prácticas, convocatorias de examen y estado de cuenta.

### Para la autoescuela

- Panel con alumnos activos, listos para examinarse, mensajes sin leer y cobros
  pendientes, más avisos accionables (alumnos parados, recibos vencidos).
- **Asignación de tests a medida**: elige modalidad, estrategia de selección
  (fallos, puntos débiles, repaso espaciado…), bloques del temario, número de
  preguntas, dificultad, fecha límite e intentos. A un alumno o a varios a la vez.
- Bandeja de mensajes en tiempo real.
- Ficha del alumno: nivel por bloque, historial, tareas, clases, exámenes,
  pagos y nota interna.
- Analítica: actividad diaria, nota media, **ranking de preguntas más falladas**
  (lo que conviene reforzar en clase teórica) y alumnos en riesgo.
- Banco de preguntas con editor e importador CSV.
- Registro de cobros con exportación a CSV.
- Gestión de equipo por roles y tablón de anuncios.

---

## Decisiones de seguridad

Merece la pena conocerlas si vas a tocar el código:

- **Multi-tenant con RLS en todas las tablas.** Un alumno sólo ve lo suyo; el
  staff, sólo lo de su autoescuela. Sin política que lo permita, no se pasa.
- **Las respuestas correctas no salen del servidor.** RLS filtra filas, no
  columnas, así que se revoca el `SELECT` de tabla sobre `questions` y se vuelve
  a conceder columna a columna sin `correct_index` ni `explanation`. Un alumno
  no puede leer las respuestas por la API aunque use la clave anónima
  directamente (`0015_column_security.sql`).
- **La corrección ocurre en el servidor.** `submit_answer()` es el único camino
  por el que el cliente descubre si acertó.
- **Nadie puede auto-asignarse permisos.** El trigger de alta fuerza el rol
  `student` aunque se manipulen los metadatos del `signUp`; sólo un admin puede
  cambiar roles, y un trigger impide modificarse el rol o saltar de autoescuela.
- **Los mensajes de la IA los inserta la Edge Function** con la clave de
  servicio. La política de RLS impide que un usuario escriba mensajes firmados
  como `ai`.

---

## Estructura

```
supabase/
├── migrations/          # esquema, RLS, motor de tests, banco de preguntas
└── functions/ai-tutor/  # proxy multi-proveedor + motor determinista
src/
├── components/          # kit de UI, layout, chat, modales
├── hooks/               # sesión, conversaciones en tiempo real
├── lib/                 # cliente de Supabase, tipos, formateo
└── pages/
    ├── student/         # área del alumno
    └── admin/           # panel de gestión
```

---

## Comandos

```bash
npm run dev         # servidor de desarrollo
npm run build       # compila a dist/
npm run typecheck   # comprobación de tipos
npm run db:push     # aplica migraciones (requiere CLI enlazada)
```

---

## Antes de vender la app

Cosas que hay que resolver fuera del código:

1. **Contenido**: revisa el banco base con un profesor titulado y decide si
   licenciar material adicional.
2. **RGPD**: la app trata datos de menores y datos identificativos. Necesitas
   política de privacidad, registro de actividades de tratamiento y un contrato
   de encargado de tratamiento con Supabase.
3. **Copias de seguridad**: el plan gratuito de Supabase no incluye backups
   automáticos. Programa un `pg_dump` periódico o sube de plan.
4. **Región**: crea el proyecto de Supabase en la UE (`eu-central-1` o
   `eu-west-*`) para no sacar los datos del EEE.
