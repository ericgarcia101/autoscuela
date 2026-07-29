-- ===========================================================================
-- 0016_bootstrap.sql — Puesta en marcha de una autoescuela
--
-- Da de alta el tenant y convierte a un usuario ya registrado en su titular.
-- Es la única pieza que se ejecuta manualmente: todo lo demás se gestiona
-- desde el panel.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- create_school() — alta de una autoescuela
--
-- Uso desde el SQL Editor de Supabase:
--   select create_school('Autoescuela Centro', 'autoescuela-centro', 'B12345678');
--
-- Devuelve el id del tenant. El `slug` es el código que los alumnos escriben
-- al registrarse, así que conviene que sea corto y fácil de dictar.
-- ---------------------------------------------------------------------------
create or replace function create_school(
  p_name   text,
  p_slug   text,
  p_tax_id text default null,
  p_plan   subscription_plan default 'trial',
  p_seats  int default 25
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_slug !~ '^[a-z0-9][a-z0-9-]{2,40}$' then
    raise exception 'El código debe ser minúsculas, números y guiones (3-41 caracteres)';
  end if;

  insert into schools (name, slug, tax_id, plan, seat_limit)
  values (p_name, lower(p_slug), p_tax_id, p_plan, p_seats)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function create_school(text, text, text, subscription_plan, int)
  from authenticated, anon;

-- ---------------------------------------------------------------------------
-- promote_to_owner() — convierte un usuario existente en titular
--
-- El usuario debe haberse registrado antes por la pantalla normal de alta.
-- Uso:
--   select promote_to_owner('admin@autoescuela.com', 'autoescuela-centro');
-- ---------------------------------------------------------------------------
create or replace function promote_to_owner(p_email text, p_school_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid;
  v_school uuid;
begin
  select id into v_school from schools where slug = lower(p_school_slug);
  if v_school is null then
    raise exception 'No existe ninguna autoescuela con el código "%"', p_school_slug;
  end if;

  select id into v_user from auth.users where lower(email) = lower(p_email);
  if v_user is null then
    raise exception 'No hay ningún usuario registrado con el correo "%". '
                    'Regístralo primero desde la pantalla de alta.', p_email;
  end if;

  update profiles
     set role = 'owner', school_id = v_school, status = 'graduated'
   where id = v_user;
end;
$$;

revoke execute on function promote_to_owner(text, text) from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Material de estudio de ejemplo, uno por bloque del temario.
-- Es contenido global (school_id NULL) para que una autoescuela recién creada
-- no arranque con el temario vacío.
-- ---------------------------------------------------------------------------
insert into study_materials (school_id, topic_id, title, kind, content, position)
select null, t.id, v.title, 'article', v.body, 1
from (values
  ('velocidad-distancias', 'Resumen de límites de velocidad',
   E'LÍMITES GENÉRICOS (turismos y motocicletas)\n\n'
   '· Autopista y autovía: 120 km/h (mínimo 60 km/h).\n'
   '· Carretera convencional: 90 km/h, con arcén o sin él.\n'
   '· Vía urbana con dos o más carriles por sentido: 50 km/h.\n'
   '· Vía urbana de un solo carril por sentido: 30 km/h.\n'
   '· Vía urbana de plataforma única: 20 km/h.\n\n'
   'OTROS VEHÍCULOS EN AUTOPISTA\n'
   '· Autobuses: 100 km/h.\n'
   '· Camiones y vehículos con remolque: 90 km/h.\n'
   '· Ciclomotores: 45 km/h como máximo en cualquier vía.\n\n'
   'DISTANCIA DE SEGURIDAD\n'
   'Usa la regla de los dos segundos: toma una referencia fija y comprueba que '
   'pasan al menos dos segundos entre que la rebasa el de delante y la rebasas tú. '
   'Con lluvia o niebla, dóblala.\n\n'
   'Recuerda que la distancia de frenado crece con el CUADRADO de la velocidad: '
   'al doblar la velocidad, necesitas cuatro veces más espacio para parar.\n\n'
   'Base legal: arts. 45 a 54 del Reglamento General de Circulación.'),

  ('alcohol-drogas', 'Tasas de alcohol de un vistazo',
   E'TASAS MÁXIMAS PERMITIDAS\n\n'
   'Conductor general (más de 2 años de permiso):\n'
   '· 0,25 mg/l en aire espirado\n'
   '· 0,5 g/l en sangre\n\n'
   'Conductor novel (menos de 2 años) y profesionales:\n'
   '· 0,15 mg/l en aire espirado\n'
   '· 0,3 g/l en sangre\n\n'
   'También se aplica la tasa reducida a quienes conducen vehículos de más de '
   '3.500 kg, de más de 9 plazas, de servicio público, de transporte escolar, '
   'de mercancías peligrosas y de urgencia.\n\n'
   'CUÁNDO ES DELITO\n'
   'Por encima de 0,60 mg/l en aire (1,2 g/l en sangre) deja de ser una '
   'infracción administrativa y pasa a ser delito contra la seguridad vial '
   '(art. 379.2 del Código Penal). Negarse a soplar también es delito (art. 383).\n\n'
   'DROGAS\n'
   'Tolerancia cero: basta con que la sustancia esté presente en el organismo.\n\n'
   'Ningún remedio casero acelera la eliminación del alcohol. Sólo el tiempo, '
   'a razón de unos 0,15 g/l por hora.'),

  ('senales', 'Cómo leer una señal por su forma y color',
   E'POR LA FORMA\n\n'
   '· Triángulo con el vértice arriba, borde rojo → advertencia de PELIGRO.\n'
   '· Triángulo con el vértice abajo → CEDA EL PASO.\n'
   '· Octógono → STOP. Es la única señal octogonal, para reconocerla aunque esté '
   'sucia o nevada.\n'
   '· Círculo → reglamentación (prohibición u obligación).\n'
   '· Cuadrado o rectángulo → indicación, servicio u orientación.\n\n'
   'POR EL COLOR\n\n'
   '· Fondo blanco con borde rojo → prohibición o restricción.\n'
   '· Fondo azul → obligación (si es circular) o indicación (si es cuadrada).\n'
   '· Fondo amarillo → señalización de obras o circunstancial.\n\n'
   'ORDEN DE PREVALENCIA (art. 132 RGC)\n'
   'Cuando dos señales se contradicen, manda en este orden:\n'
   '1. Agentes de circulación\n'
   '2. Señalización circunstancial (obras, accidentes)\n'
   '3. Semáforos\n'
   '4. Señales verticales\n'
   '5. Marcas viales\n\n'
   'Memoriza este orden: cae en el examen con mucha frecuencia.'),

  ('sanciones', 'Permiso por puntos: lo esencial',
   E'SALDO DE PUNTOS\n\n'
   '· Al obtener el primer permiso: 8 puntos.\n'
   '· A los 2 años sin sanciones firmes: 12 puntos.\n'
   '· 3 años más sin perder puntos: 14 puntos.\n'
   '· Otros 3 años: 15 puntos (máximo posible).\n\n'
   'INFRACCIONES QUE MÁS PUNTOS QUITAN (reforma vigente desde 21/03/2022)\n\n'
   '6 puntos:\n'
   '· Usar el móvil sujetándolo con la mano\n'
   '· Conducir con más de 0,50 mg/l de alcohol en aire\n'
   '· Negarse a las pruebas de alcohol o drogas\n'
   '· Arrojar objetos que puedan causar incendio o accidente\n'
   '· Adelantar a un ciclista sin dejar 1,5 m\n'
   '· Usar inhibidores de radar\n\n'
   '4 puntos:\n'
   '· No usar cinturón, casco o sistema de retención infantil\n'
   '· Alcohol entre 0,25 y 0,50 mg/l\n'
   '· No mantener la distancia de seguridad\n\n'
   'IMPORTES\n'
   '· Leve: hasta 100 €  · Grave: 200 €  · Muy grave: 500 €\n'
   'Pagando en los 20 días naturales siguientes, la multa se reduce a la mitad, '
   'pero renuncias a recurrir.')
) as v(topic_code, title, body)
join topics t on t.code = v.topic_code
on conflict do nothing;
