-- ===========================================================================
-- 0010_seed_templates.sql — Catálogo de modalidades de test (55)
--
-- Todas son plantillas del sistema (school_id NULL). La autoescuela puede
-- crear las suyas propias desde el panel sin tocar estas.
-- ===========================================================================

insert into test_templates (
  school_id, code, name, description, category, icon, is_system,
  question_count, time_limit_sec, max_failures, pass_threshold, rules,
  shuffle_questions, shuffle_options, instant_feedback, allow_review, sudden_death, position
) values

-- ---------------------------------------------------------------------------
-- 1. Exámenes oficiales simulados
-- ---------------------------------------------------------------------------
(null, 'examen_oficial_b', 'Examen oficial · Permiso B', 'Simulacro exacto del examen teórico común: 30 preguntas, 30 minutos y un máximo de 3 fallos.', 'examen', 'graduation-cap', true,
  30, 1800, 3, 90, '{"strategy":"exam","licenses":["B"]}', true, true, false, true, false, 1),

(null, 'examen_oficial_am', 'Examen oficial · Ciclomotor AM', 'Simulacro del examen de la licencia AM: 20 preguntas y un máximo de 2 fallos.', 'examen', 'bike', true,
  20, 1500, 2, 90, '{"strategy":"exam","licenses":["AM"]}', true, true, false, true, false, 2),

(null, 'examen_oficial_a1', 'Examen oficial · Moto A1', 'Simulacro del examen teórico común orientado al permiso A1.', 'examen', 'bike', true,
  30, 1800, 3, 90, '{"strategy":"exam","licenses":["A1"]}', true, true, false, true, false, 3),

(null, 'examen_oficial_a2', 'Examen oficial · Moto A2', 'Simulacro del examen teórico común orientado al permiso A2.', 'examen', 'bike', true,
  30, 1800, 3, 90, '{"strategy":"exam","licenses":["A2"]}', true, true, false, true, false, 4),

(null, 'examen_oficial_c', 'Examen oficial · Camión C', 'Simulacro del examen específico de la clase C: transporte, carga, tacógrafo y tiempos de conducción.', 'examen', 'truck', true,
  30, 1800, 3, 90, '{"strategy":"exam","licenses":["C"],"topics":["transporte","vehiculo","administrativo","normas-circulacion","velocidad-distancias"]}', true, true, false, true, false, 5),

(null, 'examen_oficial_d', 'Examen oficial · Autobús D', 'Simulacro del examen específico de la clase D: transporte de viajeros y normativa aplicable.', 'examen', 'bus', true,
  30, 1800, 3, 90, '{"strategy":"exam","licenses":["D"],"topics":["transporte","vehiculo","administrativo","normas-circulacion","seguridad-vial"]}', true, true, false, true, false, 6),

(null, 'examen_btp', 'Examen · BTP', 'Preparación de la habilitación BTP para vehículos prioritarios, taxis y transporte escolar.', 'examen', 'siren', true,
  30, 1800, 3, 90, '{"strategy":"exam","licenses":["BTP"]}', true, true, false, true, false, 7),

(null, 'simulacro_dia_examen', 'Simulacro día de examen', 'Condiciones reales: sin corrección hasta el final, sin volver atrás y con el cronómetro a la vista.', 'examen', 'alarm-clock', true,
  30, 1800, 3, 90, '{"strategy":"exam","licenses":["B"]}', true, true, false, false, false, 8),

(null, 'preexamen', 'Preexamen · ¿Estás listo?', 'Diagnóstico completo que cruza tus fallos históricos con el temario para decirte si puedes presentarte.', 'examen', 'clipboard-check', true,
  40, 2400, 4, 88, '{"strategy":"adaptive","licenses":["B"]}', true, true, false, true, false, 9),

(null, 'autoevaluacion_final', 'Autoevaluación final', 'Repaso general de los 15 bloques del temario antes de la convocatoria.', 'examen', 'check-check', true,
  60, 3600, 6, 90, '{"strategy":"exam"}', true, true, false, true, false, 10),

-- ---------------------------------------------------------------------------
-- 2. Tests por bloque del temario
-- ---------------------------------------------------------------------------
(null, 'tema_normas', 'Normas de circulación', 'Sentido de la circulación, carriles, arcenes y comportamiento general.', 'temario', 'route', true,
  20, null, null, 80, '{"strategy":"random","topics":["normas-circulacion"]}', true, true, true, true, false, 20),

(null, 'tema_senales', 'Señales y marcas viales', 'Todas las familias de señales verticales, marcas viales y semáforos.', 'temario', 'sign-post', true,
  20, null, null, 80, '{"strategy":"random","topics":["senales"]}', true, true, true, true, false, 21),

(null, 'tema_prioridad', 'Prioridad e intersecciones', 'Quién pasa primero en cruces, glorietas y estrechamientos.', 'temario', 'git-fork', true,
  20, null, null, 80, '{"strategy":"random","topics":["prioridad"]}', true, true, true, true, false, 22),

(null, 'tema_velocidad', 'Velocidad y distancias', 'Límites genéricos por vía y vehículo, velocidad adecuada y distancia de seguridad.', 'temario', 'gauge', true,
  20, null, null, 80, '{"strategy":"random","topics":["velocidad-distancias"]}', true, true, true, true, false, 23),

(null, 'tema_maniobras', 'Maniobras', 'Adelantamiento, cambios de dirección y sentido, marcha atrás y estacionamiento.', 'temario', 'move', true,
  20, null, null, 80, '{"strategy":"random","topics":["maniobras"]}', true, true, true, true, false, 24),

(null, 'tema_otras_vias', 'Autopistas, túneles y vías especiales', 'Normas propias de autopistas y autovías, túneles y pasos a nivel.', 'temario', 'milestone', true,
  20, null, null, 80, '{"strategy":"random","topics":["otras-vias"]}', true, true, true, true, false, 25),

(null, 'tema_seguridad', 'Seguridad vial', 'Cinturón, casco, sillitas infantiles, airbag y sistemas de asistencia.', 'temario', 'shield', true,
  20, null, null, 80, '{"strategy":"random","topics":["seguridad-vial"]}', true, true, true, true, false, 26),

(null, 'tema_factor_humano', 'Factor humano', 'Percepción, atención, fatiga, sueño, distracciones y emociones al volante.', 'temario', 'brain', true,
  20, null, null, 80, '{"strategy":"random","topics":["factor-humano"]}', true, true, true, true, false, 27),

(null, 'tema_alcohol', 'Alcohol, drogas y medicamentos', 'Tasas legales, efectos sobre la conducción y pruebas de detección.', 'temario', 'wine', true,
  20, null, null, 80, '{"strategy":"random","topics":["alcohol-drogas"]}', true, true, true, true, false, 28),

(null, 'tema_vehiculo', 'El vehículo y su mantenimiento', 'Mecánica básica, neumáticos, frenos, alumbrado, averías e ITV.', 'temario', 'wrench', true,
  20, null, null, 80, '{"strategy":"random","topics":["vehiculo"]}', true, true, true, true, false, 29),

(null, 'tema_administrativo', 'Cuestiones administrativas', 'Permisos, documentación, matriculación, seguro y transferencias.', 'temario', 'file-text', true,
  20, null, null, 80, '{"strategy":"random","topics":["administrativo"]}', true, true, true, true, false, 30),

(null, 'tema_sanciones', 'Infracciones y permiso por puntos', 'Clases de infracción, importes, procedimiento y saldo de puntos.', 'temario', 'scale', true,
  20, null, null, 80, '{"strategy":"random","topics":["sanciones"]}', true, true, true, true, false, 31),

(null, 'tema_primeros_auxilios', 'Primeros auxilios', 'Conducta PAS, evaluación del herido, hemorragias, RCP y traslado.', 'temario', 'heart-pulse', true,
  20, null, null, 80, '{"strategy":"random","topics":["primeros-auxilios"]}', true, true, true, true, false, 32),

(null, 'tema_transporte', 'Transporte y carga', 'Transporte de personas y mercancías, dimensiones, pesos y señalización de la carga.', 'temario', 'truck', true,
  20, null, null, 80, '{"strategy":"random","topics":["transporte"]}', true, true, true, true, false, 33),

(null, 'tema_eficiente', 'Conducción eficiente y medio ambiente', 'Consumo, emisiones, etiquetas ambientales y técnicas de conducción eficiente.', 'temario', 'leaf', true,
  20, null, null, 80, '{"strategy":"random","topics":["conduccion-eficiente"]}', true, true, true, true, false, 34),

-- ---------------------------------------------------------------------------
-- 3. Tests de señales
-- ---------------------------------------------------------------------------
(null, 'senales_peligro', 'Señales de advertencia de peligro', 'Las triangulares de fondo blanco y borde rojo.', 'senales', 'triangle-alert', true,
  20, null, null, 85, '{"strategy":"random","topics":["senales"],"tags":["senales","peligro"]}', true, true, true, true, false, 40),

(null, 'senales_prohibicion', 'Señales de prohibición', 'Prohibiciones de entrada, de maniobra y limitaciones.', 'senales', 'circle-slash', true,
  20, null, null, 85, '{"strategy":"random","topics":["senales"],"tags":["senales","prohibicion"]}', true, true, true, true, false, 41),

(null, 'senales_obligacion', 'Señales de obligación', 'Las circulares azules que imponen un comportamiento.', 'senales', 'circle-arrow-right', true,
  15, null, null, 85, '{"strategy":"random","topics":["senales"],"tags":["senales","obligacion"]}', true, true, true, true, false, 42),

(null, 'senales_prioridad', 'Señales de prioridad', 'Ceda el paso, STOP, calzada con prioridad y sus variantes.', 'senales', 'octagon-alert', true,
  15, null, null, 85, '{"strategy":"random","topics":["senales"],"tags":["senales","prioridad"]}', true, true, true, true, false, 43),

(null, 'senales_indicacion', 'Señales de indicación y servicio', 'Señales de indicación general, servicio y orientación.', 'senales', 'info', true,
  15, null, null, 85, '{"strategy":"random","topics":["senales"],"tags":["senales","indicacion"]}', true, true, true, true, false, 44),

(null, 'marcas_viales', 'Marcas viales', 'Líneas longitudinales, transversales, flechas e inscripciones en la calzada.', 'senales', 'minus', true,
  15, null, null, 85, '{"strategy":"random","topics":["senales"],"tags":["marcas-viales"]}', true, true, true, true, false, 45),

(null, 'paneles_complementarios', 'Paneles complementarios', 'Los rectangulares que matizan el alcance de la señal principal.', 'senales', 'rectangle-horizontal', true,
  12, null, null, 85, '{"strategy":"random","topics":["senales"],"tags":["paneles"]}', true, true, true, true, false, 46),

(null, 'senales_agentes_semaforos', 'Agentes y semáforos', 'Órdenes de los agentes, semáforos y su orden de prevalencia.', 'senales', 'traffic-cone', true,
  15, null, null, 85, '{"strategy":"random","topics":["senales"],"tags":["semaforos","agentes"]}', true, true, true, true, false, 47),

(null, 'senales_maraton', 'Maratón de señales', 'Todas las familias mezcladas, 50 preguntas seguidas.', 'senales', 'layers', true,
  50, null, null, 85, '{"strategy":"random","topics":["senales"]}', true, true, false, true, false, 48),

-- ---------------------------------------------------------------------------
-- 4. Tests personalizados según tu historial
-- ---------------------------------------------------------------------------
(null, 'mis_fallos', 'Mis fallos', 'Sólo preguntas que has fallado alguna vez, empezando por las que más se te resisten.', 'personalizado', 'circle-x', true,
  20, null, null, 85, '{"strategy":"failed"}', false, true, true, true, false, 60),

(null, 'repaso_inteligente', 'Repaso inteligente', 'Repaso espaciado: te devuelve cada pregunta justo antes de que la olvides.', 'personalizado', 'brain-circuit', true,
  25, null, null, 85, '{"strategy":"srs"}', false, true, true, true, false, 61),

(null, 'puntos_debiles', 'Mis puntos débiles', 'Se centra en los bloques del temario donde tu porcentaje de acierto es más bajo.', 'personalizado', 'trending-down', true,
  25, null, null, 85, '{"strategy":"weakest"}', false, true, true, true, false, 62),

(null, 'nunca_vistas', 'Preguntas nuevas', 'Sólo preguntas que nunca te han salido: amplía tu cobertura del banco.', 'personalizado', 'sparkles', true,
  25, null, null, 85, '{"strategy":"unseen"}', true, true, true, true, false, 63),

(null, 'marcadas', 'Preguntas marcadas', 'Las que dejaste señaladas con la banderita para mirar con calma.', 'personalizado', 'bookmark', true,
  20, null, null, 85, '{"strategy":"flagged"}', false, true, true, true, false, 64),

(null, 'adaptativo', 'Test adaptativo', 'Ajusta la dificultad a tu nivel real pregunta a pregunta.', 'personalizado', 'sliders-horizontal', true,
  30, null, null, 85, '{"strategy":"adaptive"}', false, true, false, true, false, 65),

(null, 'consolidacion', 'Consolidación', 'Preguntas que ya dominas, para que no se te oxiden antes del examen.', 'personalizado', 'anchor', true,
  25, null, null, 92, '{"strategy":"never_failed"}', true, true, false, true, false, 66),

(null, 'repaso_semana', 'Repaso de la semana', 'Todo lo que has trabajado en los últimos siete días.', 'personalizado', 'calendar-range', true,
  30, null, null, 85, '{"strategy":"weakest"}', true, true, false, true, false, 67),

-- ---------------------------------------------------------------------------
-- 5. Retos y modos gamificados
-- ---------------------------------------------------------------------------
(null, 'muerte_subita', 'Muerte súbita', 'Encadena aciertos: al primer fallo se acaba. ¿Cuántas seguidas aguantas?', 'reto', 'skull', true,
  100, null, 0, 100, '{"strategy":"random"}', true, true, true, false, true, 80),

(null, 'contrarreloj_60', 'Contrarreloj · 60 segundos', 'Las que puedas en un minuto. Pura agilidad mental.', 'reto', 'timer', true,
  30, 60, null, 70, '{"strategy":"random"}', true, true, true, false, false, 81),

(null, 'sprint_10', 'Sprint de 10', 'Diez preguntas rápidas para un hueco entre clases.', 'reto', 'zap', true,
  10, 300, 1, 90, '{"strategy":"random"}', true, true, true, true, false, 82),

(null, 'duelo_relampago', 'Duelo relámpago', 'Veinte preguntas en cinco minutos, sin margen para dudar.', 'reto', 'swords', true,
  20, 300, 2, 90, '{"strategy":"random"}', true, true, false, false, false, 83),

(null, 'maraton_100', 'Maratón de 100', 'Cien preguntas de todo el temario. Para una sesión larga de estudio.', 'reto', 'flag', true,
  100, null, null, 85, '{"strategy":"random"}', true, true, false, true, false, 84),

(null, 'reto_diario', 'Reto diario', 'Quince preguntas nuevas cada día para mantener la racha viva.', 'reto', 'calendar-check', true,
  15, 900, 1, 90, '{"strategy":"adaptive"}', true, true, false, true, false, 85),

(null, 'reto_semanal', 'Reto semanal', 'Cincuenta preguntas exigentes que sólo aparecen una vez por semana.', 'reto', 'trophy', true,
  50, 3000, 5, 88, '{"strategy":"hardest"}', true, true, false, true, false, 86),

(null, 'perfeccion', 'Modo perfección', 'Treinta preguntas sin ni un solo fallo permitido.', 'reto', 'gem', true,
  30, 1800, 0, 100, '{"strategy":"random"}', true, true, false, true, false, 87),

-- ---------------------------------------------------------------------------
-- 6. Por dificultad
-- ---------------------------------------------------------------------------
(null, 'nivel_facil', 'Nivel fácil', 'Preguntas de base para empezar o para recuperar confianza.', 'nivel', 'signal-low', true,
  20, null, null, 90, '{"strategy":"random","difficulty":[1,2]}', true, true, true, true, false, 100),

(null, 'nivel_medio', 'Nivel medio', 'El grueso de lo que cae en el examen real.', 'nivel', 'signal-medium', true,
  25, null, null, 85, '{"strategy":"random","difficulty":[2,4]}', true, true, true, true, false, 101),

(null, 'nivel_dificil', 'Nivel difícil', 'Las preguntas más enrevesadas del banco. Nivel oposición.', 'nivel', 'signal-high', true,
  25, null, null, 80, '{"strategy":"random","difficulty":[4,5]}', true, true, true, true, false, 102),

(null, 'las_mas_falladas', 'Las más falladas', 'Las preguntas con menor tasa de acierto entre todos los alumnos.', 'nivel', 'trending-down', true,
  25, null, null, 75, '{"strategy":"hardest"}', false, true, true, true, false, 103),

(null, 'preguntas_trampa', 'Preguntas trampa', 'Enunciados con matices que hacen caer a la mayoría. Léelos dos veces.', 'nivel', 'alert-triangle', true,
  20, null, null, 75, '{"strategy":"hardest","difficulty":[4,5]}', true, true, true, true, false, 104),

-- ---------------------------------------------------------------------------
-- 7. Práctica libre
-- ---------------------------------------------------------------------------
(null, 'random_10', 'Test rápido · 10', 'Diez preguntas al azar de todo el temario.', 'libre', 'dices', true,
  10, null, null, 80, '{"strategy":"random"}', true, true, true, true, false, 120),

(null, 'random_30', 'Test libre · 30', 'Treinta preguntas al azar, sin límite de tiempo.', 'libre', 'shuffle', true,
  30, null, null, 85, '{"strategy":"random"}', true, true, false, true, false, 121),

(null, 'modo_estudio', 'Modo estudio', 'Corrige al momento y te explica cada respuesta con el artículo que la respalda.', 'libre', 'book-open', true,
  20, null, null, 0, '{"strategy":"adaptive"}', true, true, true, true, false, 122),

(null, 'entrenamiento_libre', 'Entrenamiento sin límite', 'Cincuenta preguntas, sin cronómetro y sin nota. Sólo practicar.', 'libre', 'infinity', true,
  50, null, null, 0, '{"strategy":"random"}', true, true, true, true, false, 123)

on conflict (school_id, code) do update
  set name           = excluded.name,
      description    = excluded.description,
      category       = excluded.category,
      icon           = excluded.icon,
      question_count = excluded.question_count,
      time_limit_sec = excluded.time_limit_sec,
      max_failures   = excluded.max_failures,
      pass_threshold = excluded.pass_threshold,
      rules          = excluded.rules,
      position       = excluded.position;
