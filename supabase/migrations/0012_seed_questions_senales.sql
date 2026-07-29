-- ===========================================================================
-- 0012_seed_questions_senales.sql
-- Bloque 2: señales y marcas viales, maniobras, autopistas y vías especiales
-- ===========================================================================

insert into questions (topic_id, text, options, correct_index, explanation, legal_ref, difficulty, licenses, tags)
select t.id, v.q, v.opts::jsonb, v.ok, v.expl, v.ref, v.diff, v.lic::license_class[], v.tg::text[]
from (values

-- ---------------------------------------------------------------------------
-- SEÑALES
-- ---------------------------------------------------------------------------
('senales',
 'Las señales triangulares con el fondo blanco y el borde rojo son señales de...',
 '["Advertencia de peligro","Prohibición","Obligación"]', 0,
 'La forma triangular con vértice hacia arriba, fondo blanco y borde rojo identifica a las señales de advertencia de peligro, que anuncian un riesgo próximo.',
 'Art. 149 RGC', 1, '{B,A1,A2,A,AM}', '{senales,peligro}'),

('senales',
 'Una señal circular con el fondo blanco y el borde rojo indica generalmente...',
 '["Una prohibición o restricción","Una obligación","El fin de una limitación"]', 0,
 'Las señales de reglamentación circulares con fondo blanco y borde rojo imponen prohibiciones o restricciones.',
 'Art. 152 RGC', 1, '{B,A1,A2,A,AM}', '{senales,prohibicion}'),

('senales',
 'Una señal circular de fondo azul con un símbolo blanco indica...',
 '["Una obligación","Una prohibición","Una advertencia"]', 0,
 'Las señales circulares de fondo azul son de obligación: imponen un comportamiento determinado, como un sentido obligatorio o el uso de cadenas.',
 'Art. 153 RGC', 1, '{B,A1,A2,A,AM}', '{senales,obligacion}'),

('senales',
 'La señal R-101 (círculo rojo con banda blanca horizontal) significa...',
 '["Entrada prohibida a toda clase de vehículos","Prohibido adelantar","Calle sin salida"]', 0,
 'Es la señal de entrada prohibida, popularmente llamada dirección prohibida: impide el acceso a toda clase de vehículos por ese punto.',
 'Art. 152 RGC, señal R-101', 2, '{B,A1,A2,A,AM}', '{senales,prohibicion}'),

('senales',
 'La señal R-1 de Ceda el paso tiene forma...',
 '["Triangular con el vértice hacia abajo","Octogonal","Circular"]', 0,
 'El Ceda el paso es un triángulo equilátero con un vértice hacia abajo, fondo blanco y borde rojo.',
 'Art. 151 RGC, señal R-1', 1, '{B,A1,A2,A,AM}', '{senales,prioridad}'),

('senales',
 'La única señal de forma octogonal del catálogo es...',
 '["La de detención obligatoria (STOP)","La de ceda el paso","La de prohibido el paso"]', 0,
 'El STOP es la única señal octogonal, precisamente para que sea reconocible incluso si está sucia, nevada o vista desde atrás.',
 'Art. 151 RGC, señal R-2', 2, '{B,A1,A2,A,AM}', '{senales,prioridad,stop}'),

('senales',
 'Una señal cuadrada de fondo azul con un rombo amarillo indica...',
 '["Calzada con prioridad","Fin de la prioridad","Vía reservada a automóviles"]', 0,
 'La señal R-3 de calzada con prioridad advierte de que la vía por la que se circula tiene preferencia en las próximas intersecciones.',
 'Art. 151 RGC, señal R-3', 3, '{B}', '{senales,prioridad}'),

('senales',
 'Una señal rectangular blanca con el borde y el símbolo negros, colocada bajo otra señal, es...',
 '["Un panel complementario","Una señal de indicación","Una señal de orientación"]', 0,
 'Los paneles complementarios precisan o limitan el alcance de la señal bajo la que se sitúan, indicando distancia, longitud del tramo o vehículos afectados.',
 'Art. 165 RGC', 2, '{B}', '{senales,paneles}'),

('senales',
 'Una línea longitudinal continua en el centro de la calzada significa que...',
 '["No puede ser rebasada ni circular sobre ella","Puede rebasarse para adelantar con precaución","Solo delimita el arcén"]', 0,
 'La línea continua no puede ser rebasada ni pisada, salvo en los supuestos expresamente previstos, como el adelantamiento a ciclos respetando la separación mínima.',
 'Art. 167 RGC', 1, '{B,A1,A2,A,AM}', '{senales,marcas-viales}'),

('senales',
 'Una línea discontinua con trazos largos y separaciones cortas (línea de preaviso) indica que...',
 '["Se aproxima una línea continua","El adelantamiento acaba de quedar permitido","Se trata de un carril reversible"]', 0,
 'La línea discontinua de preaviso anuncia la proximidad de una línea continua, avisando de que conviene terminar el adelantamiento.',
 'Art. 167 RGC', 3, '{B}', '{senales,marcas-viales}'),

('senales',
 'Una línea longitudinal discontinua de color amarillo junto al bordillo significa...',
 '["Estacionamiento prohibido o limitado","Parada y estacionamiento prohibidos","Zona de carga y descarga permanente"]', 0,
 'La línea amarilla discontinua prohíbe o limita el estacionamiento; la continua prohíbe además la parada.',
 'Art. 171 RGC', 3, '{B}', '{senales,marcas-viales}'),

('senales',
 'Una línea longitudinal continua de color amarillo junto al bordillo significa...',
 '["Parada y estacionamiento prohibidos","Solo estacionamiento prohibido","Carril reservado a autobuses"]', 0,
 'La marca amarilla continua prohíbe la parada y el estacionamiento en todo el tramo que abarca.',
 'Art. 171 RGC', 3, '{B}', '{senales,marcas-viales}'),

('senales',
 'Una marca vial en zigzag de color amarillo indica...',
 '["Lugar reservado para un uso concreto, como una parada de autobús","Zona de obras","Paso de peatones próximo"]', 0,
 'La marca en zigzag señala un lugar de la calzada reservado a un uso determinado, típicamente paradas de transporte público, y prohíbe el estacionamiento.',
 'Art. 171 RGC', 4, '{B}', '{senales,marcas-viales}'),

('senales',
 'Los triángulos blancos pintados en el pavimento con el vértice hacia el conductor (dientes de dragón) indican...',
 '["La obligación de ceder el paso","Un paso de peatones","La proximidad de un badén"]', 0,
 'Esta marca vial, conocida como dientes de dragón o de tiburón, refuerza la obligación de ceder el paso.',
 'Art. 169 RGC', 3, '{B}', '{senales,marcas-viales}'),

('senales',
 'Una señal de peligro con la silueta de dos niños indica...',
 '["Peligro por la proximidad de un lugar frecuentado por niños","Zona escolar con prohibición de circular","Guardería con acceso prohibido"]', 0,
 'La señal P-21 advierte de un tramo donde es frecuente la presencia de niños, como colegios o parques, y obliga a extremar la precaución.',
 'Art. 149 RGC, señal P-21', 1, '{B,A1,A2,A,AM}', '{senales,peligro}'),

('senales',
 'La señal P-1 (triángulo con dos rayas convergentes) advierte de...',
 '["Una intersección con prioridad","Un estrechamiento de calzada","Una curva peligrosa"]', 0,
 'La señal P-1 anuncia una intersección con prioridad sobre la vía que se incorpora.',
 'Art. 149 RGC, señal P-1', 3, '{B}', '{senales,peligro}'),

('senales',
 'Una señal de prohibición deja de tener efecto...',
 '["En la próxima intersección, salvo que se indique otra cosa","Al cabo de 500 metros siempre","Solo cuando aparece la señal de fin de prohibición"]', 0,
 'Como regla general, las prohibiciones y restricciones acaban en la intersección siguiente, salvo que un panel complementario o una señal de fin indiquen otra cosa.',
 'Art. 152 RGC', 3, '{B}', '{senales,prohibicion}'),

('senales',
 'Un agente de tráfico con el brazo levantado verticalmente indica...',
 '["Detención de todos los usuarios que se aproximen","Vía libre para todos","Que debe reducir la velocidad"]', 0,
 'El brazo levantado verticalmente obliga a detenerse a todos los usuarios que se acerquen al agente, salvo los que estén dentro de la intersección.',
 'Art. 143 RGC', 2, '{B,A1,A2,A,AM}', '{senales,agentes}'),

('senales',
 'Un agente con el brazo extendido horizontalmente obliga a detenerse a...',
 '["Los usuarios que se aproximen frontalmente o por su espalda","Todos los usuarios sin excepción","Solo a los que vienen de frente"]', 0,
 'El brazo extendido horizontalmente detiene a quienes se acercan por delante o por detrás del agente; quienes llegan por sus costados pueden continuar.',
 'Art. 143 RGC', 3, '{B}', '{senales,agentes}'),

('senales',
 'Una luz roja intermitente en un paso a nivel significa...',
 '["Prohibición de pasar","Precaución, puede pasar despacio","Que la barrera está averiada"]', 0,
 'La luz roja intermitente prohíbe el paso; se emplea en pasos a nivel, puentes móviles y accesos a instalaciones especiales.',
 'Art. 146 RGC', 2, '{B,A1,A2,A,AM}', '{senales,semaforos,paso-nivel}'),

('senales',
 'Un semáforo con una flecha verde sobre fondo negro permite...',
 '["Realizar el movimiento indicado por la flecha","Pasar en cualquier dirección","Girar solo si no hay peatones, aunque el resto esté en rojo"]', 0,
 'La flecha verde autoriza únicamente el movimiento que señala, y obliga a ceder el paso a los peatones que crucen por el paso correspondiente.',
 'Art. 146 RGC', 3, '{B}', '{senales,semaforos}'),

-- ---------------------------------------------------------------------------
-- MANIOBRAS
-- ---------------------------------------------------------------------------
('maniobras',
 'Como norma general, el adelantamiento debe efectuarse...',
 '["Por la izquierda","Por la derecha","Por donde haya más espacio"]', 0,
 'Los adelantamientos se realizan por la izquierda; solo excepcionalmente se adelanta por la derecha, por ejemplo cuando el vehículo precedente ha indicado que va a girar a la izquierda.',
 'Art. 82 RGC', 1, '{B,A1,A2,A,AM}', '{maniobras,adelantamiento}'),

('maniobras',
 '¿En qué caso puede adelantar por la derecha?',
 '["Cuando el vehículo al que adelanta ha indicado que va a girar a la izquierda","Cuando el conductor de delante circula despacio","Cuando el carril izquierdo está ocupado"]', 0,
 'Se permite adelantar por la derecha si el vehículo precedente ha señalizado claramente su intención de girar a la izquierda y hay espacio suficiente.',
 'Art. 82.2 RGC', 3, '{B}', '{maniobras,adelantamiento}'),

('maniobras',
 'Desde la reforma de la Ley 18/2021, para adelantar en una carretera convencional, ¿puede superar en 20 km/h el límite de velocidad?',
 '["No, esa excepción quedó suprimida","Sí, durante el adelantamiento","Sí, solo si adelanta a un camión"]', 0,
 'La reforma que entró en vigor el 21 de marzo de 2022 eliminó el margen de 20 km/h para adelantar: hay que respetar el límite genérico de la vía en todo momento.',
 'Art. 51 RGC (derogado el margen por Ley 18/2021)', 3, '{B,A2,A}', '{maniobras,adelantamiento,velocidad}'),

('maniobras',
 'Está siendo adelantado. ¿Qué debe hacer?',
 '["Ceñirse al borde derecho y no aumentar la velocidad","Acelerar para acabar antes la maniobra","Frenar bruscamente para dejar hueco"]', 0,
 'El conductor adelantado debe ceñirse al borde derecho de la calzada y abstenerse de aumentar la velocidad o realizar maniobras que dificulten el adelantamiento.',
 'Art. 89 RGC', 2, '{B,A1,A2,A,AM}', '{maniobras,adelantamiento}'),

('maniobras',
 '¿Está prohibido adelantar en un cambio de rasante de visibilidad reducida?',
 '["Sí, salvo que exista más de un carril en el sentido de la marcha","No, si se hace con rapidez","Solo si hay línea continua"]', 0,
 'Se prohíbe adelantar en curvas y cambios de rasante de visibilidad reducida, salvo que la calzada tenga más de un carril en el sentido de la marcha.',
 'Art. 87 RGC', 2, '{B,A1,A2,A}', '{maniobras,adelantamiento}'),

('maniobras',
 'Puede adelantar a un vehículo que se ha detenido ante un paso de peatones...',
 '["No, está prohibido adelantar en los pasos para peatones","Sí, si no ve peatones","Sí, si lo hace despacio"]', 0,
 'Está prohibido adelantar en los pasos para peatones señalizados y en sus proximidades, porque el vehículo detenido oculta a quien pueda estar cruzando.',
 'Art. 87 RGC', 2, '{B,A1,A2,A,AM}', '{maniobras,adelantamiento,peatones}'),

('maniobras',
 'Antes de iniciar un cambio de carril debe...',
 '["Comprobar los espejos y el ángulo muerto, y señalizar la maniobra","Solo poner el intermitente","Solo mirar el retrovisor interior"]', 0,
 'Toda maniobra exige comprobar que no se crea peligro, lo que incluye espejos y ángulo muerto, y advertirla con antelación mediante el intermitente.',
 'Art. 74 y 100 RGC', 1, '{B,A1,A2,A,AM}', '{maniobras,cambio-carril}'),

('maniobras',
 '¿Dónde está prohibido efectuar un cambio de sentido?',
 '["En túneles, pasos inferiores y tramos de visibilidad reducida","Solo en autopista","Solo si hay línea continua"]', 0,
 'El cambio de sentido está prohibido en túneles, pasos inferiores, tramos afectados por la señal de túnel, autopistas, autovías y en general donde la visibilidad sea insuficiente.',
 'Art. 78 RGC', 2, '{B}', '{maniobras,cambio-sentido}'),

('maniobras',
 'La marcha atrás como maniobra...',
 '["Solo puede utilizarse como complemento de otra maniobra y en el menor recorrido posible","Puede usarse libremente fuera de poblado","Está permitida hasta 100 metros"]', 0,
 'La marcha atrás no puede emplearse como maniobra de circulación autónoma: solo es admisible como complemento de otra maniobra y durante el recorrido mínimo imprescindible.',
 'Art. 80 RGC', 2, '{B}', '{maniobras,marcha-atras}'),

('maniobras',
 'Diferencia entre parada y estacionamiento:',
 '["La parada no excede de dos minutos sin que el conductor abandone el vehículo","La parada no puede exceder de cinco minutos","No existe diferencia legal"]', 0,
 'La parada es una inmovilización de menos de dos minutos sin que el conductor abandone el vehículo; superado ese tiempo o si el conductor se aleja, se considera estacionamiento.',
 'Anexo I RGC, definiciones', 2, '{B,A1,A2,A,AM}', '{maniobras,estacionamiento}'),

('maniobras',
 '¿Está permitido estacionar sobre un paso de peatones?',
 '["No, está prohibido","Sí, si es por poco tiempo","Sí, con las luces de emergencia puestas"]', 0,
 'La parada y el estacionamiento están prohibidos sobre los pasos para peatones y ciclistas, en las curvas y cambios de rasante de visibilidad reducida y en carriles reservados, entre otros lugares.',
 'Art. 94 RGC', 1, '{B,A1,A2,A,AM}', '{maniobras,estacionamiento}'),

('maniobras',
 'Fuera de poblado, como norma general, el estacionamiento debe hacerse...',
 '["Fuera de la calzada, en el lado derecho, dejando libre la calzada y el arcén","En el arcén, siempre","En el carril derecho pegado al arcén"]', 0,
 'Fuera de poblado el vehículo debe situarse fuera de la calzada, por el lado derecho, y dejar libres tanto la calzada como el arcén.',
 'Art. 93 RGC', 3, '{B}', '{maniobras,estacionamiento}'),

('maniobras',
 'Va a abrir la puerta del vehículo estacionado junto a la acera. La forma más segura es...',
 '["Abrirla con la mano más alejada, girando el cuerpo para mirar atrás","Abrirla rápido para bajar cuanto antes","Abrirla con la mano izquierda mirando al frente"]', 0,
 'La llamada maniobra del holandés obliga a girar el tronco y permite ver por el espejo y por encima del hombro si se aproxima un ciclista o un vehículo. Abrir la puerta sin comprobarlo es infracción.',
 'Art. 100.3 RGC', 3, '{B}', '{maniobras,seguridad,ciclistas}'),

-- ---------------------------------------------------------------------------
-- AUTOPISTAS, TÚNELES Y VÍAS ESPECIALES
-- ---------------------------------------------------------------------------
('otras-vias',
 '¿Qué vehículos tienen prohibida la circulación por autopista?',
 '["Ciclomotores, vehículos de tracción animal y peatones, entre otros","Solo los camiones","Solo las motocicletas de menos de 125 cc"]', 0,
 'La autopista está reservada a automóviles. Quedan excluidos peatones, animales, ciclos, ciclomotores y vehículos que no puedan alcanzar la velocidad mínima.',
 'Art. 38 y Anexo I RGC', 2, '{B}', '{autopista,normas}'),

('otras-vias',
 'Para incorporarse a una autopista desde el carril de aceleración debe...',
 '["Adaptar su velocidad a la de la vía y ceder el paso a los que circulan por ella","Entrar directamente, porque tiene prioridad","Detenerse al final del carril y esperar un hueco"]', 0,
 'El carril de aceleración sirve para igualar la velocidad de la vía principal; la prioridad la tienen siempre los vehículos que ya circulan por la autopista.',
 'Art. 61 RGC', 2, '{B}', '{autopista,incorporacion,prioridad}'),

('otras-vias',
 'Al circular por un túnel debe llevar encendidas...',
 '["Al menos las luces de cruce","Solo las de posición","Ninguna si el túnel está iluminado"]', 0,
 'En los túneles es obligatorio el uso del alumbrado de cruce, con independencia de la iluminación del propio túnel.',
 'Art. 103 RGC', 1, '{B,A1,A2,A}', '{tuneles,alumbrado}'),

('otras-vias',
 'Si su vehículo se avería dentro de un túnel, lo primero que debe hacer es...',
 '["Apartarlo si es posible, apagar el motor y encender las luces de emergencia","Salir corriendo del túnel sin más","Quedarse dentro del vehículo con el motor encendido"]', 0,
 'La secuencia correcta es apartar el vehículo hacia el apartadero o el borde, apagar el motor, dejar las luces de emergencia encendidas y avisar por los postes SOS.',
 'Art. 118 RGC y protocolos de seguridad en túneles', 3, '{B}', '{tuneles,emergencias}'),

('otras-vias',
 'Ante un paso a nivel sin barreras, ¿qué debe hacer?',
 '["Detenerse si es preciso y comprobar que no se aproxima ningún tren","Pasar deprisa para reducir el tiempo de exposición","Tocar el claxon y cruzar"]', 0,
 'Al aproximarse a un paso a nivel hay que moderar la velocidad, detenerse si fuera necesario y cerciorarse de que no se aproxima ningún vehículo ferroviario.',
 'Art. 135 RGC', 2, '{B,A1,A2,A,AM}', '{paso-nivel,prioridad}'),

('otras-vias',
 'Su vehículo queda detenido sobre un paso a nivel y no arranca. Debe...',
 '["Sacar a los ocupantes y avisar por los medios disponibles al responsable de la vía férrea","Esperar dentro intentando arrancar","Empujar el vehículo lentamente sin bajar a nadie"]', 0,
 'La prioridad absoluta es evacuar a los ocupantes y alejarlos de la vía, y después avisar para que se detenga la circulación ferroviaria.',
 'Art. 136 RGC', 3, '{B}', '{paso-nivel,emergencias}'),

('otras-vias',
 'En una autovía, ¿está permitido detenerse en el arcén para descansar?',
 '["No, la parada y el estacionamiento están prohibidos salvo emergencia","Sí, si son menos de 15 minutos","Sí, si enciende las luces de emergencia"]', 0,
 'En autopistas y autovías está prohibida la parada y el estacionamiento fuera de las áreas de servicio o descanso, salvo por causa de fuerza mayor.',
 'Art. 94 RGC', 2, '{B}', '{autopista,estacionamiento}')

) as v(topic_code, q, opts, ok, expl, ref, diff, lic, tg)
join topics t on t.code = v.topic_code;
