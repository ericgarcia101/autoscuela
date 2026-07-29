-- ===========================================================================
-- 0013_seed_questions_seguridad.sql
-- Bloque 3: seguridad vial, factor humano, alcohol y drogas, primeros auxilios
-- ===========================================================================

insert into questions (topic_id, text, options, correct_index, explanation, legal_ref, difficulty, licenses, tags)
select t.id, v.q, v.opts::jsonb, v.ok, v.expl, v.ref, v.diff, v.lic::license_class[], v.tg::text[]
from (values

-- ---------------------------------------------------------------------------
-- SEGURIDAD VIAL
-- ---------------------------------------------------------------------------
('seguridad-vial',
 '¿En qué asientos es obligatorio el uso del cinturón de seguridad?',
 '["En todos los asientos, dentro y fuera de poblado","Solo en los delanteros","Solo fuera de poblado"]', 0,
 'El cinturón es obligatorio para conductor y pasajeros en todas las plazas equipadas con él, tanto en vía urbana como interurbana.',
 'Art. 117 RGC', 1, '{B,C,D}', '{seguridad,cinturon}'),

('seguridad-vial',
 'Los menores de edad que midan 135 cm o menos deben viajar...',
 '["En los asientos traseros con un sistema de retención homologado a su talla","En el asiento del copiloto con el cinturón normal","En cualquier asiento sin restricción"]', 0,
 'Los menores de estatura igual o inferior a 135 cm han de utilizar un sistema de retención infantil homologado y ocupar los asientos traseros, con contadas excepciones.',
 'Art. 117.2 RGC', 2, '{B}', '{seguridad,sri,menores}'),

('seguridad-vial',
 '¿Puede colocarse una sillita infantil a contramarcha en el asiento del copiloto?',
 '["Solo si el airbag frontal está desactivado","Sí, en cualquier caso","No, nunca, bajo ninguna circunstancia"]', 0,
 'Un airbag frontal activo puede causar lesiones graves a un bebé situado a contramarcha, por lo que es imprescindible desconectarlo antes de instalar la sillita en esa posición.',
 'Art. 117 RGC y Reglamento CEPE/ONU 129', 2, '{B}', '{seguridad,sri,airbag}'),

('seguridad-vial',
 'El airbag es un elemento de seguridad...',
 '["Pasiva, porque reduce las consecuencias del accidente","Activa, porque ayuda a evitar el accidente","Terciaria"]', 0,
 'La seguridad pasiva actúa una vez producido el impacto para minimizar los daños: airbag, cinturón, reposacabezas o carrocería deformable.',
 'Conceptos de seguridad activa y pasiva, art. 11 LSV', 2, '{B,A1,A2,A}', '{seguridad,airbag}'),

('seguridad-vial',
 '¿Cuál de estos es un elemento de seguridad activa?',
 '["El sistema antibloqueo de frenos ABS","El cinturón de seguridad","El reposacabezas"]', 0,
 'La seguridad activa agrupa los sistemas que ayudan a evitar el accidente: frenos, ABS, ESP, neumáticos, alumbrado y suspensión.',
 'Conceptos de seguridad activa y pasiva, art. 11 LSV', 2, '{B,A1,A2,A}', '{seguridad,abs}'),

('seguridad-vial',
 'El reposacabezas debe regularse de forma que...',
 '["Su parte alta quede a la altura de la parte superior de la cabeza","Quede a la altura del cuello","Esté lo más bajo posible"]', 0,
 'Un reposacabezas bien ajustado, con el borde superior a la altura de la coronilla y cerca de la cabeza, evita el latigazo cervical en un impacto trasero.',
 'Art. 117 RGC y recomendaciones DGT', 2, '{B}', '{seguridad,reposacabezas}'),

('seguridad-vial',
 '¿Es obligatorio el casco para el conductor de una motocicleta?',
 '["Sí, y también para el pasajero, en todas las vías","Solo fuera de poblado","Solo si supera los 50 km/h"]', 0,
 'El uso del casco de protección homologado es obligatorio para conductores y pasajeros de motocicletas y ciclomotores en cualquier vía.',
 'Art. 118 RGC', 1, '{A1,A2,A,AM}', '{seguridad,casco,moto}'),

('seguridad-vial',
 '¿Cuándo es obligatorio el casco para un ciclista?',
 '["Siempre en vías interurbanas, y en cualquier vía si es menor de 16 años","Nunca es obligatorio","Solo en competiciones"]', 0,
 'Los ciclistas deben usar casco en vías interurbanas; los menores de 16 años están obligados también en vías urbanas.',
 'Art. 118 RGC', 2, '{B}', '{seguridad,casco,ciclistas}'),

('seguridad-vial',
 'Un objeto suelto en el habitáculo, en una colisión a 50 km/h...',
 '["Multiplica su peso muchas veces y puede causar lesiones graves","No supone riesgo si es pequeño","Solo es peligroso si va en el maletero"]', 0,
 'En un impacto, la energía cinética hace que un objeto suelto golpee con una fuerza equivalente a decenas de veces su peso. Por eso la carga debe ir bien sujeta.',
 'Art. 14 LSV, acondicionamiento de la carga', 2, '{B}', '{seguridad,carga}'),

('seguridad-vial',
 'El sistema ESP o control de estabilidad actúa...',
 '["Corrigiendo la trayectoria cuando detecta una pérdida de adherencia","Solo cuando se frena en línea recta","Únicamente sobre la dirección asistida"]', 0,
 'El ESP compara la trayectoria deseada por el conductor con la real y frena ruedas de forma selectiva para corregir subvirajes y sobrevirajes.',
 'Elementos de seguridad activa, Anexo I RGV', 3, '{B}', '{seguridad,esp}'),

-- ---------------------------------------------------------------------------
-- FACTOR HUMANO
-- ---------------------------------------------------------------------------
('factor-humano',
 '¿Qué porcentaje aproximado de la información necesaria para conducir se recibe por la vista?',
 '["Alrededor del 90 %","Alrededor del 50 %","Alrededor del 30 %"]', 0,
 'La visión aporta en torno al 90 % de la información que maneja el conductor, de ahí la importancia de la agudeza visual y del campo visual.',
 'Estudios DGT sobre percepción y conducción', 2, '{B,A1,A2,A,AM}', '{factor-humano,vision}'),

('factor-humano',
 'Al aumentar la velocidad, el campo visual del conductor...',
 '["Se reduce","Se amplía","No varía"]', 0,
 'A mayor velocidad, el campo visual se estrecha y aparece la llamada visión de túnel, lo que hace que se detecten peor los peligros laterales.',
 'Estudios DGT sobre percepción y velocidad', 2, '{B,A1,A2,A}', '{factor-humano,vision,velocidad}'),

('factor-humano',
 'El tiempo de reacción de un conductor en condiciones normales es de aproximadamente...',
 '["Tres cuartos de segundo a un segundo","Tres segundos","Un cuarto de segundo"]', 0,
 'El tiempo de reacción medio ronda los 0,75-1 segundos y aumenta con la fatiga, el alcohol, los medicamentos y las distracciones.',
 'Art. 54 RGC y estudios DGT', 2, '{B,A1,A2,A}', '{factor-humano,reaccion}'),

('factor-humano',
 'Ante los primeros síntomas de somnolencia al volante, lo correcto es...',
 '["Detenerse en un lugar seguro y descansar o dormir un rato","Abrir la ventanilla y subir la música","Tomar un café y seguir sin parar"]', 0,
 'Ni el aire fresco ni la música compensan el sueño. La única medida eficaz es detenerse en un lugar seguro y descansar; una siesta breve de 15-20 minutos es lo más recomendable.',
 'Art. 3 RGC, deber de conducir en condiciones adecuadas', 1, '{B,A1,A2,A}', '{factor-humano,fatiga,sueno}'),

('factor-humano',
 'En un viaje largo, ¿cada cuánto se recomienda hacer una pausa?',
 '["Aproximadamente cada dos horas o cada 200 kilómetros","Cada cinco horas","Solo cuando se note cansancio extremo"]', 0,
 'La recomendación general es descansar unos 15-20 minutos cada dos horas de conducción o cada 200 kilómetros, antes de que aparezca la fatiga.',
 'Recomendaciones DGT sobre fatiga', 1, '{B,C,D}', '{factor-humano,fatiga}'),

('factor-humano',
 'Conducir bajo un estado de enfado o agresividad...',
 '["Aumenta el riesgo porque reduce la tolerancia y favorece decisiones arriesgadas","No influye si se conoce bien la ruta","Mejora los reflejos por la adrenalina"]', 0,
 'Las emociones intensas alteran la percepción del riesgo, acortan la distancia de seguridad y multiplican las maniobras impulsivas.',
 'Art. 3 RGC y estudios DGT sobre factor humano', 2, '{B,A1,A2,A,AM}', '{factor-humano,emociones}'),

('factor-humano',
 'La visión nocturna se caracteriza porque...',
 '["Se reduce la agudeza visual y la percepción de colores y distancias","Mejora la percepción de profundidad","No se ve afectada si se llevan luces largas"]', 0,
 'De noche la retina trabaja con los bastones, lo que reduce la agudeza, elimina prácticamente la percepción del color y dificulta calcular distancias y velocidades.',
 'Estudios DGT sobre conducción nocturna', 3, '{B,A1,A2,A}', '{factor-humano,vision,noche}'),

('factor-humano',
 'Si le deslumbran las luces de un vehículo que viene de frente, debe...',
 '["Desviar la mirada hacia la derecha, reducir la velocidad y no mirar al foco","Encender sus luces largas para responder","Cerrar los ojos un instante"]', 0,
 'Hay que evitar mirar directamente al foco, tomar como referencia la marca del borde derecho de la calzada y reducir la velocidad hasta recuperar la visión.',
 'Art. 103 RGC', 2, '{B,A1,A2,A}', '{factor-humano,deslumbramiento,noche}'),

-- ---------------------------------------------------------------------------
-- ALCOHOL, DROGAS Y MEDICAMENTOS
-- ---------------------------------------------------------------------------
('alcohol-drogas',
 '¿Cuál es la tasa máxima de alcohol en aire espirado para un conductor con más de dos años de permiso, en vehículo particular?',
 '["0,25 mg/l","0,15 mg/l","0,30 mg/l"]', 0,
 'La tasa general es de 0,25 mg/l en aire espirado, equivalente a 0,5 g/l en sangre.',
 'Art. 20 RGC', 1, '{B,A1,A2,A,AM}', '{alcohol,tasas}'),

('alcohol-drogas',
 '¿Cuál es la tasa máxima de alcohol en aire espirado para un conductor novel (menos de dos años de permiso)?',
 '["0,15 mg/l","0,25 mg/l","0,30 mg/l"]', 0,
 'Los conductores noveles y los profesionales tienen una tasa reducida de 0,15 mg/l en aire espirado, equivalente a 0,3 g/l en sangre.',
 'Art. 20 RGC', 2, '{B,A1,A2,A,AM}', '{alcohol,tasas,noveles}'),

('alcohol-drogas',
 'Un conductor de autobús de transporte escolar tiene una tasa máxima de alcohol en sangre de...',
 '["0,3 g/l","0,5 g/l","0,0 g/l"]', 0,
 'Los conductores de vehículos destinados al transporte de mercancías peligrosas, de servicio público, de urgencia o de transporte escolar están sujetos a la tasa reducida de 0,3 g/l.',
 'Art. 20 RGC', 3, '{D,D1,C,BTP}', '{alcohol,tasas,profesionales}'),

('alcohol-drogas',
 'A partir de qué tasa de alcohol en aire espirado la conducción constituye un delito contra la seguridad vial:',
 '["0,60 mg/l","0,25 mg/l","0,50 mg/l"]', 0,
 'Superar los 0,60 mg/l en aire espirado (o 1,2 g/l en sangre) es delito castigado con prisión, multa o trabajos en beneficio de la comunidad, además de la privación del permiso.',
 'Art. 379.2 Código Penal', 3, '{B,A1,A2,A,AM}', '{alcohol,delito}'),

('alcohol-drogas',
 'Negarse a someterse a las pruebas de detección de alcohol...',
 '["Constituye un delito de desobediencia grave","Es un derecho del conductor","Solo es una infracción administrativa leve"]', 0,
 'La negativa a someterse a las pruebas legalmente establecidas está tipificada como delito, con penas de prisión de seis meses a un año.',
 'Art. 383 Código Penal', 2, '{B,A1,A2,A,AM}', '{alcohol,delito,pruebas}'),

('alcohol-drogas',
 '¿Qué efecto produce el alcohol sobre el tiempo de reacción?',
 '["Lo aumenta","Lo reduce","No lo modifica"]', 0,
 'El alcohol es un depresor del sistema nervioso central: alarga el tiempo de reacción, reduce el campo visual y genera una falsa sensación de seguridad.',
 'Estudios DGT sobre alcohol y conducción', 1, '{B,A1,A2,A,AM}', '{alcohol,efectos}'),

('alcohol-drogas',
 'Tomar un café o una ducha fría después de beber...',
 '["No reduce la tasa de alcohol en sangre","Elimina el alcohol rápidamente","Reduce la tasa a la mitad"]', 0,
 'Solo el paso del tiempo elimina el alcohol, a un ritmo aproximado de 0,15 g/l por hora. Ningún remedio casero acelera el metabolismo hepático.',
 'Estudios DGT sobre alcohol y conducción', 2, '{B,A1,A2,A,AM}', '{alcohol,efectos}'),

('alcohol-drogas',
 'Respecto a las drogas, la normativa establece que...',
 '["Está prohibido conducir con presencia de drogas en el organismo","Se permite una tasa mínima como con el alcohol","Solo se sanciona si se aprecian síntomas evidentes"]', 0,
 'A diferencia del alcohol, para las drogas rige la tolerancia cero: basta la presencia de la sustancia en el organismo, salvo el uso terapéutico acreditado.',
 'Art. 14 LSV', 2, '{B,A1,A2,A,AM}', '{drogas,tasas}'),

('alcohol-drogas',
 'Si un medicamento lleva el pictograma del triángulo rojo con un coche, significa que...',
 '["Puede afectar a la capacidad de conducir","Está prohibido para conductores profesionales únicamente","Solo puede tomarse por la noche"]', 0,
 'El pictograma advierte de que el medicamento puede alterar la capacidad de conducción; conviene consultar al médico o farmacéutico antes de ponerse al volante.',
 'RD 1345/2007, etiquetado de medicamentos', 2, '{B,A1,A2,A,AM}', '{medicamentos,farmacos}'),

-- ---------------------------------------------------------------------------
-- PRIMEROS AUXILIOS
-- ---------------------------------------------------------------------------
('primeros-auxilios',
 '¿Qué significa la conducta PAS ante un accidente?',
 '["Proteger, Avisar y Socorrer","Parar, Ayudar y Salir","Prevenir, Actuar y Sanar"]', 0,
 'Es el orden de actuación que evita generar nuevas víctimas: primero proteger el lugar, después avisar a los servicios de emergencia y por último socorrer a los heridos.',
 'Protocolo PAS, formación vial DGT', 1, '{B,A1,A2,A,AM}', '{primeros-auxilios,pas}'),

('primeros-auxilios',
 '¿Cuál es el número de teléfono único de emergencias en toda la Unión Europea?',
 '["112","091","061"]', 0,
 'El 112 es el número único de emergencias, gratuito y accesible desde cualquier teléfono, incluso sin cobertura del propio operador.',
 'Decisión 91/396/CEE y RD 903/1997', 1, '{B,A1,A2,A,AM}', '{primeros-auxilios,emergencias}'),

('primeros-auxilios',
 '¿Debe quitarse el casco a un motorista accidentado?',
 '["Solo si no respira o hay que practicarle reanimación","Siempre, para que respire mejor","Nunca, bajo ninguna circunstancia"]', 0,
 'Retirar el casco puede agravar una lesión cervical, así que solo se hace cuando es imprescindible para mantener la vía aérea o reanimar, y preferiblemente entre dos personas.',
 'Protocolos de primeros auxilios, formación vial DGT', 2, '{B,A1,A2,A}', '{primeros-auxilios,casco}'),

('primeros-auxilios',
 'Un herido está inconsciente pero respira con normalidad. La postura adecuada es...',
 '["La posición lateral de seguridad","Boca arriba con las piernas elevadas","Sentado y apoyado en la pared"]', 0,
 'La posición lateral de seguridad mantiene la vía aérea abierta y evita que un vómito provoque asfixia, siempre que no se sospeche lesión de columna.',
 'Protocolos de primeros auxilios, formación vial DGT', 2, '{B,A1,A2,A,AM}', '{primeros-auxilios,inconsciente}'),

('primeros-auxilios',
 'En una reanimación cardiopulmonar a un adulto, la secuencia recomendada es...',
 '["30 compresiones torácicas y 2 ventilaciones","15 compresiones y 1 ventilación","5 compresiones y 5 ventilaciones"]', 0,
 'El protocolo estándar del Consejo Europeo de Resucitación es de 30 compresiones por cada 2 ventilaciones, a un ritmo de 100 a 120 compresiones por minuto.',
 'Guías del European Resuscitation Council', 3, '{B,A1,A2,A}', '{primeros-auxilios,rcp}'),

('primeros-auxilios',
 'Ante una hemorragia externa abundante en un brazo, lo primero es...',
 '["Aplicar presión directa sobre la herida con un apósito limpio","Aplicar un torniquete de inmediato","Lavar la herida con agua abundante"]', 0,
 'La presión directa controla la mayoría de las hemorragias. El torniquete se reserva para casos extremos, como una amputación o cuando la presión falla.',
 'Protocolos de primeros auxilios, formación vial DGT', 2, '{B,A1,A2,A,AM}', '{primeros-auxilios,hemorragia}'),

('primeros-auxilios',
 '¿Debe mover a un herido del interior de un vehículo accidentado?',
 '["Solo si existe peligro inminente, como incendio","Siempre, para atenderle mejor","Nunca, en ninguna circunstancia"]', 0,
 'Mover a un herido puede agravar lesiones de columna. Solo se le extrae si hay un riesgo vital inmediato, y entonces mediante la maniobra de Rautek.',
 'Protocolos de primeros auxilios, formación vial DGT', 2, '{B,A1,A2,A,AM}', '{primeros-auxilios,traslado}'),

('primeros-auxilios',
 'Al avisar al 112 tras un accidente, ¿qué debe indicar?',
 '["Lugar exacto, número y estado de los heridos y tipo de accidente","Solo la matrícula de los vehículos","Solo su nombre y teléfono"]', 0,
 'Cuanta mejor información reciba el operador, más ajustados serán los recursos enviados. Hay que mantener la calma y no colgar hasta que lo indiquen.',
 'Protocolo PAS, formación vial DGT', 1, '{B,A1,A2,A,AM}', '{primeros-auxilios,emergencias}')

) as v(topic_code, q, opts, ok, expl, ref, diff, lic, tg)
join topics t on t.code = v.topic_code;
