-- =============================================================================
-- COMPLEJO DEPORTIVO UB - DATOS DE PRUEBA (SEEDS)
-- Contraseñas de prueba: "password123" hasheada con bcrypt o texto para el demo
-- $2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a (hash de 'password123')
-- =============================================================================

USE complejo_deportivo_ub;

-- Limpieza previa en orden referencial
DELETE FROM audit_log;
DELETE FROM notificacion;
DELETE FROM sancion;
DELETE FROM partido;
DELETE FROM equipo_jugador;
DELETE FROM equipo;
DELETE FROM torneo;
DELETE FROM lista_espera;
DELETE FROM reserva;
DELETE FROM cancha;
DELETE FROM usuario;

-- -----------------------------------------------------------------------------
-- 1. USUARIOS (Clientes, Administradores, Árbitros)
-- -----------------------------------------------------------------------------
INSERT INTO usuario (id, nombre, email, contrasena_hash, rol, inasistencias, estado_cuenta, suspension_hasta, telefono) VALUES
(1, 'Administrador General', 'admin@complejoub.com', '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a', 'Administrador', 0, 'Activa', NULL, '+54 11 4567-8901'),
(2, 'Sebastian Norjean (Árbitro)', 'arbitro@complejoub.com', '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a', 'Arbitro', 0, 'Activa', NULL, '+54 11 5555-1122'),
(3, 'Marcos Perez del Cerro', 'mperez@complejoub.com', '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a', 'Arbitro', 0, 'Activa', NULL, '+54 11 5555-3344'),
(4, 'Lucas Díaz (Cliente / Capitán)', 'lucas@gmail.com', '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a', 'Cliente', 0, 'Activa', NULL, '+54 11 9876-5432'),
(5, 'Mateo Fernández', 'mateo@gmail.com', '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a', 'Cliente', 1, 'Activa', NULL, '+54 11 9876-5433'),
(6, 'Juan Paiva', 'juan@gmail.com', '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a', 'Cliente', 0, 'Activa', NULL, '+54 11 9876-5434'),
(7, 'Diego López', 'diego@gmail.com', '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a', 'Cliente', 0, 'Activa', NULL, '+54 11 9876-5435'),
(8, 'Gonzalo Higuaín', 'gonzalo@gmail.com', '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a', 'Cliente', 0, 'Activa', NULL, '+54 11 9876-5436'),
(9, 'Julián Álvarez', 'julian@gmail.com', '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a', 'Cliente', 0, 'Activa', NULL, '+54 11 9876-5437'),
(10, 'Enzo Fernández', 'enzo@gmail.com', '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a', 'Cliente', 0, 'Activa', NULL, '+54 11 9876-5438'),
(11, 'Rodrigo De Paul', 'rodrigo@gmail.com', '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a', 'Cliente', 0, 'Activa', NULL, '+54 11 9876-5439'),
(12, 'Usuario Sancionado Test', 'sancionado@gmail.com', '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a', 'Cliente', 3, 'Suspendida', DATE_ADD(NOW(), INTERVAL 14 DAY), '+54 11 9876-9999');

-- -----------------------------------------------------------------------------
-- 2. CANCHAS
-- -----------------------------------------------------------------------------
INSERT INTO cancha (id, nombre, deporte, superficie, techada, iluminacion, precio_hora, activa) VALUES
(1, 'Cancha 1 (Fútbol 5)', 'Futbol 5', 'Césped Sintético Pro', true, true, 18000.00, true),
(2, 'Cancha 2 (Fútbol 5)', 'Futbol 5', 'Césped Sintético', false, true, 16000.00, true),
(3, 'Cancha 3 (Fútbol 8)', 'Futbol 8', 'Césped Sintético Premium', false, true, 25000.00, true),
(4, 'Cancha 4 (Fútbol 11)', 'Futbol 11', 'Césped Natural AFA', false, true, 38000.00, true),
(5, 'Cancha Pádel A', 'Padel', 'Cristal Panorámico WPT', false, true, 14000.00, true),
(6, 'Cancha Pádel B (Techada)', 'Padel', 'Cristal Panorámico WPT', true, true, 16000.00, true),
(7, 'Cancha Tenis 1', 'Tenis', 'Polvo de Ladrillo', false, true, 12000.00, true),
(8, 'Cancha Tenis 2', 'Tenis', 'Rápida / Cemento', false, true, 11000.00, true);

-- -----------------------------------------------------------------------------
-- 3. RESERVAS
-- Regla de seña: 30% del valor total
-- -----------------------------------------------------------------------------
INSERT INTO reserva (id, fk_usuario_id, fk_cancha_id, fecha, hora, monto_total, monto_sena, sena_abonada, estado, devolucion_sena, asistencia_confirmada) VALUES
(1, 4, 1, CURDATE(), '19:00:00', 18000.00, 5400.00, true, 'CONFIRMADA', NULL, NULL),
(2, 5, 1, CURDATE(), '20:00:00', 18000.00, 5400.00, true, 'CONFIRMADA', NULL, NULL),
(3, 6, 2, CURDATE(), '21:00:00', 16000.00, 4800.00, true, 'CONFIRMADA', NULL, NULL),
(4, 7, 5, CURDATE(), '18:00:00', 14000.00, 4200.00, true, 'CONFIRMADA', NULL, NULL),
(5, 4, 7, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00', 12000.00, 3600.00, true, 'CONFIRMADA', NULL, NULL),
(6, 5, 2, DATE_SUB(CURDATE(), INTERVAL 3 DAY), '20:00:00', 16000.00, 4800.00, true, 'FINALIZADA', NULL, true),
(7, 12, 1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '22:00:00', 18000.00, 5400.00, true, 'INASISTENCIA', false, false),
(8, 6, 6, DATE_SUB(CURDATE(), INTERVAL 5 DAY), '19:00:00', 16000.00, 4800.00, true, 'CANCELADA', true, NULL);

-- -----------------------------------------------------------------------------
-- 4. LISTA DE ESPERA (RF-24)
-- -----------------------------------------------------------------------------
INSERT INTO lista_espera (id, fk_usuario_id, fk_cancha_id, fecha, hora, estado) VALUES
(1, 8, 1, CURDATE(), '19:00:00', 'PENDIENTE'),
(2, 9, 1, CURDATE(), '20:00:00', 'PENDIENTE'),
(3, 10, 5, CURDATE(), '18:00:00', 'NOTIFICADO');

-- -----------------------------------------------------------------------------
-- 5. TORNEOS (RF-07, RF-09)
-- -----------------------------------------------------------------------------
INSERT INTO torneo (id, nombre, deporte, costo_inscripcion, valor_partido, max_equipos, min_jugadores_equipo, max_jugadores_equipo, fecha_inicio, fecha_fin, estado, reglamento) VALUES
(1, 'Copa Verano - Fútbol 5', 'Futbol 5', 50000.00, 8000.00, 6, 5, 10, '2026-10-01', '2026-11-15', 'EN_CURSO', 'Modalidad liga todos contra todos. Puntos: 3 por victoria, 1 por empate, 0 por derrota. Señas e inscripciones simuladas.'),
(2, 'Torneo Apertura Pádel Parejas', 'Padel', 30000.00, 6000.00, 8, 2, 4, '2026-11-01', '2026-12-10', 'INSCRIPCION_ABIERTA', 'Partidos al mejor de 3 sets.'),
(3, 'Liga Nocturna Fútbol 8', 'Futbol 8', 75000.00, 12000.00, 8, 8, 15, '2026-08-01', '2026-09-15', 'FINALIZADO', 'Campeonato finalizado con éxito.');

-- -----------------------------------------------------------------------------
-- 6. EQUIPOS (RF-08, RF-11, RF-21)
-- -----------------------------------------------------------------------------
INSERT INTO equipo (id, fk_torneo_id, fk_capitan_id, nombre, puntos, partidos_jugados, partidos_ganados, partidos_empatados, partidos_perdidos, goles_favor, goles_contra, diferencia_goles, inscripcion_pagada) VALUES
(1, 1, 4, 'Los Galácticos FC', 9, 3, 3, 0, 0, 14, 4, 10, true),
(2, 1, 5, 'La Maquinita', 6, 3, 2, 0, 1, 11, 7, 4, true),
(3, 1, 6, 'Deportivo Rayo', 3, 3, 1, 0, 2, 8, 10, -2, true),
(4, 1, 7, 'Atlético Belgrano', 0, 3, 0, 0, 3, 5, 17, -12, true);

-- -----------------------------------------------------------------------------
-- 7. NÓMINA DE JUGADORES (RF-12, RF-13, RF-14, RF-15, RF-16)
-- -----------------------------------------------------------------------------
INSERT INTO equipo_jugador (fk_equipo_id, fk_usuario_id, dorsal, es_capitan, estado_invitacion, fecha_respuesta) VALUES
(1, 4, 10, true, 'ACEPTADA', NOW()),
(1, 8, 9, false, 'ACEPTADA', NOW()),
(1, 9, 7, false, 'ACEPTADA', NOW()),
(2, 5, 10, true, 'ACEPTADA', NOW()),
(2, 10, 8, false, 'ACEPTADA', NOW()),
(2, 11, 5, false, 'ACEPTADA', NOW()),
(3, 6, 1, true, 'ACEPTADA', NOW()),
(4, 7, 10, true, 'ACEPTADA', NOW());

-- -----------------------------------------------------------------------------
-- 8. PARTIDOS Y FIXTURE (RF-09, RF-10, RF-17, RF-18, RF-19)
-- -----------------------------------------------------------------------------
INSERT INTO partido (id, fk_torneo_id, fk_cancha_id, fk_equipo_local_id, fk_equipo_visitante_id, fk_arbitro_id, numero_fecha, fecha, hora, estado, goles_local, goles_visitante, observaciones) VALUES
-- Fecha 1 (Disputada)
(1, 1, 1, 1, 2, 2, 1, '2026-10-03', '19:00:00', 'DISPUTADO', 4, 2, 'Partido disputado con intensidad. Sin incidentes.'),
(2, 1, 2, 3, 4, 3, 1, '2026-10-03', '20:00:00', 'DISPUTADO', 5, 3, 'Excelente comportamiento de ambos planteles.'),

-- Fecha 2 (Disputada)
(3, 1, 1, 1, 3, 2, 2, '2026-10-10', '19:00:00', 'DISPUTADO', 6, 1, 'Dominio claro de Los Galácticos.'),
(4, 1, 2, 2, 4, 3, 2, '2026-10-10', '20:00:00', 'DISPUTADO', 5, 1, 'Victoria cómoda de La Maquinita.'),

-- Fecha 3 (Disputada)
(5, 1, 1, 1, 4, 2, 3, '2026-10-17', '19:00:00', 'DISPUTADO', 4, 1, 'Cierre de la primera rueda.'),
(6, 1, 2, 2, 3, 3, 3, '2026-10-17', '20:00:00', 'DISPUTADO', 4, 2, 'Partido parejo hasta el minuto final.'),

-- Fecha 4 (Próxima jornada - Programada para arbitraje)
(7, 1, 1, 2, 1, 2, 4, '2026-10-24', '19:00:00', 'PROGRAMADO', NULL, NULL, 'Partido clave por la punta del torneo.'),
(8, 1, 2, 4, 3, 3, 4, '2026-10-24', '20:00:00', 'PROGRAMADO', NULL, NULL, NULL),

-- Partido asignado al árbitro 2 para otra fecha
(9, 1, 1, 3, 1, 2, 5, '2026-10-31', '19:00:00', 'PROGRAMADO', NULL, NULL, NULL);

-- -----------------------------------------------------------------------------
-- 9. SANCIONES DISCIPLINARIAS (RF-20)
-- -----------------------------------------------------------------------------
INSERT INTO sancion (id, fk_usuario_id, fk_partido_id, tipo_sancion, descripcion, fecha_sancion, fk_creado_por_id) VALUES
(1, 12, NULL, 'Suspensión 2 semanas', 'Acumulación de 3 inasistencias consecutivas a turnos reservados.', NOW(), 1),
(2, 7, 2, 'Tarjeta Amarilla', 'Falta reiterada en mitad de cancha durante la Fecha 1.', '2026-10-03 20:35:00', 3),
(3, 6, 1, 'Tarjeta Amarilla', 'Conducta antideportiva por demorar el juego.', '2026-10-03 19:40:00', 2);

-- -----------------------------------------------------------------------------
-- 10. NOTIFICACIONES (RF-23)
-- -----------------------------------------------------------------------------
INSERT INTO notificacion (id, fk_usuario_id, titulo, mensaje, tipo, leida) VALUES
(1, 4, 'Reserva Confirmada', 'Tu turno para Cancha 1 el día de hoy a las 19:00 hs fue confirmado. Seña abonada: $5.400.', 'ReservaConfirmada', false),
(2, 4, 'Próximo Partido de Torneo', 'Tu equipo Los Galácticos FC juega el Sábado 24 Oct a las 19:00 hs vs La Maquinita.', 'RecordatorioTorneo', false),
(3, 12, 'Cuenta Suspendida', 'Has alcanzado 3 inasistencias consecutivas. Tu cuenta no podrá reservar canchas por 14 días.', 'Sancion', true),
(4, 2, 'Designación Arbitral', 'Has sido asignado para arbitrar el partido Los Galácticos FC vs La Maquinita el Sábado 24 Oct.', 'DesignacionArbitral', false);

-- -----------------------------------------------------------------------------
-- 11. AUDIT LOG (RF-26)
-- -----------------------------------------------------------------------------
INSERT INTO audit_log (id, fk_usuario_id, accion, entidad_afectada, entidad_id, detalles, ip_address) VALUES
(1, 1, 'CREAR_TORNEO', 'torneo', 1, '{"nombre":"Copa Verano - Fútbol 5","deporte":"Futbol 5","max_equipos":6}', '192.168.1.100'),
(2, 1, 'GENERAR_FIXTURE', 'partido', 1, '{"torneo_id":1,"total_fechas":5,"partidos_generados":10}', '192.168.1.100'),
(3, 2, 'CARGAR_RESULTADO', 'partido', 1, '{"goles_local":4,"goles_visitante":2,"estado":"DISPUTADO"}', '192.168.1.105'),
(4, 1, 'SUSPENDER_USUARIO', 'usuario', 12, '{"motivo":"3 inasistencias consecutivas","dias":14}', '192.168.1.100');
