-- =============================================================================
-- COMPLEJO DEPORTIVO UB - SISTEMA DE GESTIÓN DE RESERVAS Y TORNEOS
-- MODELO DE DATOS RELACIONAL (DDL MySQL 8.0+)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS complejo_deportivo_ub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE complejo_deportivo_ub;

-- Desactivar temporalmente chequeos de claves foráneas para recreación segura
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS notificacion;
DROP TABLE IF EXISTS sancion;
DROP TABLE IF EXISTS partido;
DROP TABLE IF EXISTS equipo_jugador;
DROP TABLE IF EXISTS equipo;
DROP TABLE IF EXISTS torneo;
DROP TABLE IF EXISTS lista_espera;
DROP TABLE IF EXISTS reserva;
DROP TABLE IF EXISTS cancha;
DROP TABLE IF EXISTS usuario;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 1. TABLA: usuario (RF-01, RF-05, RF-12)
-- =============================================================================
CREATE TABLE usuario (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL,
  inasistencias INT NOT NULL DEFAULT 0,
  estado_cuenta VARCHAR(20) NOT NULL DEFAULT 'Activa',
  suspension_hasta DATETIME NULL,
  telefono VARCHAR(30) NULL,
  posicion_preferida VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_usuario_rol CHECK (rol IN ('Cliente', 'Administrador', 'Arbitro')),
  CONSTRAINT chk_usuario_inasistencias CHECK (inasistencias >= 0),
  CONSTRAINT chk_usuario_estado CHECK (estado_cuenta IN ('Activa', 'Suspendida', 'Inactiva'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_usuario_rol ON usuario(rol);
CREATE INDEX idx_usuario_estado ON usuario(estado_cuenta);

-- =============================================================================
-- 2. TABLA: cancha (RF-02, RF-06)
-- =============================================================================
CREATE TABLE cancha (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  deporte VARCHAR(30) NOT NULL,
  superficie VARCHAR(50) NULL DEFAULT 'Sintético',
  techada BOOLEAN NOT NULL DEFAULT false,
  iluminacion BOOLEAN NOT NULL DEFAULT true,
  precio_hora DECIMAL(10,2) NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_cancha_deporte CHECK (deporte IN ('Futbol 5', 'Futbol 8', 'Futbol 11', 'Tenis', 'Padel')),
  CONSTRAINT chk_cancha_precio CHECK (precio_hora > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_cancha_deporte ON cancha(deporte);
CREATE INDEX idx_cancha_activa ON cancha(activa);

-- =============================================================================
-- 3. TABLA: reserva (RF-03, RF-04, RF-05, RF-06)
-- =============================================================================
CREATE TABLE reserva (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  fk_usuario_id BIGINT NOT NULL,
  fk_cancha_id BIGINT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  monto_total DECIMAL(10,2) NOT NULL,
  monto_sena DECIMAL(10,2) NOT NULL,
  sena_abonada BOOLEAN NOT NULL DEFAULT false,
  estado VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADA',
  devolucion_sena BOOLEAN NULL,
  asistencia_confirmada BOOLEAN NULL,
  notas_cancelacion TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_reserva_estado CHECK (estado IN ('CONFIRMADA', 'CANCELADA', 'INASISTENCIA', 'FINALIZADA')),
  CONSTRAINT fk_reserva_usuario FOREIGN KEY (fk_usuario_id) REFERENCES usuario(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reserva_cancha FOREIGN KEY (fk_cancha_id) REFERENCES cancha(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uq_cancha_fecha_hora UNIQUE (fk_cancha_id, fecha, hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reserva_usuario ON reserva(fk_usuario_id);
CREATE INDEX idx_reserva_fecha ON reserva(fecha);
CREATE INDEX idx_reserva_estado ON reserva(estado);

-- =============================================================================
-- 4. TABLA: lista_espera (Alcance 3.1, RF-24)
-- =============================================================================
CREATE TABLE lista_espera (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  fk_usuario_id BIGINT NOT NULL,
  fk_cancha_id BIGINT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_lista_espera_estado CHECK (estado IN ('PENDIENTE', 'NOTIFICADO', 'CANCELADO', 'ASIGNADO')),
  CONSTRAINT fk_lista_espera_usuario FOREIGN KEY (fk_usuario_id) REFERENCES usuario(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_lista_espera_cancha FOREIGN KEY (fk_cancha_id) REFERENCES cancha(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_espera_cancha_fecha_hora ON lista_espera(fk_cancha_id, fecha, hora);
CREATE INDEX idx_espera_usuario ON lista_espera(fk_usuario_id);

-- =============================================================================
-- 5. TABLA: torneo (RF-07, RF-09)
-- =============================================================================
CREATE TABLE torneo (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  deporte VARCHAR(30) NOT NULL,
  costo_inscripcion DECIMAL(10,2) NOT NULL,
  valor_partido DECIMAL(10,2) NOT NULL,
  max_equipos INT NOT NULL,
  min_jugadores_equipo INT NOT NULL DEFAULT 5,
  max_jugadores_equipo INT NOT NULL DEFAULT 12,
  fecha_inicio DATE NULL,
  fecha_fin DATE NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'INSCRIPCION_ABIERTA',
  reglamento TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_torneo_costo CHECK (costo_inscripcion >= 0),
  CONSTRAINT chk_torneo_valor_partido CHECK (valor_partido >= 0),
  CONSTRAINT chk_torneo_max_equipos CHECK (max_equipos > 1),
  CONSTRAINT chk_torneo_estado CHECK (estado IN ('INSCRIPCION_ABIERTA', 'EN_CURSO', 'FINALIZADO', 'CANCELADO')),
  CONSTRAINT chk_torneo_deporte CHECK (deporte IN ('Futbol 5', 'Futbol 8', 'Futbol 11', 'Tenis', 'Padel'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_torneo_estado ON torneo(estado);
CREATE INDEX idx_torneo_deporte ON torneo(deporte);

-- =============================================================================
-- 6. TABLA: equipo (RF-08, RF-11, RF-21)
-- =============================================================================
CREATE TABLE equipo (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  fk_torneo_id BIGINT NOT NULL,
  fk_capitan_id BIGINT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  puntos INT NOT NULL DEFAULT 0,
  partidos_jugados INT NOT NULL DEFAULT 0,
  partidos_ganados INT NOT NULL DEFAULT 0,
  partidos_empatados INT NOT NULL DEFAULT 0,
  partidos_perdidos INT NOT NULL DEFAULT 0,
  goles_favor INT NOT NULL DEFAULT 0,
  goles_contra INT NOT NULL DEFAULT 0,
  diferencia_goles INT NOT NULL DEFAULT 0,
  inscripcion_pagada BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_equipo_torneo FOREIGN KEY (fk_torneo_id) REFERENCES torneo(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_equipo_capitan FOREIGN KEY (fk_capitan_id) REFERENCES usuario(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uq_equipo_nombre_torneo UNIQUE (fk_torneo_id, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_equipo_torneo ON equipo(fk_torneo_id);
CREATE INDEX idx_equipo_capitan ON equipo(fk_capitan_id);
CREATE INDEX idx_equipo_posiciones ON equipo(fk_torneo_id, puntos DESC, diferencia_goles DESC, goles_favor DESC);

-- =============================================================================
-- 7. TABLA: equipo_jugador (RF-08, RF-13, RF-14, RF-15, RF-16)
-- =============================================================================
CREATE TABLE equipo_jugador (
  fk_equipo_id BIGINT NOT NULL,
  fk_usuario_id BIGINT NOT NULL,
  dorsal INT NULL,
  es_capitan BOOLEAN NOT NULL DEFAULT false,
  fecha_alta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado_invitacion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  fecha_respuesta TIMESTAMP NULL,
  PRIMARY KEY (fk_equipo_id, fk_usuario_id),
  CONSTRAINT chk_invitacion_estado CHECK (estado_invitacion IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA')),
  CONSTRAINT fk_ej_equipo FOREIGN KEY (fk_equipo_id) REFERENCES equipo(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ej_usuario FOREIGN KEY (fk_usuario_id) REFERENCES usuario(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_ej_usuario ON equipo_jugador(fk_usuario_id);
CREATE INDEX idx_ej_estado ON equipo_jugador(estado_invitacion);

-- =============================================================================
-- 8. TABLA: partido (RF-09, RF-10, RF-17, RF-18, RF-19, RF-21, RF-22)
-- =============================================================================
CREATE TABLE partido (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  fk_torneo_id BIGINT NOT NULL,
  fk_cancha_id BIGINT NOT NULL,
  fk_equipo_local_id BIGINT NOT NULL,
  fk_equipo_visitante_id BIGINT NULL, -- NULL representa Fecha Libre (equipo sin rival en fecha impar)
  fk_arbitro_id BIGINT NULL,
  numero_fecha INT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADO',
  goles_local INT NULL,
  goles_visitante INT NULL,
  observaciones TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_partido_numero_fecha CHECK (numero_fecha > 0),
  CONSTRAINT chk_partido_estado CHECK (estado IN ('PROGRAMADO', 'DISPUTADO', 'SUSPENDIDO', 'REPROGRAMADO')),
  CONSTRAINT fk_partido_torneo FOREIGN KEY (fk_torneo_id) REFERENCES torneo(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_partido_cancha FOREIGN KEY (fk_cancha_id) REFERENCES cancha(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_partido_local FOREIGN KEY (fk_equipo_local_id) REFERENCES equipo(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_partido_visitante FOREIGN KEY (fk_equipo_visitante_id) REFERENCES equipo(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_partido_arbitro FOREIGN KEY (fk_arbitro_id) REFERENCES usuario(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_partido_torneo ON partido(fk_torneo_id);
CREATE INDEX idx_partido_fecha_hora ON partido(fecha, hora);
CREATE INDEX idx_partido_arbitro ON partido(fk_arbitro_id);
CREATE INDEX idx_partido_estado ON partido(estado);

-- =============================================================================
-- 9. TABLA: sancion (RF-05, RF-20)
-- =============================================================================
CREATE TABLE sancion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  fk_usuario_id BIGINT NOT NULL,
  fk_partido_id BIGINT NULL,
  tipo_sancion VARCHAR(50) NOT NULL,
  descripcion TEXT NOT NULL,
  fecha_sancion DATETIME NOT NULL,
  fk_creado_por_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sancion_usuario FOREIGN KEY (fk_usuario_id) REFERENCES usuario(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sancion_partido FOREIGN KEY (fk_partido_id) REFERENCES partido(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_sancion_creador FOREIGN KEY (fk_creado_por_id) REFERENCES usuario(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sancion_usuario ON sancion(fk_usuario_id);
CREATE INDEX idx_sancion_partido ON sancion(fk_partido_id);

-- =============================================================================
-- 10. TABLA: notificacion (RF-23)
-- =============================================================================
CREATE TABLE notificacion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  fk_usuario_id BIGINT NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notificacion_usuario FOREIGN KEY (fk_usuario_id) REFERENCES usuario(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_notificacion_usuario_leida ON notificacion(fk_usuario_id, leida);

-- =============================================================================
-- 11. TABLA: audit_log (Alcance 3.1, RF-26)
-- =============================================================================
CREATE TABLE audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  fk_usuario_id BIGINT NOT NULL,
  accion VARCHAR(100) NOT NULL,
  entidad_afectada VARCHAR(50) NOT NULL,
  entidad_id BIGINT NULL,
  detalles TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_usuario FOREIGN KEY (fk_usuario_id) REFERENCES usuario(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_audit_entidad ON audit_log(entidad_afectada, entidad_id);
CREATE INDEX idx_audit_usuario ON audit_log(fk_usuario_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
