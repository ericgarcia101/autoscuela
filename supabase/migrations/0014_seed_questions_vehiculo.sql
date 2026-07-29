-- ===========================================================================
-- 0014_seed_questions_vehiculo.sql
-- Bloque 4: vehículo y mantenimiento, administrativo, sanciones y puntos,
--           transporte y carga, conducción eficiente
-- ===========================================================================

insert into questions (topic_id, text, options, correct_index, explanation, legal_ref, difficulty, licenses, tags)
select t.id, v.q, v.opts::jsonb, v.ok, v.expl, v.ref, v.diff, v.lic::license_class[], v.tg::text[]
from (values

-- ---------------------------------------------------------------------------
-- EL VEHÍCULO Y SU MANTENIMIENTO
-- ---------------------------------------------------------------------------
('vehiculo',
 '¿Cuál es la profundidad mínima legal del dibujo de la banda de rodadura de un neumático?',
 '["1,6 mm","2,5 mm","1,0 mm"]', 0,
 'Por debajo de 1,6 milímetros el neumático no evacua agua correctamente y el vehículo no supera la ITV.',
 'Anexo I RD 2822/1998 (RGV) y Directiva 89/459/CEE', 1, '{B,A1,A2,A,AM,C,D}', '{vehiculo,neumaticos}'),

('vehiculo',
 'Una presión de inflado inferior a la recomendada provoca...',
 '["Mayor consumo, desgaste en los hombros del neumático y riesgo de reventón","Menor consumo de combustible","Mejor frenada en mojado"]', 0,
 'El neumático deshinchado flexiona en exceso, se calienta, se desgasta por los bordes, alarga la distancia de frenado y puede reventar.',
 'Recomendaciones DGT sobre mantenimiento', 2, '{B}', '{vehiculo,neumaticos}'),

('vehiculo',
 'El fenómeno de aquaplaning consiste en...',
 '["La pérdida de contacto del neumático con el asfalto por una capa de agua","El empañamiento de los cristales","El bloqueo de los frenos en mojado"]', 0,
 'Cuando el neumático no puede evacuar el agua, flota sobre ella y se pierde la dirección y la frenada. Hay que levantar el pie del acelerador sin frenar bruscamente y sujetar el volante.',
 'Art. 45 RGC, adecuación de la velocidad', 2, '{B,A1,A2,A}', '{vehiculo,neumaticos,lluvia}'),

('vehiculo',
 'Si nota que el pedal de freno se hunde más de lo normal, lo más probable es...',
 '["Que haya aire o falta de líquido en el circuito de frenos","Que las pastillas sean nuevas","Que la presión de los neumáticos sea alta"]', 0,
 'Un pedal esponjoso o que se hunde indica aire en el circuito o pérdida de líquido de frenos. Es una avería grave que exige revisión inmediata.',
 'Mantenimiento del sistema de frenado, Anexo I RGV', 3, '{B}', '{vehiculo,frenos}'),

('vehiculo',
 'El sistema ABS tiene como función principal...',
 '["Evitar el bloqueo de las ruedas durante la frenada para mantener la direccionalidad","Reducir la distancia de frenado en todos los casos","Frenar automáticamente ante un obstáculo"]', 0,
 'El ABS impide que las ruedas se bloqueen, lo que permite seguir dirigiendo el vehículo mientras se frena a fondo. No siempre acorta la distancia de frenado.',
 'Elementos de seguridad activa, Anexo I RGV', 2, '{B,A2,A}', '{vehiculo,frenos,abs}'),

('vehiculo',
 'Con el testigo rojo de presión de aceite encendido, debe...',
 '["Detenerse cuanto antes en lugar seguro y parar el motor","Continuar hasta el próximo taller","Añadir agua al radiador"]', 0,
 'La falta de presión de aceite puede gripar el motor en muy pocos kilómetros. Es de los pocos testigos que obligan a detenerse de inmediato.',
 'Manual de mantenimiento del vehículo', 2, '{B}', '{vehiculo,averias}'),

('vehiculo',
 'Si el motor se calienta en exceso y sube la aguja de temperatura, debe...',
 '["Detenerse, apagar el motor y esperar a que enfríe antes de abrir el radiador","Abrir el tapón del radiador de inmediato","Acelerar para que circule más refrigerante"]', 0,
 'Abrir el circuito en caliente proyecta refrigerante hirviendo. Hay que dejar enfriar el motor antes de comprobar el nivel.',
 'Manual de mantenimiento del vehículo', 2, '{B}', '{vehiculo,averias}'),

('vehiculo',
 '¿Cuándo debe pasar la primera ITV un turismo de uso particular?',
 '["A los cuatro años desde su primera matriculación","A los dos años","Al año"]', 0,
 'Los turismos particulares pasan la primera inspección a los 4 años, después cada 2 años hasta los 10, y a partir de entonces anualmente.',
 'Anexo I RD 920/2017', 2, '{B}', '{vehiculo,itv,administrativo}'),

('vehiculo',
 'Circular con la ITV desfavorable o caducada...',
 '["Es una infracción grave","Es una infracción leve","No tiene consecuencias si el vehículo funciona bien"]', 0,
 'Circular sin la inspección técnica en vigor está tipificado como infracción grave y puede conllevar la inmovilización del vehículo.',
 'Art. 76 LSV y RD 920/2017', 2, '{B}', '{vehiculo,itv,sanciones}'),

('vehiculo',
 'La luz antiniebla trasera solo debe encenderse...',
 '["Con niebla densa, lluvia muy intensa o nevada fuerte","Siempre que llueva","De noche en carretera"]', 0,
 'La antiniebla trasera deslumbra mucho a quien circula detrás, por lo que su uso se limita a condiciones que reduzcan la visibilidad por debajo de unos 50 metros.',
 'Art. 106 RGC', 2, '{B}', '{vehiculo,alumbrado}'),

('vehiculo',
 'Fuera de poblado y de noche, en una vía sin iluminación, debe utilizar...',
 '["La luz de carretera, cambiando a cruce para no deslumbrar","Solo la luz de posición","Solo la antiniebla delantera"]', 0,
 'La luz de carretera es obligatoria en vías sin iluminación, con la obligación de cambiar a cruce ante vehículos que se aproximen de frente o a los que se siga de cerca.',
 'Art. 103 RGC', 2, '{B,A2,A}', '{vehiculo,alumbrado,noche}'),

-- ---------------------------------------------------------------------------
-- CUESTIONES ADMINISTRATIVAS
-- ---------------------------------------------------------------------------
('administrativo',
 '¿Qué documentos debe llevar en el vehículo?',
 '["Permiso de conducción, permiso de circulación y ficha técnica (ITV)","Solo el permiso de conducción","Solo el recibo del seguro"]', 0,
 'Hay que poder acreditar el permiso o licencia de conducción, el permiso de circulación del vehículo y la tarjeta de inspección técnica.',
 'Art. 25 y 26 RGC', 1, '{B,A1,A2,A,AM}', '{administrativo,documentacion}'),

('administrativo',
 '¿Es obligatorio el seguro de responsabilidad civil de suscripción obligatoria?',
 '["Sí, para todo vehículo a motor que circule","Solo para vehículos de más de 10 años","Solo para vehículos de empresa"]', 0,
 'Todo propietario de un vehículo a motor con estacionamiento habitual en España debe suscribir un seguro que cubra la responsabilidad civil por los daños causados.',
 'RDL 8/2004, Ley sobre responsabilidad civil y seguro', 1, '{B,A1,A2,A,AM}', '{administrativo,seguro}'),

('administrativo',
 '¿Cuál es el periodo de vigencia ordinario del permiso B para menores de 65 años?',
 '["10 años","5 años","15 años"]', 0,
 'El permiso B se prorroga cada 10 años hasta los 65; a partir de esa edad, cada 5 años.',
 'Art. 16 RD 818/2009, Reglamento General de Conductores', 2, '{B}', '{administrativo,permisos}'),

('administrativo',
 '¿Qué edad mínima se exige para obtener el permiso B?',
 '["18 años","17 años","16 años"]', 0,
 'La edad mínima para obtener el permiso de la clase B es de 18 años cumplidos.',
 'Art. 4 RD 818/2009', 1, '{B}', '{administrativo,permisos,edad}'),

('administrativo',
 'Un conductor con permiso A2 puede conducir motocicletas de hasta...',
 '["35 kW de potencia y relación potencia/peso no superior a 0,2 kW/kg","25 kW","Cualquier potencia si tiene más de 20 años"]', 0,
 'El permiso A2 habilita para motocicletas de hasta 35 kW, con una relación potencia/peso máxima de 0,2 kW/kg y que no deriven de un vehículo de más del doble de potencia.',
 'Art. 4 RD 818/2009', 3, '{A2}', '{administrativo,permisos,moto}'),

('administrativo',
 'Con el permiso B, tras tres años de antigüedad, se puede conducir...',
 '["Motocicletas de hasta 125 cc en territorio español","Cualquier motocicleta","Ninguna motocicleta"]', 0,
 'El permiso B con tres años de antigüedad autoriza a conducir motocicletas de hasta 125 cc, 11 kW y 0,1 kW/kg, únicamente dentro de España.',
 'Art. 6 RD 818/2009', 3, '{B}', '{administrativo,permisos,moto}'),

('administrativo',
 'Al vender un vehículo, el plazo para notificar la transmisión a Tráfico es de...',
 '["10 días desde la transmisión","30 días","No es obligatorio notificarlo"]', 0,
 'El titular debe comunicar la venta en el plazo de 10 días; de lo contrario seguirá respondiendo de las multas y del impuesto de circulación.',
 'Art. 32 RGV', 3, '{B}', '{administrativo,transferencia}'),

('administrativo',
 'La etiqueta ambiental de la DGT de color azul (0 emisiones) corresponde a...',
 '["Vehículos eléctricos de batería, de autonomía extendida y de pila de combustible","Vehículos híbridos no enchufables","Vehículos de gasolina posteriores a 2006"]', 0,
 'La etiqueta 0 azul identifica a los eléctricos puros, eléctricos de autonomía extendida, híbridos enchufables con más de 40 km de autonomía y los de pila de combustible.',
 'Resolución DGT sobre clasificación ambiental de vehículos', 3, '{B}', '{administrativo,etiquetas,medioambiente}'),

-- ---------------------------------------------------------------------------
-- INFRACCIONES, SANCIONES Y PUNTOS
-- ---------------------------------------------------------------------------
('sanciones',
 '¿Cuál es el saldo inicial de puntos de un conductor que obtiene su primer permiso?',
 '["8 puntos","12 puntos","15 puntos"]', 0,
 'El conductor novel parte de 8 puntos; transcurridos dos años sin ser sancionado en firme, el saldo pasa a 12.',
 'Art. 60 LSV', 2, '{B,A1,A2,A,AM}', '{sanciones,puntos}'),

('sanciones',
 '¿Cuál es el saldo máximo de puntos que puede llegar a tener un conductor?',
 '["15 puntos","12 puntos","20 puntos"]', 0,
 'Desde los 12 puntos, tres años sin sanciones dan 14, y otros tres años más elevan el saldo a un máximo de 15.',
 'Art. 60 LSV', 3, '{B}', '{sanciones,puntos}'),

('sanciones',
 'Conducir sujetando el teléfono móvil con la mano supone la pérdida de...',
 '["6 puntos","3 puntos","4 puntos"]', 0,
 'La reforma de la Ley 18/2021 elevó esta infracción de 3 a 6 puntos, además de una multa de 200 euros.',
 'Anexo II LSV (redacción Ley 18/2021)', 2, '{B,A1,A2,A,AM}', '{sanciones,puntos,movil}'),

('sanciones',
 'No hacer uso del cinturón de seguridad, casco o sistema de retención infantil supone la pérdida de...',
 '["4 puntos","3 puntos","6 puntos"]', 0,
 'Desde marzo de 2022 esta infracción detrae 4 puntos, frente a los 3 anteriores, y conlleva multa de 200 euros.',
 'Anexo II LSV (redacción Ley 18/2021)', 3, '{B,A1,A2,A,AM}', '{sanciones,puntos,cinturon}'),

('sanciones',
 'Adelantar a un ciclista sin respetar la separación mínima de 1,5 metros supone...',
 '["Una infracción grave con pérdida de 6 puntos","Una infracción leve sin puntos","Una simple advertencia"]', 0,
 'Poner en peligro a un ciclista al adelantar sin la separación reglamentaria es infracción grave, sancionada con 200 euros y la detracción de 6 puntos.',
 'Anexo II LSV (redacción Ley 18/2021)', 3, '{B,A2,A}', '{sanciones,puntos,ciclistas}'),

('sanciones',
 'El importe de una infracción muy grave es, con carácter general, de...',
 '["500 euros","200 euros","100 euros"]', 0,
 'Las infracciones leves se sancionan con hasta 100 euros, las graves con 200 y las muy graves con 500, salvo cuantías específicas previstas por la ley.',
 'Art. 80 LSV', 2, '{B,A1,A2,A,AM}', '{sanciones,importes}'),

('sanciones',
 'Si paga voluntariamente la multa dentro del plazo establecido, obtiene una reducción del...',
 '["50 %","30 %","20 %"]', 0,
 'El pago dentro de los 20 días naturales siguientes a la notificación reduce el importe a la mitad, pero implica la renuncia a formular alegaciones.',
 'Art. 94 LSV', 2, '{B,A1,A2,A,AM}', '{sanciones,procedimiento}'),

('sanciones',
 'Un conductor que agota su saldo de puntos...',
 '["Pierde la vigencia del permiso y debe superar un curso y una prueba para recuperarlo","Solo paga una multa mayor","Recupera los puntos automáticamente al año"]', 0,
 'Agotado el saldo, el permiso pierde vigencia. Hay que esperar seis meses (tres para profesionales), superar un curso de reeducación vial y aprobar una prueba de control de conocimientos.',
 'Art. 63 y 71 LSV', 3, '{B,A1,A2,A,AM}', '{sanciones,puntos,recuperacion}'),

('sanciones',
 'Mediante un curso de sensibilización y reeducación vial se pueden recuperar hasta...',
 '["6 puntos, y como máximo una vez cada dos años","12 puntos cada año","Todos los puntos perdidos"]', 0,
 'El curso parcial permite recuperar hasta 6 puntos, sin superar nunca el crédito inicial, y solo puede realizarse una vez cada dos años.',
 'Art. 63 LSV', 3, '{B,A1,A2,A,AM}', '{sanciones,puntos,recuperacion}'),

('sanciones',
 'Conducir con una tasa de alcohol en aire espirado superior a 0,50 mg/l supone la pérdida de...',
 '["6 puntos","4 puntos","2 puntos"]', 0,
 'Entre 0,25 y 0,50 mg/l se detraen 4 puntos; por encima de 0,50 mg/l, 6 puntos.',
 'Anexo II LSV', 3, '{B,A1,A2,A,AM}', '{sanciones,puntos,alcohol}'),

-- ---------------------------------------------------------------------------
-- TRANSPORTE Y CARGA
-- ---------------------------------------------------------------------------
('transporte',
 'La carga que sobresale por la parte trasera de un vehículo debe señalizarse con...',
 '["Un panel V-20 reflectante a rayas rojas y blancas","Un trapo rojo","Las luces de emergencia únicamente"]', 0,
 'La carga que sobresale se señaliza con el panel V-20; de noche o con poca visibilidad debe añadirse una luz roja.',
 'Art. 14 LSV y Anexo XI RGV', 2, '{B,C,C1}', '{transporte,carga}'),

('transporte',
 'En un turismo, la carga puede sobresalir por la parte posterior como máximo...',
 '["Un 10 % de la longitud del vehículo","Un 25 %","No puede sobresalir nada"]', 0,
 'Con carácter general la carga puede sobresalir un 10 % de la longitud del vehículo por detrás; en cargas indivisibles y largas se admite hasta el 15 %.',
 'Art. 15 RGC y Anexo IX RGV', 3, '{B}', '{transporte,carga,dimensiones}'),

('transporte',
 '¿De quién es la responsabilidad de que la carga vaya correctamente estibada?',
 '["Del conductor, y también del cargador y del transportista según el caso","Solo del cargador","Solo del propietario de la mercancía"]', 0,
 'El conductor responde de que la carga esté bien colocada y sujeta, sin perjuicio de la responsabilidad que corresponde a cargador, expedidor y transportista.',
 'Art. 14 LSV', 3, '{C,C1,CE,B}', '{transporte,carga,responsabilidad}'),

('transporte',
 'El número de personas transportadas en un vehículo...',
 '["No puede exceder de las plazas autorizadas en la ficha técnica","Puede superarse si son niños","Puede superarse en trayectos cortos"]', 0,
 'Está prohibido transportar más personas que las plazas que figuran en la tarjeta de inspección técnica, sin excepciones por edad ni por distancia.',
 'Art. 10 RGC', 2, '{B,C,D}', '{transporte,pasajeros}'),

-- ---------------------------------------------------------------------------
-- CONDUCCIÓN EFICIENTE
-- ---------------------------------------------------------------------------
('conduccion-eficiente',
 'En un vehículo de gasolina moderno, la conducción eficiente aconseja cambiar a una marcha superior en torno a...',
 '["2.000-2.500 revoluciones por minuto","4.000 revoluciones por minuto","1.000 revoluciones por minuto"]', 0,
 'Circular en la marcha más larga posible a bajas revoluciones reduce el consumo y las emisiones. En diésel el cambio se realiza algo antes, sobre las 1.500-2.000 rpm.',
 'Guía de conducción eficiente del IDAE y la DGT', 2, '{B}', '{eficiente,consumo}'),

('conduccion-eficiente',
 'Si va a estar detenido más de un minuto, lo más eficiente es...',
 '["Apagar el motor","Mantenerlo al ralentí","Acelerar suavemente para no calarlo"]', 0,
 'El ralentí consume combustible sin producir desplazamiento. Detenciones superiores al minuto justifican apagar el motor, algo que hacen automáticamente los sistemas Start-Stop.',
 'Guía de conducción eficiente del IDAE y la DGT', 2, '{B}', '{eficiente,consumo}'),

('conduccion-eficiente',
 'Para retener el vehículo en una bajada prolongada, lo correcto y más eficiente es...',
 '["Usar el freno motor con una marcha adecuada","Ir en punto muerto para ahorrar","Frenar continuamente con el pedal"]', 0,
 'El freno motor no consume combustible en los motores actuales y evita el calentamiento y la pérdida de eficacia de los frenos, la llamada fatiga de frenos.',
 'Guía de conducción eficiente del IDAE y la DGT', 2, '{B,C,D}', '{eficiente,freno-motor}'),

('conduccion-eficiente',
 'Circular con la baca montada aunque esté vacía...',
 '["Aumenta el consumo por la mayor resistencia aerodinámica","No afecta al consumo","Reduce el consumo al estabilizar el vehículo"]', 0,
 'Los elementos que alteran la aerodinámica pueden incrementar el consumo en torno a un 10 %, por lo que conviene desmontarlos cuando no se usan.',
 'Guía de conducción eficiente del IDAE', 2, '{B}', '{eficiente,consumo}'),

('conduccion-eficiente',
 'Anticiparse al tráfico y levantar el pie del acelerador con antelación...',
 '["Reduce el consumo y el desgaste de los frenos","Solo sirve en autopista","Aumenta el riesgo de alcance"]', 0,
 'La conducción anticipativa, mirando lejos y evitando acelerones y frenazos, es la técnica que más ahorro produce y además mejora la seguridad.',
 'Guía de conducción eficiente del IDAE y la DGT', 1, '{B}', '{eficiente,anticipacion}')

) as v(topic_code, q, opts, ok, expl, ref, diff, lic, tg)
join topics t on t.code = v.topic_code;
