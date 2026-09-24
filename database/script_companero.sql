CREATE DATABASE IF NOT EXISTS complejo_deportivo;
USE complejo_deportivo;

-- 1. TABLA USUARIOS 
CREATE TABLE IF NOT EXISTS usuario (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    rol ENUM('Cliente', 'Administrador', 'Arbitro') DEFAULT 'Cliente' NOT NULL,
    inasistencias INT DEFAULT 0 NOT NULL,
    estado_cuenta ENUM('Activa', 'Suspendida', 'Inactiva') DEFAULT 'Activa' NOT NULL,
    suspension_hasta DATETIME NULL,
    telefono VARCHAR(20) NULL,
    posicion_preferida VARCHAR(50) NULL
);

-- 2. TABLA CANCHAS
CREATE TABLE IF NOT EXISTS cancha (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    deporte ENUM('Futbol 5', 'Futbol 8', 'Futbol 11', 'Tenis', 'Padel') NOT NULL,
    superficie VARCHAR(50) NOT NULL,
    techada BOOLEAN DEFAULT FALSE NOT NULL,
    iluminacion BOOLEAN DEFAULT TRUE NOT NULL,
    precio_hora DECIMAL(10,2) NOT NULL,
    activa BOOLEAN DEFAULT TRUE NOT NULL,
    CONSTRAINT chk_cancha_precio CHECK (precio_hora > 0)
);

-- 3. TABLA RESERVAS
CREATE TABLE IF NOT EXISTS reserva (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fk_usuario_id BIGINT NOT NULL,
    fk_cancha_id BIGINT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    monto_total DECIMAL(10,2) NOT NULL,
    monto_sena DECIMAL(10,2) NOT NULL,
    sena_abonada BOOLEAN DEFAULT FALSE NOT NULL,
    estado ENUM('CONFIRMADA', 'CANCELADA', 'INASISTENCIA', 'FINALIZADA') DEFAULT 'CONFIRMADA' NOT NULL,
    devolucion_sena BOOLEAN DEFAULT FALSE NOT NULL,
    asistencia_confirmada BOOLEAN DEFAULT FALSE NOT NULL,
    notas_cancelacion TEXT NULL,
    FOREIGN KEY (fk_usuario_id) REFERENCES usuario(id) ON DELETE RESTRICT,
    FOREIGN KEY (fk_cancha_id) REFERENCES cancha(id) ON DELETE RESTRICT,
    CONSTRAINT uq_cancha_fecha_hora UNIQUE (fk_cancha_id, fecha, hora)
);

-- 4. TABLA LISTA DE ESPERA
CREATE TABLE IF NOT EXISTS lista_espera (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fk_usuario_id BIGINT NOT NULL,
    fk_cancha_id BIGINT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    estado ENUM('PENDIENTE', 'NOTIFICADO', 'CANCELADO', 'ASIGNADO') DEFAULT 'PENDIENTE' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (fk_cancha_id) REFERENCES cancha(id) ON DELETE CASCADE
);

-- 5. TABLA TORNEOS
CREATE TABLE IF NOT EXISTS torneo (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    deporte ENUM('Futbol 5', 'Futbol 8', 'Futbol 11', 'Tenis', 'Padel') NOT NULL,
    costo_inscripcion DECIMAL(10,2) NOT NULL,
    valor_partido DECIMAL(10,2) NOT NULL,
    max_equipos INT NOT NULL,
    min_jugadores_equipo INT NOT NULL,
    max_jugadores_equipo INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado ENUM('INSCRIPCION_ABIERTA', 'EN_CURSO', 'FINALIZADO', 'CANCELADO') DEFAULT 'INSCRIPCION_ABIERTA' NOT NULL,
    reglamento TEXT NULL
);

-- 6. TABLA EQUIPOS
CREATE TABLE IF NOT EXISTS equipo (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fk_torneo_id BIGINT NOT NULL,
    fk_capitan_id BIGINT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    puntos INT DEFAULT 0 NOT NULL,
    partidos_jugados INT DEFAULT 0 NOT NULL,
    partidos_ganados INT DEFAULT 0 NOT NULL,
    partidos_empatados INT DEFAULT 0 NOT NULL,
    partidos_perdidos INT DEFAULT 0 NOT NULL,
    goles_favor INT DEFAULT 0 NOT NULL,
    goles_contra INT DEFAULT 0 NOT NULL,
    diferencia_goles INT DEFAULT 0 NOT NULL,
    inscripcion_pagada BOOLEAN DEFAULT FALSE NOT NULL,
    FOREIGN KEY (fk_torneo_id) REFERENCES torneo(id) ON DELETE CASCADE,
    FOREIGN KEY (fk_capitan_id) REFERENCES usuario(id) ON DELETE RESTRICT,
    CONSTRAINT uq_equipo_nombre_torneo UNIQUE (fk_torneo_id, nombre)
);

-- 7. TABLA EQUIPO_JUGADOR
CREATE TABLE IF NOT EXISTS equipo_jugador (
    fk_equipo_id BIGINT NOT NULL,
    fk_usuario_id BIGINT NOT NULL,
    dorsal INT NULL,
    es_capitan BOOLEAN DEFAULT FALSE NOT NULL,
    fecha_alta DATE NOT NULL,
    estado_invitacion ENUM('PENDIENTE', 'ACEPTADA', 'RECHAZADA') DEFAULT 'PENDIENTE' NOT NULL,
    fecha_respuesta DATETIME NULL,
    PRIMARY KEY (fk_equipo_id, fk_usuario_id),
    FOREIGN KEY (fk_equipo_id) REFERENCES equipo(id) ON DELETE CASCADE,
    FOREIGN KEY (fk_usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

-- 8. TABLA PARTIDOS
CREATE TABLE IF NOT EXISTS partido (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fk_torneo_id BIGINT NOT NULL,
    fk_cancha_id BIGINT NOT NULL,
    fk_equipo_local_id BIGINT NOT NULL,
    fk_equipo_visitante_id BIGINT NULL,
    fk_arbitro_id BIGINT NULL,
    numero_fecha INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    estado ENUM('PROGRAMADO', 'DISPUTADO', 'SUSPENDIDO', 'REPROGRAMADO') DEFAULT 'PROGRAMADO' NOT NULL,
    goles_local INT DEFAULT 0,
    goles_visitante INT DEFAULT 0,
    observaciones TEXT NULL,
    FOREIGN KEY (fk_torneo_id) REFERENCES torneo(id) ON DELETE CASCADE,
    FOREIGN KEY (fk_cancha_id) REFERENCES cancha(id) ON DELETE RESTRICT,
    FOREIGN KEY (fk_equipo_local_id) REFERENCES equipo(id) ON DELETE CASCADE,
    FOREIGN KEY (fk_equipo_visitante_id) REFERENCES equipo(id) ON DELETE CASCADE,
    FOREIGN KEY (fk_arbitro_id) REFERENCES usuario(id) ON DELETE SET NULL
);

-- 9. TABLA SANCIONES
CREATE TABLE IF NOT EXISTS sancion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fk_usuario_id BIGINT NOT NULL,
    fk_partido_id BIGINT NULL,
    tipo_sancion VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_sancion DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fk_creado_por_id BIGINT NOT NULL,
    FOREIGN KEY (fk_usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (fk_partido_id) REFERENCES partido(id) ON DELETE SET NULL,
    FOREIGN KEY (fk_creado_por_id) REFERENCES usuario(id) ON DELETE RESTRICT
);

-- 10. TABLA NOTIFICACIONES
CREATE TABLE IF NOT EXISTS notificacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fk_usuario_id BIGINT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    leida BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

-- 11. TABLA AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fk_usuario_id BIGINT NULL,
    accion VARCHAR(100) NOT NULL,
    entidad_afectada VARCHAR(50) NOT NULL,
    entidad_id BIGINT NOT NULL,
    detalles JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_usuario_id) REFERENCES usuario(id) ON DELETE SET NULL
);

-- CARGA DE USUARIOS DE PRUEBA (Seeds)
INSERT IGNORE INTO usuario (id, nombre, email, contrasena_hash, rol, inasistencias, estado_cuenta) VALUES
(1, 'Administrador', 'admin@complejoub.com', '$2b$10$p0dYq7WlUe8wXJgVfK4Sce7iEwHq2z6GjY6eK1hD3kLm0oP4qRsTu', 'Administrador', 0, 'Activa'),
(2, 'Arbitro Principal', 'arbitro@complejoub.com', '$2b$10$p0dYq7WlUe8wXJgVfK4Sce7iEwHq2z6GjY6eK1hD3kLm0oP4qRsTu', 'Arbitro', 0, 'Activa'),
(3, 'Marco Perez', 'mperez@complejoub.com', '$2b$10$p0dYq7WlUe8wXJgVfK4Sce7iEwHq2z6GjY6eK1hD3kLm0oP4qRsTu', 'Arbitro', 0, 'Activa'),
(4, 'Lucas', 'lucas@gmail.com', '$2b$10$p0dYq7WlUe8wXJgVfK4Sce7iEwHq2z6GjY6eK1hD3kLm0oP4qRsTu', 'Cliente', 0, 'Activa'),
(5, 'Juan', 'juan@gmail.com', '$2b$10$p0dYq7WlUe8wXJgVfK4Sce7iEwHq2z6GjY6eK1hD3kLm0oP4qRsTu', 'Cliente', 0, 'Activa'),
(6, 'Usuario Sancionado', 'sancionado@gmail.com', '$2b$10$p0dYq7WlUe8wXJgVfK4Sce7iEwHq2z6GjY6eK1hD3kLm0oP4qRsTu', 'Cliente', 3, 'Suspendida');

-- CARGA DE CANCHAS DE PRUEBA (Seeds)
INSERT IGNORE INTO cancha (id, nombre, deporte, superficie, techada, iluminacion, precio_hora, activa) VALUES
(1, 'La Bombonerita', 'Futbol 5', 'Sintetico', TRUE, TRUE, 15000.00, TRUE),
(2, 'Cancha 2', 'Futbol 8', 'Sintetico', FALSE, TRUE, 22000.00, TRUE),
(3, 'Estadio Central', 'Futbol 11', 'Cesped Natural', FALSE, TRUE, 45000.00, TRUE),
(4, 'Court 1', 'Tenis', 'Polvo de Ladrillo', FALSE, TRUE, 10000.00, TRUE),
(5, 'Padel Pro', 'Padel', 'Sintetico', TRUE, TRUE, 12000.00, TRUE);

-- PROCEDIMIENTOS ALMACENADOS
DROP PROCEDURE IF EXISTS sp_actualizar_tabla_posiciones;
DROP PROCEDURE IF EXISTS sp_registrar_inasistencia;
DROP PROCEDURE IF EXISTS sp_cancelar_reserva;

DELIMITER //

CREATE PROCEDURE sp_actualizar_tabla_posiciones(IN p_torneo_id BIGINT)
BEGIN
    UPDATE equipo 
    SET puntos = 0, partidos_jugados = 0, partidos_ganados = 0, partidos_empatados = 0, partidos_perdidos = 0, goles_favor = 0, goles_contra = 0, diferencia_goles = 0 
    WHERE fk_torneo_id = p_torneo_id;

    UPDATE equipo e
    JOIN (
        SELECT 
            equipo_id,
            COUNT(*) as pj,
            SUM(CASE WHEN goles_propios > goles_rival THEN 1 ELSE 0 END) as pg,
            SUM(CASE WHEN goles_propios = goles_rival THEN 1 ELSE 0 END) as pe,
            SUM(CASE WHEN goles_propios < goles_rival THEN 1 ELSE 0 END) as pp,
            SUM(goles_propios) as gf,
            SUM(goles_rival) as gc
        FROM (
            SELECT fk_equipo_local_id as equipo_id, goles_local as goles_propios, goles_visitante as goles_rival FROM partido WHERE fk_torneo_id = p_torneo_id AND estado = 'DISPUTADO'
            UNION ALL
            SELECT fk_equipo_visitante_id as equipo_id, goles_visitante as goles_propios, goles_local as goles_rival FROM partido WHERE fk_torneo_id = p_torneo_id AND estado = 'DISPUTADO' AND fk_equipo_visitante_id IS NOT NULL
        ) resultados
        GROUP BY equipo_id
    ) stats ON e.id = stats.equipo_id
    SET 
        e.partidos_jugados = stats.pj,
        e.partidos_ganados = stats.pg,
        e.partidos_empatados = stats.pe,
        e.partidos_perdidos = stats.pp,
        e.goles_favor = stats.gf,
        e.goles_contra = stats.gc,
        e.diferencia_goles = (stats.gf - stats.gc),
        e.puntos = (stats.pg * 3) + (stats.pe * 1);
END //

CREATE PROCEDURE sp_registrar_inasistencia(IN p_reserva_id BIGINT, IN p_admin_id BIGINT)
BEGIN
    DECLARE v_usuario_id BIGINT;
    DECLARE v_inasistencias INT;

    SELECT fk_usuario_id INTO v_usuario_id FROM reserva WHERE id = p_reserva_id;

    UPDATE reserva SET estado = 'INASISTENCIA' WHERE id = p_reserva_id;
    UPDATE usuario SET inasistencias = inasistencias + 1 WHERE id = v_usuario_id;
    
    SELECT inasistencias INTO v_inasistencias FROM usuario WHERE id = v_usuario_id;

    IF v_inasistencias >= 3 THEN
        UPDATE usuario 
        SET estado_cuenta = 'Suspendida', suspension_hasta = DATE_ADD(NOW(), INTERVAL 14 DAY) 
        WHERE id = v_usuario_id;
        
        INSERT INTO sancion (fk_usuario_id, tipo_sancion, descripcion, fk_creado_por_id) 
        VALUES (v_usuario_id, 'Suspensión automática', 'Acumulación de 3 inasistencias injustificadas', p_admin_id);
        
        INSERT INTO notificacion (fk_usuario_id, titulo, mensaje, tipo) 
        VALUES (v_usuario_id, 'Cuenta Suspendida', 'Tu cuenta ha sido suspendida por 14 días por inasistencias.', 'SANCION');
    END IF;

    INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id) 
    VALUES (p_admin_id, 'Registro de inasistencia', 'reserva', p_reserva_id);
END //

CREATE PROCEDURE sp_cancelar_reserva(IN p_reserva_id BIGINT, IN p_motivo TEXT)
BEGIN
    DECLARE v_horas_diff INT;
    DECLARE v_cancha_id BIGINT;
    DECLARE v_fecha DATE;
    DECLARE v_hora TIME;
    DECLARE v_espera_id BIGINT;
    DECLARE v_espera_usuario_id BIGINT;

    SELECT fk_cancha_id, fecha, hora INTO v_cancha_id, v_fecha, v_hora FROM reserva WHERE id = p_reserva_id;
    
    SET v_horas_diff = TIMESTAMPDIFF(HOUR, NOW(), CAST(CONCAT(v_fecha, ' ', v_hora) AS DATETIME));

    IF v_horas_diff > 24 THEN
        UPDATE reserva SET estado = 'CANCELADA', devolucion_sena = TRUE, notas_cancelacion = p_motivo WHERE id = p_reserva_id;
    ELSE
        UPDATE reserva SET estado = 'CANCELADA', devolucion_sena = FALSE, notas_cancelacion = p_motivo WHERE id = p_reserva_id;
    END IF;

    SELECT id, fk_usuario_id INTO v_espera_id, v_espera_usuario_id 
    FROM lista_espera 
    WHERE fk_cancha_id = v_cancha_id AND fecha = v_fecha AND hora = v_hora AND estado = 'PENDIENTE' 
    ORDER BY created_at ASC LIMIT 1;

    IF v_espera_id IS NOT NULL THEN
        UPDATE lista_espera SET estado = 'NOTIFICADO' WHERE id = v_espera_id;
        INSERT INTO notificacion (fk_usuario_id, titulo, mensaje, tipo) 
        VALUES (v_espera_usuario_id, 'Turno Liberado', 'El turno en lista de espera ya se encuentra disponible para reservar.', 'SISTEMA');
    END IF;
END //

DELIMITER ;
