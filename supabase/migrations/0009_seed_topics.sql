-- ===========================================================================
-- 0009_seed_topics.sql — Temario oficial y catálogo de modalidades de test
-- ===========================================================================

insert into topics (code, name, description, icon, color, position) values
  ('normas-circulacion',  'Normas de circulación',        'Normas generales de comportamiento en la circulación, sentido, carriles y arcenes.', 'route',        '#1c5cf5',  1),
  ('senales',             'Señales y marcas viales',      'Señales verticales, marcas viales, semáforos, agentes y paneles complementarios.',    'sign-post',    '#e11d48',  2),
  ('prioridad',           'Prioridad e intersecciones',   'Prioridad de paso, glorietas, cruces, estrechamientos y cambios de rasante.',         'git-fork',     '#f59e0b',  3),
  ('velocidad-distancias','Velocidad y distancias',       'Límites genéricos, velocidad adecuada, distancia de seguridad y frenado.',            'gauge',        '#0ea5e9',  4),
  ('maniobras',           'Maniobras',                    'Adelantamiento, cambio de dirección y sentido, marcha atrás, parada y estacionamiento.', 'move',      '#8b5cf6',  5),
  ('otras-vias',          'Autopistas, túneles y vías especiales', 'Autopistas y autovías, túneles, pasos a nivel y vías de especial regulación.', 'milestone',   '#14b8a6',  6),
  ('seguridad-vial',      'Seguridad vial',               'Cinturón, casco, sistemas de retención infantil y elementos de seguridad activa y pasiva.', 'shield',   '#22c55e',  7),
  ('factor-humano',       'Factor humano',                'Percepción, atención, fatiga, sueño, distracciones y estados emocionales.',           'brain',        '#ec4899',  8),
  ('alcohol-drogas',      'Alcohol, drogas y medicamentos','Tasas de alcohol, efectos, drogas, fármacos y pruebas de detección.',                'wine',         '#dc2626',  9),
  ('vehiculo',            'El vehículo y su mantenimiento','Mecánica básica, neumáticos, frenos, alumbrado, averías y ITV.',                     'wrench',       '#64748b', 10),
  ('administrativo',      'Cuestiones administrativas',   'Permisos y licencias, documentación, matriculación, seguro y transferencias.',        'file-text',    '#0891b2', 11),
  ('sanciones',           'Infracciones y permiso por puntos','Tipos de infracción, sanciones, procedimiento y pérdida y recuperación de puntos.','scale',       '#7c3aed', 12),
  ('primeros-auxilios',   'Primeros auxilios',            'Conducta PAS, evaluación del herido, hemorragias, RCP y traslado.',                   'heart-pulse',  '#f43f5e', 13),
  ('transporte',          'Transporte y carga',           'Transporte de personas y mercancías, dimensiones, peso, señalización de la carga.',   'truck',        '#a16207', 14),
  ('conduccion-eficiente','Conducción eficiente',         'Consumo, emisiones, etiquetas ambientales y técnicas de conducción eficiente.',       'leaf',         '#16a34a', 15)
on conflict (code) do update
  set name = excluded.name,
      description = excluded.description,
      icon = excluded.icon,
      color = excluded.color,
      position = excluded.position;
