-- =============================================================================
-- COMPLEJO DEPORTIVO UB - PROCEDIMIENTOS ALMACENADOS Y REGLAS DE NEGOCIO EN BD
-- =============================================================================

USE complejo_deportivo;

DELIMITER $$

-- -----------------------------------------------------------------------------
-- 1. ACTUALIZAR TABLA DE POSICIONES DE UN TORNEO (RF-11)
-- Calcula PTS, PJ, PG, PE, PP, GF, GC, DG según resultados de partidos DISPUTADOS
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_actualizar_tabla_posiciones$$
CREATE PROCEDURE sp_actualizar_tabla_posiciones(IN p_torneo_id BIGINT)
BEGIN
  -- Resetear estadísticas de los equipos del torneo
  UPDATE equipo
  SET puntos = 0,
      partidos_jugados = 0,
      partidos_ganados = 0,
      partidos_empatados = 0,
      partidos_perdidos = 0,
      goles_favor = 0,
      goles_contra = 0,
      diferencia_goles = 0
  WHERE fk_torneo_id = p_torneo_id;

  -- Acumular partidos como Local
  UPDATE equipo e
  JOIN (
    SELECT 
      fk_equipo_local_id AS equipo_id,
      COUNT(*) AS pj,
      SUM(CASE WHEN goles_local > goles_visitante THEN 1 ELSE 0 END) AS pg,
      SUM(CASE WHEN goles_local = goles_visitante THEN 1 ELSE 0 END) AS pe,
      SUM(CASE WHEN goles_local < goles_visitante THEN 1 ELSE 0 END) AS pp,
      SUM(COALESCE(goles_local, 0)) AS gf,
      SUM(COALESCE(goles_visitante, 0)) AS gc,
      SUM(CASE 
        WHEN goles_local > goles_visitante THEN 3 
        WHEN goles_local = goles_visitante THEN 1 
        ELSE 0 
      END) AS pts
    FROM partido
    WHERE fk_torneo_id = p_torneo_id 
      AND estado = 'DISPUTADO' 
      AND fk_equipo_visitante_id IS NOT NULL
    GROUP BY fk_equipo_local_id
  ) loc ON e.id = loc.equipo_id
  SET 
    e.partidos_jugados = e.partidos_jugados + loc.pj,
    e.partidos_ganados = e.partidos_ganados + loc.pg,
    e.partidos_empatados = e.partidos_empatados + loc.pe,
    e.partidos_perdidos = e.partidos_perdidos + loc.pp,
    e.goles_favor = e.goles_favor + loc.gf,
    e.goles_contra = e.goles_contra + loc.gc,
    e.puntos = e.puntos + loc.pts;

  -- Acumular partidos como Visitante
  UPDATE equipo e
  JOIN (
    SELECT 
      fk_equipo_visitante_id AS equipo_id,
      COUNT(*) AS pj,
      SUM(CASE WHEN goles_visitante > goles_local THEN 1 ELSE 0 END) AS pg,
      SUM(CASE WHEN goles_visitante = goles_local THEN 1 ELSE 0 END) AS pe,
      SUM(CASE WHEN goles_visitante < goles_local THEN 1 ELSE 0 END) AS pp,
      SUM(COALESCE(goles_visitante, 0)) AS gf,
      SUM(COALESCE(goles_local, 0)) AS gc,
      SUM(CASE 
        WHEN goles_visitante > goles_local THEN 3 
        WHEN goles_visitante = goles_local THEN 1 
        ELSE 0 
      END) AS pts
    FROM partido
    WHERE fk_torneo_id = p_torneo_id 
      AND estado = 'DISPUTADO' 
      AND fk_equipo_visitante_id IS NOT NULL
    GROUP BY fk_equipo_visitante_id
  ) vis ON e.id = vis.equipo_id
  SET 
    e.partidos_jugados = e.partidos_jugados + vis.pj,
    e.partidos_ganados = e.partidos_ganados + vis.pg,
    e.partidos_empatados = e.partidos_empatados + vis.pe,
    e.partidos_perdidos = e.partidos_perdidos + vis.pp,
    e.goles_favor = e.goles_favor + vis.gf,
    e.goles_contra = e.goles_contra + vis.gc,
    e.puntos = e.puntos + vis.pts;

  -- Calcular balance neto de diferencia de goles
  UPDATE equipo
  SET diferencia_goles = goles_favor - goles_contra
  WHERE fk_torneo_id = p_torneo_id;
END$$

-- -----------------------------------------------------------------------------
-- 2. REGISTRAR INASISTENCIA Y APLICAR SANCIÓN AUTOMÁTICA (RF-05)
-- 3 inasistencias = Suspensión de 14 días para reservar
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_registrar_inasistencia$$
CREATE PROCEDURE sp_registrar_inasistencia(
  IN p_reserva_id BIGINT,
  IN p_admin_id BIGINT
)
BEGIN
  DECLARE v_usuario_id BIGINT;
  DECLARE v_cant_inasistencias INT;

  -- Obtener usuario de la reserva
  SELECT fk_usuario_id INTO v_usuario_id
  FROM reserva
  WHERE id = p_reserva_id;

  -- Marcar reserva como INASISTENCIA
  UPDATE reserva
  SET estado = 'INASISTENCIA',
      asistencia_confirmada = false,
      devolucion_sena = false
  WHERE id = p_reserva_id;

  -- Incrementar contador de inasistencias en el usuario
  UPDATE usuario
  SET inasistencias = inasistencias + 1
  WHERE id = v_usuario_id;

  SELECT inasistencias INTO v_cant_inasistencias
  FROM usuario
  WHERE id = v_usuario_id;

  -- Si acumula 3 o más inasistencias consecutivas, aplicar suspensión por 2 semanas
  IF v_cant_inasistencias >= 3 THEN
    UPDATE usuario
    SET estado_cuenta = 'Suspendida',
        suspension_hasta = DATE_ADD(NOW(), INTERVAL 14 DAY)
    WHERE id = v_usuario_id;

    -- Registrar la sanción formal
    INSERT INTO sancion (fk_usuario_id, fk_partido_id, tipo_sancion, descripcion, fecha_sancion, fk_creado_por_id)
    VALUES (
      v_usuario_id,
      NULL,
      'Suspensión 2 semanas',
      'Suspensión automática por acumulación de 3 inasistencias sin previo aviso a reservas de canchas.',
      NOW(),
      p_admin_id
    );

    -- Enviar notificación al usuario
    INSERT INTO notificacion (fk_usuario_id, titulo, mensaje, tipo)
    VALUES (
      v_usuario_id,
      'Cuenta Suspendida por Inasistencias',
      'Has alcanzado 3 inasistencias sin aviso. Tu cuenta ha sido suspendida para nuevas reservas por el término de 14 días corridos.',
      'Sancion'
    );
  END IF;

  -- Registrar en log de auditoría
  INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles)
  VALUES (
    p_admin_id,
    'REGISTRAR_INASISTENCIA',
    'reserva',
    p_reserva_id,
    CONCAT('{"usuario_id":', v_usuario_id, ',"inasistencias_acumuladas":', v_cant_inasistencias, '}')
  );
END$$

-- -----------------------------------------------------------------------------
-- 3. CANCELACIÓN DE RESERVA CON POLÍTICA DE >24 HORAS (RF-04)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_cancelar_reserva$$
CREATE PROCEDURE sp_cancelar_reserva(
  IN p_reserva_id BIGINT,
  IN p_motivo TEXT
)
BEGIN
  DECLARE v_fecha DATE;
  DECLARE v_hora TIME;
  DECLARE v_inicio DATETIME;
  DECLARE v_horas_diferencia DECIMAL(10,2);
  DECLARE v_aplica_devolucion BOOLEAN;
  DECLARE v_cancha_id BIGINT;
  DECLARE v_usuario_id BIGINT;
  DECLARE v_espera_usuario_id BIGINT;

  SELECT fecha, hora, fk_cancha_id, fk_usuario_id 
  INTO v_fecha, v_hora, v_cancha_id, v_usuario_id
  FROM reserva
  WHERE id = p_reserva_id;

  SET v_inicio = TIMESTAMP(v_fecha, v_hora);
  SET v_horas_diferencia = TIMESTAMPDIFF(HOUR, NOW(), v_inicio);

  IF v_horas_diferencia > 24 THEN
    SET v_aplica_devolucion = true;
  ELSE
    SET v_aplica_devolucion = false;
  END IF;

  UPDATE reserva
  SET estado = 'CANCELADA',
      devolucion_sena = v_aplica_devolucion,
      notas_cancelacion = p_motivo
  WHERE id = p_reserva_id;

  -- Notificar al usuario con el resultado del reintegro
  INSERT INTO notificacion (fk_usuario_id, titulo, mensaje, tipo)
  VALUES (
    v_usuario_id,
    'Reserva Cancelada',
    CONCAT(
      'Tu reserva fue cancelada con éxito. ',
      IF(v_aplica_devolucion, 'Se acreditó el reintegro de tu seña por cancelar con más de 24 horas de antelación.', 'No aplica reintegro de seña por cancelarse con menos de 24 horas de antelación.')
    ),
    'ReservaCancelada'
  );

  -- Notificar al primer usuario en lista de espera si existe (RF-24)
  SELECT fk_usuario_id INTO v_espera_usuario_id
  FROM lista_espera
  WHERE fk_cancha_id = v_cancha_id 
    AND fecha = v_fecha 
    AND hora = v_hora 
    AND estado = 'PENDIENTE'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_espera_usuario_id IS NOT NULL THEN
    UPDATE lista_espera 
    SET estado = 'NOTIFICADO'
    WHERE fk_usuario_id = v_espera_usuario_id AND fk_cancha_id = v_cancha_id AND fecha = v_fecha AND hora = v_hora;

    INSERT INTO notificacion (fk_usuario_id, titulo, mensaje, tipo)
    VALUES (
      v_espera_usuario_id,
      '¡Horario Disponible en Lista de Espera!',
      CONCAT('Se ha liberado un turno en la cancha para la fecha ', v_fecha, ' a las ', v_hora, '. Ingresa a la plataforma para confirmar tu reserva.'),
      'ListaEsperaDisponible'
    );
  END IF;
END$$

-- -----------------------------------------------------------------------------
-- 4. TRIGGERS: ACTUALIZACIÓN AUTOMÁTICA DE TABLA DE POSICIONES
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_actualizar_posiciones_after_update$$
CREATE TRIGGER trg_actualizar_posiciones_after_update
AFTER UPDATE ON partido
FOR EACH ROW
BEGIN
  IF NEW.estado = 'DISPUTADO' AND (OLD.estado <> 'DISPUTADO' OR OLD.goles_local <> NEW.goles_local OR OLD.goles_visitante <> NEW.goles_visitante) THEN
    CALL sp_actualizar_tabla_posiciones(NEW.fk_torneo_id);
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_actualizar_posiciones_after_insert$$
CREATE TRIGGER trg_actualizar_posiciones_after_insert
AFTER INSERT ON partido
FOR EACH ROW
BEGIN
  IF NEW.estado = 'DISPUTADO' THEN
    CALL sp_actualizar_tabla_posiciones(NEW.fk_torneo_id);
  END IF;
END$$

-- -----------------------------------------------------------------------------
-- 5. TRIGGER: INTEGRIDAD RF-16 - UN JUGADOR POR TORNEO
-- Evita que un jugador participe o tenga invitación pendiente en > 1 equipo
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_validar_jugador_unico_torneo$$
CREATE TRIGGER trg_validar_jugador_unico_torneo
BEFORE INSERT ON equipo_jugador
FOR EACH ROW
BEGIN
  DECLARE v_torneo_id BIGINT;
  DECLARE v_ya_inscripto INT DEFAULT 0;

  SELECT fk_torneo_id INTO v_torneo_id FROM equipo WHERE id = NEW.fk_equipo_id;

  SELECT COUNT(*) INTO v_ya_inscripto
  FROM equipo_jugador ej
  JOIN equipo e ON ej.fk_equipo_id = e.id
  WHERE ej.fk_usuario_id = NEW.fk_usuario_id 
    AND e.fk_torneo_id = v_torneo_id
    AND ej.estado_invitacion IN ('ACEPTADA', 'PENDIENTE');

  IF v_ya_inscripto > 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Regla RF-16: El jugador ya pertenece o tiene una invitación pendiente en otro equipo de este mismo torneo.';
  END IF;
END$$

-- -----------------------------------------------------------------------------
-- 6. TRIGGER: INTEGRIDAD - RIVALES DISTINTOS EN PARTIDO
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_validar_rivales_distintos_insert$$
CREATE TRIGGER trg_validar_rivales_distintos_insert
BEFORE INSERT ON partido
FOR EACH ROW
BEGIN
  IF NEW.fk_equipo_visitante_id IS NOT NULL AND NEW.fk_equipo_local_id = NEW.fk_equipo_visitante_id THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Un equipo no puede disputar un partido contra sí mismo.';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_validar_rivales_distintos_update$$
CREATE TRIGGER trg_validar_rivales_distintos_update
BEFORE UPDATE ON partido
FOR EACH ROW
BEGIN
  IF NEW.fk_equipo_visitante_id IS NOT NULL AND NEW.fk_equipo_local_id = NEW.fk_equipo_visitante_id THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Un equipo no puede disputar un partido contra sí mismo.';
  END IF;
END$$

DELIMITER ;
