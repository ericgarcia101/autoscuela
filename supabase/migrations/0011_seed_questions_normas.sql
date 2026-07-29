-- ===========================================================================
-- 0011_seed_questions_normas.sql
-- Bloque 1: normas de circulación, velocidad y distancias, prioridad
--
-- Todas las preguntas están redactadas sobre el articulado vigente:
--   RGC  = RD 1428/2003, Reglamento General de Circulación
--   LSV  = RDL 6/2015, texto refundido de la Ley sobre Tráfico
--          (con las reformas de la Ley 18/2021, en vigor desde 21/03/2022)
--   RGV  = RD 2822/1998, Reglamento General de Vehículos
-- El campo legal_ref permite auditar cada respuesta contra su fuente.
-- ===========================================================================

insert into questions (topic_id, text, options, correct_index, explanation, legal_ref, difficulty, licenses, tags)
select t.id, v.q, v.opts::jsonb, v.ok, v.expl, v.ref, v.diff, v.lic::license_class[], v.tg::text[]
from (values

-- ---------------------------------------------------------------------------
-- NORMAS DE CIRCULACIÓN
-- ---------------------------------------------------------------------------
('normas-circulacion',
 'Por regla general, ¿por qué parte de la calzada debe circular un vehículo?',
 '["Por la derecha y lo más cerca posible del borde derecho","Por el centro de su carril, en cualquier posición","Por la izquierda si no viene nadie de frente"]', 0,
 'La norma básica es circular por la derecha y lo más cerca posible del borde derecho de la calzada, manteniendo la separación necesaria para garantizar la seguridad.',
 'Art. 29 RGC', 1, '{B,A1,A2,A,AM}', '{normas,posicion-calzada}'),

('normas-circulacion',
 'En una calzada con tres carriles por sentido separados por líneas discontinuas, fuera de poblado, ¿qué carril debe utilizar como norma general?',
 '["El situado más a su derecha","El central, para no molestar","Cualquiera, siempre que no supere el límite"]', 0,
 'Fuera de poblado se circula por el carril de la derecha; los demás quedan para adelantar o para cuando el de la derecha esté ocupado.',
 'Art. 31 RGC', 2, '{B}', '{normas,carriles}'),

('normas-circulacion',
 '¿Puede un turismo circular por el arcén?',
 '["No, salvo por razones de emergencia y en las excepciones previstas","Sí, siempre que el arcén sea transitable","Sí, cuando la calzada esté congestionada"]', 0,
 'El arcén no forma parte de la calzada y está reservado a peatones, ciclos y vehículos especiales. Un turismo solo lo utiliza por causa justificada, como una emergencia o una detención obligada.',
 'Art. 36 RGC', 2, '{B}', '{normas,arcen}'),

('normas-circulacion',
 '¿Está permitido circular marcha atrás por una autopista?',
 '["No, en ningún caso","Sí, si son menos de 50 metros","Sí, para tomar una salida que se ha pasado"]', 0,
 'La marcha atrás está prohibida en autopistas y autovías sin excepción. Si se pasa la salida hay que continuar hasta la siguiente.',
 'Art. 80 RGC', 1, '{B}', '{normas,autopista,marcha-atras}'),

('normas-circulacion',
 'Circula por una vía de doble sentido con dos carriles. ¿Cuándo puede utilizar el carril izquierdo?',
 '["Únicamente para adelantar o girar a la izquierda","Siempre que circule a la velocidad máxima","Cuando el carril derecho tenga baches"]', 0,
 'En vías de doble sentido con dos carriles, el izquierdo corresponde al sentido contrario. Solo se invade momentáneamente para adelantar o para preparar un giro a la izquierda cuando esté permitido.',
 'Art. 30 RGC', 2, '{B}', '{normas,carriles,doble-sentido}'),

('normas-circulacion',
 '¿Qué es un carril reversible?',
 '["Aquel en el que el sentido de circulación puede cambiarse según la señalización","Aquel reservado a vehículos que dan la vuelta","Un carril exclusivo para vehículos de emergencia"]', 0,
 'El carril reversible cambia de sentido según las necesidades del tráfico y está delimitado por marcas viales de doble línea discontinua y señalizado con semáforos o paneles de mensaje variable.',
 'Art. 39 RGC', 3, '{B}', '{normas,carriles}'),

('normas-circulacion',
 'En un carril reservado al transporte público (carril BUS), un turismo particular...',
 '["No puede circular por él","Puede circular si no hay autobuses a la vista","Puede circular si lleva al menos dos ocupantes"]', 0,
 'Los carriles reservados solo pueden ser utilizados por los vehículos autorizados que indique la señalización. Un turismo particular no está entre ellos.',
 'Art. 38 RGC', 1, '{B}', '{normas,carriles,bus}'),

('normas-circulacion',
 '¿Qué debe hacer si se aproxima un vehículo de emergencia con la señal luminosa y acústica en funcionamiento?',
 '["Facilitarle el paso apartándose y deteniéndose si es preciso","Acelerar para no entorpecerle","Mantener su marcha, él ya buscará hueco"]', 0,
 'Los conductores deben facilitar el paso a los vehículos en servicio de urgencia, apartándose hacia el borde derecho y deteniéndose si fuera necesario.',
 'Art. 69 RGC', 1, '{B,A1,A2,A,AM}', '{normas,prioridad,emergencias}'),

('normas-circulacion',
 'Se ha formado una retención en autopista. ¿Cómo deben colocarse los vehículos para dejar un pasillo de emergencia?',
 '["Los del carril izquierdo hacia la izquierda y los del resto hacia la derecha","Todos hacia el arcén derecho","Todos hacia el centro de la calzada"]', 0,
 'El pasillo de emergencia se abre entre el carril izquierdo y el contiguo: los del carril izquierdo se arriman a su izquierda y los demás a su derecha, dejando el hueco central libre para los servicios de auxilio.',
 'Art. 70 RGC', 3, '{B}', '{normas,emergencias,autopista}'),

('normas-circulacion',
 '¿Está permitido arrojar por la ventanilla una colilla apagada?',
 '["No, es una infracción grave que además detrae puntos","Sí, si está completamente apagada","Sí, fuera de poblado"]', 0,
 'Arrojar a la vía objetos que puedan producir incendios o accidentes es infracción grave y conlleva la detracción de 6 puntos.',
 'Art. 76 LSV y anexo II LSV', 2, '{B,A1,A2,A,AM}', '{normas,sanciones,puntos}'),

('normas-circulacion',
 'Circula por una vía urbana y observa un peatón esperando en un paso de peatones sin semáforo. Debe...',
 '["Detenerse y cederle el paso","Tocar el claxon para avisarle","Pasar rápido antes de que se decida"]', 0,
 'Los peatones tienen prioridad en los pasos debidamente señalizados. El conductor debe detenerse y permitirles cruzar.',
 'Art. 65 RGC', 1, '{B,A1,A2,A,AM}', '{normas,peatones,prioridad}'),

('normas-circulacion',
 'Va a girar a la derecha para entrar en otra vía y hay peatones cruzando por el paso de esa calle. ¿Quién tiene prioridad?',
 '["Los peatones","El conductor, porque ya ha iniciado el giro","El que llegue antes al paso"]', 0,
 'Cuando el vehículo gira para entrar en otra vía y hay peatones cruzándola, aunque no exista paso señalizado, los peatones tienen prioridad.',
 'Art. 65.1.b RGC', 2, '{B}', '{normas,peatones,prioridad,giro}'),

('normas-circulacion',
 '¿Puede utilizar el teléfono móvil sujetándolo con la mano mientras conduce?',
 '["No, y hacerlo supone la detracción de 6 puntos","Sí, si el vehículo está en movimiento a menos de 30 km/h","Sí, durante llamadas breves"]', 0,
 'Está prohibido usar dispositivos de telefonía que requieran sujeción manual. Desde la reforma de la Ley 18/2021 la infracción detrae 6 puntos.',
 'Art. 18 LSV y anexo II LSV', 1, '{B,A1,A2,A,AM}', '{normas,distracciones,puntos}'),

('normas-circulacion',
 '¿Está permitido llevar auriculares conectados a un reproductor de música mientras se conduce?',
 '["No, está prohibido","Sí, si solo se lleva en un oído","Sí, si el volumen es bajo"]', 0,
 'Se prohíbe conducir utilizando cascos o auriculares conectados a aparatos receptores o reproductores de sonido.',
 'Art. 18.2 LSV', 1, '{B,A1,A2,A,AM}', '{normas,distracciones}'),

('normas-circulacion',
 'Un ciclista circula por el arcén de una carretera convencional. Usted se aproxima por detrás. ¿Qué debe hacer?',
 '["Adelantarle dejando al menos 1,5 metros de separación lateral","Avisarle con el claxon y pasar sin apartarse","Pasar por su izquierda sin cambiar de trayectoria"]', 0,
 'El adelantamiento a ciclos exige una separación lateral mínima de 1,5 metros, ocupando para ello parte o la totalidad del carril contiguo, incluso rebasando la línea continua si es necesario y seguro.',
 'Art. 35 RGC', 1, '{B,A1,A2,A}', '{normas,ciclistas,adelantamiento}'),

('normas-circulacion',
 'Dentro de poblado, en una vía con dos carriles por sentido, para adelantar a un ciclista usted...',
 '["Debe cambiar completamente de carril","Basta con dejar 1,5 metros sin cambiar de carril","Puede pasar por el mismo carril si va despacio"]', 0,
 'Desde la reforma de 2021, en vías urbanas de dos o más carriles por sentido es obligatorio cambiar completamente de carril para adelantar a un ciclo.',
 'Art. 35 RGC (redacción Ley 18/2021)', 3, '{B}', '{normas,ciclistas,adelantamiento}'),

('normas-circulacion',
 '¿Cuándo está permitido hacer uso de las señales acústicas (claxon) en poblado?',
 '["Solo para evitar un accidente y por los conductores de vehículos de urgencia","Siempre que se quiera avisar a otro conductor","Cuando el semáforo se pone verde y el de delante no arranca"]', 0,
 'En poblado el claxon solo puede emplearse para evitar un posible accidente y por los conductores de vehículos en servicio de urgencia.',
 'Art. 110 RGC', 2, '{B,A1,A2,A,AM}', '{normas,senales-acusticas}'),

('normas-circulacion',
 '¿Es obligatorio señalizar con el intermitente una incorporación a la circulación desde un estacionamiento?',
 '["Sí, siempre","Solo si hay otros vehículos cerca","Solo fuera de poblado"]', 0,
 'Toda maniobra que altere la trayectoria, incluida la incorporación a la circulación, debe advertirse con antelación suficiente mediante las señales ópticas del vehículo.',
 'Art. 100 RGC', 1, '{B,A1,A2,A,AM}', '{normas,senalizacion,maniobras}'),

('normas-circulacion',
 'La luz de emergencia (warning) debe utilizarse...',
 '["Cuando el vehículo quede inmovilizado en lugar peligroso o cause peligro a otros usuarios","Para justificar un estacionamiento en doble fila","Siempre que llueva con intensidad"]', 0,
 'El alumbrado de emergencia se enciende cuando el vehículo quede inmovilizado en la calzada o en circunstancias que reduzcan la visibilidad y supongan peligro, incluida la advertencia de una retención.',
 'Art. 104 RGC', 2, '{B}', '{normas,alumbrado}'),

('normas-circulacion',
 'Desde el 1 de enero de 2026, para señalizar un vehículo inmovilizado en la calzada es obligatorio utilizar...',
 '["La baliza luminosa V-16 conectada","Los dos triángulos de preseñalización","Un chaleco reflectante colocado sobre el techo"]', 0,
 'La baliza V-16 conectada a la plataforma DGT 3.0 sustituye desde el 1 de enero de 2026 a los triángulos de preseñalización de peligro.',
 'RD 1030/2022 y Anexo XI RGV', 2, '{B,A1,A2,A}', '{normas,emergencias,v16}'),

('normas-circulacion',
 'Si debe abandonar el vehículo inmovilizado en la calzada fuera de poblado, ¿qué debe ponerse antes de salir?',
 '["El chaleco reflectante de alta visibilidad","Solo las luces de emergencia bastan","Nada en especial si es de día"]', 0,
 'El conductor que salga del vehículo inmovilizado en la calzada o en el arcén debe utilizar el chaleco reflectante homologado.',
 'Art. 118 RGC', 1, '{B}', '{normas,emergencias,seguridad}'),

-- ---------------------------------------------------------------------------
-- VELOCIDAD Y DISTANCIAS
-- ---------------------------------------------------------------------------
('velocidad-distancias',
 '¿Cuál es la velocidad máxima genérica de un turismo en autopista?',
 '["120 km/h","110 km/h","130 km/h"]', 0,
 'Los turismos y motocicletas pueden circular a un máximo de 120 km/h en autopistas y autovías, salvo señalización que indique otra cosa.',
 'Art. 48 RGC', 1, '{B,A2,A}', '{velocidad,autopista}'),

('velocidad-distancias',
 '¿Cuál es la velocidad máxima genérica de un turismo en una carretera convencional fuera de poblado?',
 '["90 km/h","100 km/h","80 km/h"]', 0,
 'Desde la reforma de 2019 todas las carreteras convencionales tienen un límite genérico de 90 km/h para turismos y motocicletas, con independencia del arcén.',
 'Art. 48 RGC (redacción RD 1514/2018)', 1, '{B,A2,A}', '{velocidad,convencional}'),

('velocidad-distancias',
 'En una vía urbana de un único carril por sentido de circulación, la velocidad máxima genérica es...',
 '["30 km/h","50 km/h","20 km/h"]', 0,
 'Desde el 11 de mayo de 2021 el límite en vías urbanas de un solo carril por sentido es de 30 km/h.',
 'Art. 50 RGC (redacción RD 970/2020)', 2, '{B,A1,A2,A,AM}', '{velocidad,urbana}'),

('velocidad-distancias',
 'En una vía urbana de plataforma única, donde acera y calzada están al mismo nivel, la velocidad máxima es...',
 '["20 km/h","30 km/h","10 km/h"]', 0,
 'Las vías de plataforma única de calzada y acera tienen un límite genérico de 20 km/h.',
 'Art. 50 RGC (redacción RD 970/2020)', 2, '{B,A1,A2,A,AM}', '{velocidad,urbana}'),

('velocidad-distancias',
 'En una avenida urbana con dos carriles por sentido, la velocidad máxima genérica es...',
 '["50 km/h","30 km/h","60 km/h"]', 0,
 'Las vías urbanas con dos o más carriles por sentido de circulación mantienen el límite genérico de 50 km/h.',
 'Art. 50 RGC (redacción RD 970/2020)', 2, '{B}', '{velocidad,urbana}'),

('velocidad-distancias',
 '¿Cuál es la velocidad mínima genérica en autopista?',
 '["60 km/h","40 km/h","80 km/h"]', 0,
 'La velocidad mínima en autopistas y autovías es de 60 km/h; circular por debajo entorpece la circulación salvo causa justificada.',
 'Art. 49 RGC', 2, '{B}', '{velocidad,autopista}'),

('velocidad-distancias',
 'Un camión de más de 3.500 kg de MMA circula por autopista. Su velocidad máxima genérica es...',
 '["90 km/h","100 km/h","120 km/h"]', 0,
 'Los camiones y vehículos con remolque tienen un límite genérico de 90 km/h en autopistas y autovías.',
 'Art. 48 RGC', 3, '{C,C1,CE}', '{velocidad,camion}'),

('velocidad-distancias',
 'Un autobús circula por autopista. Su velocidad máxima genérica es...',
 '["100 km/h","90 km/h","120 km/h"]', 0,
 'Los autobuses tienen un límite genérico de 100 km/h en autopistas y autovías.',
 'Art. 48 RGC', 3, '{D,D1}', '{velocidad,autobus}'),

('velocidad-distancias',
 '¿A qué velocidad máxima puede circular un ciclomotor?',
 '["45 km/h","50 km/h","60 km/h"]', 0,
 'Los ciclomotores no pueden superar los 45 km/h en ninguna vía, por su propia definición técnica.',
 'Art. 48 RGC y Anexo II RGV', 1, '{AM}', '{velocidad,ciclomotor}'),

('velocidad-distancias',
 'La distancia de detención de un vehículo es la suma de...',
 '["La distancia de reacción y la distancia de frenado","La distancia de frenado y la distancia de seguridad","La distancia recorrida durante el frenado únicamente"]', 0,
 'Mientras el conductor percibe y reacciona el vehículo sigue avanzando; a esa distancia de reacción se le suma la de frenado para obtener la distancia total de detención.',
 'Art. 54 RGC', 2, '{B,A1,A2,A}', '{velocidad,distancias,frenado}'),

('velocidad-distancias',
 'Si duplica su velocidad, la distancia de frenado aproximadamente...',
 '["Se multiplica por cuatro","Se duplica","Se mantiene igual"]', 0,
 'La distancia de frenado crece con el cuadrado de la velocidad: al doblar la velocidad, la distancia necesaria para detenerse se multiplica por cuatro.',
 'Principio físico aplicado en el art. 45 RGC', 3, '{B,A1,A2,A}', '{velocidad,frenado}'),

('velocidad-distancias',
 'La llamada regla de los dos segundos sirve para...',
 '["Calcular la distancia de seguridad con el vehículo precedente","Medir el tiempo de reacción ante un semáforo","Saber cuánto tarda en arrancar el motor"]', 0,
 'Consiste en tomar una referencia fija y comprobar que pasan al menos dos segundos entre que la rebasa el vehículo de delante y la rebasa usted. En condiciones adversas conviene doblarla.',
 'Art. 54 RGC', 2, '{B,A1,A2,A}', '{velocidad,distancias}'),

('velocidad-distancias',
 'Un vehículo de más de 3.500 kg de MMA, fuera de poblado, debe dejar con el vehículo que le precede una separación mínima de...',
 '["50 metros","30 metros","100 metros"]', 0,
 'Los vehículos de más de 3.500 kg o de más de 10 metros de longitud deben dejar 50 metros con el que les precede fuera de poblado, salvo en zona de adelantamiento o tráfico congestionado.',
 'Art. 54.2 RGC', 4, '{C,C1,CE}', '{velocidad,distancias,camion}'),

('velocidad-distancias',
 '¿Debe reducir la velocidad al aproximarse a un paso de peatones no señalizado con semáforo?',
 '["Sí, y detenerse si es preciso","No, si no ve peatones","Solo si es de noche"]', 0,
 'Es obligatorio reducir la velocidad y, en su caso, detenerse al aproximarse a pasos de peatones, ciclistas y a lugares donde sea previsible la presencia de personas.',
 'Art. 46 RGC', 1, '{B,A1,A2,A,AM}', '{velocidad,peatones}'),

('velocidad-distancias',
 'La velocidad excesivamente reducida sin causa justificada...',
 '["Está prohibida porque entorpece la marcha de otros vehículos","Está permitida siempre, por prudencia","Solo está prohibida en autopista"]', 0,
 'No se puede entorpecer la marcha de otros vehículos circulando a velocidad anormalmente reducida sin causa justificada.',
 'Art. 49 RGC', 2, '{B}', '{velocidad,normas}'),

('velocidad-distancias',
 'Circula de noche por una carretera sin iluminación con las luces de cruce. ¿Cómo debe adecuar la velocidad?',
 '["De modo que pueda detenerse dentro del campo iluminado por sus faros","A la velocidad máxima permitida por la vía","A la mitad de la velocidad máxima siempre"]', 0,
 'El conductor debe poder detener el vehículo dentro de la zona que abarca su campo de visión, que de noche queda limitada al alcance de las luces de cruce.',
 'Art. 45 RGC', 2, '{B,A1,A2,A}', '{velocidad,noche,alumbrado}'),

-- ---------------------------------------------------------------------------
-- PRIORIDAD E INTERSECCIONES
-- ---------------------------------------------------------------------------
('prioridad',
 'Va a entrar en una glorieta. ¿Quién tiene prioridad?',
 '["Los vehículos que ya circulan por la calzada anular","Los que van a entrar, porque vienen de la derecha","El que llegue primero a la señal"]', 0,
 'En las glorietas tienen prioridad los vehículos que circulan por la calzada anular sobre los que pretenden acceder a ella.',
 'Art. 57 RGC', 1, '{B,A1,A2,A,AM}', '{prioridad,glorieta}'),

('prioridad',
 'En una intersección sin señalizar, ¿quién tiene preferencia?',
 '["El vehículo que se aproxima por la derecha","El vehículo que circula por la vía más ancha","El vehículo más pesado"]', 0,
 'En defecto de señalización, la preferencia corresponde al que se aproxima por la derecha, salvo las excepciones previstas en el Reglamento.',
 'Art. 57 RGC', 1, '{B,A1,A2,A,AM}', '{prioridad,interseccion}'),

('prioridad',
 'Ante una señal de STOP, ¿qué está obligado a hacer?',
 '["Detener completamente el vehículo en el lugar indicado y ceder el paso","Reducir la velocidad y pasar si no viene nadie","Detenerse solo si hay otros vehículos"]', 0,
 'La señal R-2 de detención obligatoria exige parar por completo el vehículo antes de la línea de detención y ceder el paso, aunque la vía esté despejada.',
 'Art. 151 y 152 RGC', 1, '{B,A1,A2,A,AM}', '{prioridad,stop,senales}'),

('prioridad',
 'Diferencia principal entre la señal de Ceda el paso y la de STOP:',
 '["Con Ceda el paso no es obligatorio detenerse si no hay que ceder","Con STOP no hay que ceder el paso","No hay ninguna diferencia práctica"]', 0,
 'El Ceda el paso obliga a ceder la prioridad, pero permite continuar sin detenerse si no se obstaculiza a nadie. El STOP obliga siempre a la detención completa.',
 'Art. 151 RGC', 2, '{B,A1,A2,A,AM}', '{prioridad,senales}'),

('prioridad',
 'En un tramo estrecho de gran pendiente donde no pueden cruzarse dos vehículos, ¿quién tiene prioridad?',
 '["El que sube","El que baja","El de mayor tonelaje"]', 0,
 'En tramos de gran pendiente y estrechos tiene prioridad el vehículo que sube, porque reanudar la marcha cuesta arriba es más difícil y peligroso.',
 'Art. 62 RGC', 2, '{B}', '{prioridad,pendiente}'),

('prioridad',
 'Se aproxima a un estrechamiento señalizado donde el obstáculo está en su carril. Debe...',
 '["Ceder el paso a los vehículos que circulan en sentido contrario","Pasar primero por ir más rápido","Tocar el claxon y continuar"]', 0,
 'Cuando el obstáculo se encuentra en el propio carril, el conductor debe ceder el paso a quienes circulan en sentido contrario, pues son ellos los que llevan la trayectoria libre.',
 'Art. 60 RGC', 2, '{B}', '{prioridad,estrechamiento}'),

('prioridad',
 'Un tranvía se aproxima a una intersección al mismo tiempo que usted. ¿Quién pasa primero?',
 '["El tranvía, que goza de prioridad","Usted, si viene por la derecha","El que llegue primero a la línea"]', 0,
 'Los vehículos que circulan sobre raíles tienen prioridad de paso sobre los demás usuarios, dada su imposibilidad de maniobrar.',
 'Art. 58 RGC', 2, '{B,A1,A2,A,AM}', '{prioridad,tranvia}'),

('prioridad',
 'Circula por una vía y va a incorporarse a ella un autobús que sale de una parada señalizada, dentro de poblado. Debe...',
 '["Cederle el paso, reduciendo la velocidad e incluso deteniéndose","Continuar, porque usted lleva prioridad","Adelantarle antes de que salga"]', 0,
 'En poblado, los conductores deben facilitar la incorporación de los autobuses de transporte colectivo de viajeros que salen de una parada señalizada.',
 'Art. 68 RGC', 3, '{B}', '{prioridad,autobus}'),

('prioridad',
 'Un ciclista circula por un carril bici que cruza la calzada por la que usted va a girar. ¿Quién tiene prioridad?',
 '["El ciclista","Usted, por circular por la calzada","El que llegue antes al cruce"]', 0,
 'Los ciclistas tienen prioridad cuando circulan por un carril bici, paso para ciclistas o arcén debidamente señalizados.',
 'Art. 64 RGC', 2, '{B}', '{prioridad,ciclistas}'),

('prioridad',
 'Aunque tenga prioridad de paso en una intersección, ¿puede penetrar en ella si previsiblemente quedará bloqueado?',
 '["No, debe esperar fuera de la intersección","Sí, siempre que tenga prioridad","Sí, si el semáforo está en verde"]', 0,
 'Ningún conductor debe penetrar en una intersección si la situación del tráfico hace previsible que quede detenido en ella obstaculizando la circulación transversal.',
 'Art. 59 RGC', 3, '{B}', '{prioridad,interseccion}'),

('prioridad',
 'Un semáforo en ámbar fijo significa que...',
 '["Debe detenerse, salvo que al encenderse esté tan cerca que no pueda hacerlo con seguridad","Puede pasar acelerando","Debe extremar la precaución pero puede pasar siempre"]', 0,
 'El ámbar no intermitente obliga a detenerse en el mismo lugar que el rojo, salvo que el vehículo se encuentre tan próximo que no pueda detenerse sin riesgo.',
 'Art. 146 RGC', 2, '{B,A1,A2,A,AM}', '{prioridad,semaforos,senales}'),

('prioridad',
 'Un semáforo con luz ámbar intermitente indica que...',
 '["Puede continuar la marcha extremando la precaución","Debe detenerse obligatoriamente","El semáforo está averiado y no rige"]', 0,
 'El ámbar intermitente obliga a extremar la precaución y a ceder el paso a peatones y vehículos que tengan preferencia, pero permite continuar.',
 'Art. 146 RGC', 2, '{B,A1,A2,A,AM}', '{prioridad,semaforos}'),

('prioridad',
 'Si un agente de la circulación le indica que pase y el semáforo está en rojo, ¿a quién obedece?',
 '["Al agente","Al semáforo","Al que llegue primero a su campo de visión"]', 0,
 'El orden de prioridad normativo sitúa las señales de los agentes por encima de la señalización circunstancial, los semáforos, las señales verticales y las marcas viales.',
 'Art. 132 RGC', 1, '{B,A1,A2,A,AM}', '{prioridad,agentes,senales}'),

('prioridad',
 '¿Cuál es el orden de prevalencia correcto de la señalización?',
 '["Agentes, señalización circunstancial, semáforos, señales verticales y marcas viales","Semáforos, agentes, señales verticales y marcas viales","Señales verticales, agentes, semáforos y marcas viales"]', 0,
 'Ese es el orden que fija el Reglamento cuando distintas señales resultan contradictorias entre sí.',
 'Art. 132 RGC', 3, '{B,A1,A2,A,AM}', '{prioridad,senales,agentes}')

) as v(topic_code, q, opts, ok, expl, ref, diff, lic, tg)
join topics t on t.code = v.topic_code;
