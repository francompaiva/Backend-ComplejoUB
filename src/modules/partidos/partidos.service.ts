import { AppError } from '../../middlewares/error.middleware.js';
import type { PoolConnection } from 'mysql2/promise';
import { isDbConnected, getPool } from '../../config/database.js';
import { store, PartidoModel } from '../../config/in-memory-store.js';

export interface TarjetaResultadoDTO {
  jugadorId: number;
  equipoId: number;
  tipo: 'AMARILLA' | 'ROJA';
  minuto: number;
  motivo?: string;
}

export interface CargarResultadoDTO {
  golesLocal: number;
  golesVisitante: number;
  observaciones?: string;
  tarjetas?: TarjetaResultadoDTO[];
}

export interface AsignarArbitroDTO {
  arbitroId: number;
}

export interface ReprogramarPartidoDTO {
  canchaId?: number;
  fecha: string;
  hora: string;
}

export class PartidosService {
  async getAll(torneoId?: number, arbitroId?: number, fecha?: string, numeroFecha?: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      let query = `
        SELECT p.*, t.nombre as torneo_nombre, COALESCE(c.nombre, 'Fecha Libre') as cancha_nombre,
               el.nombre as equipo_local, ev.nombre as equipo_visitante,
               u.nombre as arbitro_nombre
        FROM partido p
        JOIN torneo t ON p.fk_torneo_id = t.id
        LEFT JOIN cancha c ON p.fk_cancha_id = c.id
        JOIN equipo el ON p.fk_equipo_local_id = el.id
        LEFT JOIN equipo ev ON p.fk_equipo_visitante_id = ev.id
        LEFT JOIN usuario u ON p.fk_arbitro_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (torneoId) {
        query += ' AND p.fk_torneo_id = ?';
        params.push(torneoId);
      }
      if (arbitroId) {
        query += ' AND p.fk_arbitro_id = ?';
        params.push(arbitroId);
      }
      if (fecha) {
        query += ' AND p.fecha = ?';
        params.push(fecha);
      }
      if (numeroFecha) {
        query += ' AND p.numero_fecha = ?';
        params.push(numeroFecha);
      }
      query += ' ORDER BY p.numero_fecha ASC, p.fecha ASC, p.hora ASC';
      const [rows] = await pool.query(query, params);
      return rows;
    } else {
      let list = store.partidos;
      if (torneoId) list = list.filter(p => p.fk_torneo_id === torneoId);
      if (arbitroId) list = list.filter(p => p.fk_arbitro_id === arbitroId);
      if (fecha) list = list.filter(p => p.fecha === fecha);
      if (numeroFecha) list = list.filter(p => p.numero_fecha === numeroFecha);

      return list.map(p => {
        const t = store.torneos.find(tor => tor.id === p.fk_torneo_id);
        const c = store.canchas.find(ca => ca.id === p.fk_cancha_id);
        const el = store.equipos.find(e => e.id === p.fk_equipo_local_id);
        const ev = p.fk_equipo_visitante_id ? store.equipos.find(e => e.id === p.fk_equipo_visitante_id) : null;
        const u = p.fk_arbitro_id ? store.usuarios.find(usr => usr.id === p.fk_arbitro_id) : null;

        return {
          ...p,
          torneo_nombre: t?.nombre || '',
          cancha_nombre: c?.nombre || 'Cancha',
          equipo_local: el?.nombre || 'Local',
          equipo_visitante: ev ? ev.nombre : 'Fecha Libre',
          arbitro_nombre: u ? u.nombre : 'Sin designar',
        };
      });
    }
  }

  async getById(id: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        `SELECT p.*, t.nombre as torneo_nombre, COALESCE(c.nombre, 'Fecha Libre') as cancha_nombre,
               el.nombre as equipo_local, ev.nombre as equipo_visitante,
               u.nombre as arbitro_nombre
        FROM partido p
        JOIN torneo t ON p.fk_torneo_id = t.id
        LEFT JOIN cancha c ON p.fk_cancha_id = c.id
        JOIN equipo el ON p.fk_equipo_local_id = el.id
        LEFT JOIN equipo ev ON p.fk_equipo_visitante_id = ev.id
        LEFT JOIN usuario u ON p.fk_arbitro_id = u.id
        WHERE p.id = ?`,
        [id]
      );
      if (!rows || rows.length === 0) throw new AppError('Partido no encontrado', 404);
      return rows[0];
    } else {
      const p = store.partidos.find(part => part.id === id);
      if (!p) throw new AppError('Partido no encontrado', 404);
      const t = store.torneos.find(tor => tor.id === p.fk_torneo_id);
      const c = store.canchas.find(ca => ca.id === p.fk_cancha_id);
      const el = store.equipos.find(e => e.id === p.fk_equipo_local_id);
      const ev = p.fk_equipo_visitante_id ? store.equipos.find(e => e.id === p.fk_equipo_visitante_id) : null;
      const u = p.fk_arbitro_id ? store.usuarios.find(usr => usr.id === p.fk_arbitro_id) : null;
      return {
        ...p,
        torneo_nombre: t?.nombre || '',
        cancha_nombre: c?.nombre || 'Cancha',
        equipo_local: el?.nombre || 'Local',
        equipo_visitante: ev ? ev.nombre : 'Fecha Libre',
        arbitro_nombre: u ? u.nombre : 'Sin designar',
      };
    }
  }

  /**
   * RF-10: Registro de resultados por Árbitro o Administrador
   * RF-11: Actualización automática de posiciones (PTS: 3 vic, 1 emp, 0 der; GF, GC, DG)
   * RF-19: Estado pasa a 'DISPUTADO'
   */
  async registrarResultado(partidoId: number, usuarioId: number, usuarioRol: string, data: CargarResultadoDTO) {
    // Nunca confirmar como guardado un acta que solo existe en memoria.
    if (!isDbConnected()) {
      throw new AppError('MySQL no está disponible. El acta no fue guardada.', 503);
    }

    if (!Number.isInteger(data.golesLocal) || !Number.isInteger(data.golesVisitante) ||
        data.golesLocal < 0 || data.golesVisitante < 0 ||
        data.golesLocal > 99 || data.golesVisitante > 99) {
      throw new AppError('Los goles deben ser números enteros entre 0 y 99.', 400);
    }

    const tarjetas = data.tarjetas ?? [];
    if (!Array.isArray(tarjetas) || tarjetas.length > 50) {
      throw new AppError('La lista de tarjetas es inválida (máximo 50).', 400);
    }
    if (data.observaciones !== undefined &&
        (typeof data.observaciones !== 'string' || data.observaciones.length > 10000)) {
      throw new AppError('Las observaciones son inválidas.', 400);
    }

    const pool = getPool()!;
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();

      // Bloquear el partido hasta terminar el guardado: evita cierres simultáneos.
      const [rows]: any = await conexion.query(
        'SELECT * FROM partido WHERE id = ? FOR UPDATE', [partidoId]
      );
      if (!rows.length) throw new AppError('Partido no encontrado.', 404);
      const partido = rows[0];

      if (usuarioRol !== 'Arbitro' && usuarioRol !== 'Administrador') {
        throw new AppError('No tenés permiso para cargar resultados.', 403);
      }
      if (usuarioRol === 'Arbitro' && Number(partido.fk_arbitro_id) !== usuarioId) {
        throw new AppError('Este encuentro no está asignado a tu cuenta.', 403);
      }
      if (usuarioRol === 'Arbitro' && partido.estado !== 'PROGRAMADO') {
        throw new AppError('El partido ya está cerrado o no está programado.', 409);
      }
      if (partido.fk_equipo_visitante_id === null) {
        throw new AppError('No podés registrar un resultado en una fecha libre.', 400);
      }
      if (partido.estado !== 'PROGRAMADO' && tarjetas.length > 0) {
        throw new AppError('Las tarjetas de un partido cerrado requieren una corrección administrativa específica.', 409);
      }

      const equiposValidos = [
        Number(partido.fk_equipo_local_id),
        Number(partido.fk_equipo_visitante_id)
      ];

      for (const tarjeta of tarjetas) {
        if (!tarjeta ||
            !Number.isInteger(tarjeta.jugadorId) ||
            !Number.isInteger(tarjeta.equipoId) ||
            !equiposValidos.includes(tarjeta.equipoId) ||
            !['AMARILLA', 'ROJA'].includes(tarjeta.tipo) ||
            !Number.isInteger(tarjeta.minuto) ||
            tarjeta.minuto < 1 || tarjeta.minuto > 90 ||
            (tarjeta.motivo !== undefined &&
              (typeof tarjeta.motivo !== 'string' || tarjeta.motivo.length > 300))) {
          throw new AppError('Una de las tarjetas tiene datos inválidos.', 400);
        }

        // El ID del jugador debe pertenecer al plantel aceptado del equipo indicado.
        const [jugadores]: any = await conexion.query(
          `SELECT 1 FROM equipo_jugador
           WHERE fk_equipo_id = ? AND fk_usuario_id = ? AND estado_invitacion = 'ACEPTADA'
           LIMIT 1`,
          [tarjeta.equipoId, tarjeta.jugadorId]
        );
        if (!jugadores.length) {
          throw new AppError('Una tarjeta refiere a un jugador que no integra ese equipo.', 400);
        }
      }

      await conexion.query(
        `UPDATE partido SET goles_local = ?, goles_visitante = ?,
            observaciones = ?, estado = 'DISPUTADO' WHERE id = ?`,
        [data.golesLocal, data.golesVisitante, data.observaciones?.trim() || null, partidoId]
      );

      // Una fila por tarjeta, asociada al jugador, partido y árbitro que firma el acta.
      // Las suspensiones por inasistencia no se modifican ni se recalculan aquí.
      for (const tarjeta of tarjetas) {
        const tipoSancion = tarjeta.tipo === 'AMARILLA' ? 'Tarjeta Amarilla' : 'Tarjeta Roja';
        const descripcion = [
          `Minuto ${tarjeta.minuto}`,
          `Equipo ID ${tarjeta.equipoId}`,
          tarjeta.tipo === 'ROJA' && tarjeta.motivo?.trim()
            ? `Motivo: ${tarjeta.motivo.trim()}` : ''
        ].filter(Boolean).join(' | ');

        await conexion.query(
          `INSERT INTO sancion
           (fk_usuario_id, fk_partido_id, tipo_sancion, descripcion, fecha_sancion, fk_creado_por_id)
           VALUES (?, ?, ?, ?, NOW(), ?)`,
          [tarjeta.jugadorId, partidoId, tipoSancion, descripcion, usuarioId]
        );
      }

      // Se recalcula en LA MISMA conexión/transacción que el resultado y las tarjetas.
      // Evita confirmar el acta si falla el recálculo de posiciones.
      await this.recalcularPosicionesDirecto(Number(partido.fk_torneo_id), conexion);

      await conexion.query(
        `INSERT INTO audit_log
         (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles)
         VALUES (?, 'CARGAR_RESULTADO', 'partido', ?, ?)`,
        [usuarioId, partidoId, JSON.stringify({
          golesLocal: data.golesLocal,
          golesVisitante: data.golesVisitante,
          torneoId: Number(partido.fk_torneo_id),
          tarjetasRegistradas: tarjetas.length
        })]
      );

      await conexion.commit();
    } catch (error) {
      try { await conexion.rollback(); } catch (rollbackError) {
        console.error('[partidosService] Error al revertir la transacción:', rollbackError);
      }
      throw error;
    } finally {
      conexion.release();
    }

    return this.getById(partidoId);
  }

  /**
   * RF-17: Asignación de árbitro a los encuentros
   */
  async asignarArbitro(partidoId: number, arbitroId: number, adminId: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [uRows]: any = await pool.query('SELECT id, rol, nombre FROM usuario WHERE id = ?', [arbitroId]);
      if (!uRows || uRows.length === 0 || uRows[0].rol !== 'Arbitro') {
        throw new AppError('El usuario seleccionado no tiene el rol de Árbitro', 400);
      }

      await pool.query('UPDATE partido SET fk_arbitro_id = ? WHERE id = ?', [arbitroId, partidoId]);

      // Notificar al árbitro (RF-23)
      await pool.query(
        `INSERT INTO notificacion (fk_usuario_id, titulo, mensaje, tipo)
         VALUES (?, 'Designación Arbitral', 'Has sido asignado para dirigir un encuentro deportivo.', 'DesignacionArbitral')`,
        [arbitroId]
      );

      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "ASIGNAR_ARBITRO", "partido", ?, ?)',
        [adminId, partidoId, JSON.stringify({ arbitroId })]
      );

      return this.getById(partidoId);
    } else {
      const arbitro = store.usuarios.find(u => u.id === arbitroId && u.rol === 'Arbitro');
      if (!arbitro) throw new AppError('El usuario seleccionado no es árbitro', 400);

      const part = store.partidos.find(p => p.id === partidoId);
      if (!part) throw new AppError('Partido no encontrado', 404);
      part.fk_arbitro_id = arbitroId;

      store.notificaciones.push({
        id: store.notificaciones.length + 1,
        fk_usuario_id: arbitroId,
        titulo: 'Designación Arbitral',
        mensaje: 'Has sido asignado para dirigir un encuentro deportivo.',
        tipo: 'DesignacionArbitral',
        leida: false,
        created_at: new Date().toISOString(),
      });

      return this.getById(partidoId);
    }
  }

  /**
   * RF-19: Estados de partidos (PROGRAMADO, DISPUTADO, SUSPENDIDO, REPROGRAMADO)
   */
  async cambiarEstado(partidoId: number, nuevoEstado: 'PROGRAMADO' | 'DISPUTADO' | 'SUSPENDIDO' | 'REPROGRAMADO', adminId: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      await pool.query('UPDATE partido SET estado = ? WHERE id = ?', [nuevoEstado, partidoId]);
      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "CAMBIAR_ESTADO_PARTIDO", "partido", ?, ?)',
        [adminId, partidoId, JSON.stringify({ nuevoEstado })]
      );
      return this.getById(partidoId);
    } else {
      const p = store.partidos.find(part => part.id === partidoId);
      if (!p) throw new AppError('Partido no encontrado', 404);
      p.estado = nuevoEstado;
      return this.getById(partidoId);
    }
  }

  async reprogramarPartido(partidoId: number, adminId: number, data: ReprogramarPartidoDTO) {
    const { canchaId, fecha, hora } = data;
    if (!fecha || !hora) {
      throw new AppError('Fecha y hora son obligatorias para programar o reprogramar el partido', 400);
    }

    // Validación de día: Torneos de fin de semana deben disputarse Sábado o Domingo
    const [year, month, day] = fecha.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0: Domingo, 6: Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      throw new AppError('Los partidos de torneos de fin de semana deben programarse un día sábado o domingo', 400);
    }

    const partido = await this.getById(partidoId);
    const targetCanchaId = canchaId || partido.fk_cancha_id;

    const normalizeSport = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    if (isDbConnected()) {
      const pool = getPool()!;

      // 1. Validar que la cancha pertenezca al deporte del torneo
      if (targetCanchaId) {
        const [canchaRows]: any = await pool.query('SELECT id, nombre, deporte FROM cancha WHERE id = ?', [targetCanchaId]);
        if (!canchaRows || canchaRows.length === 0) {
          throw new AppError('La cancha especificada no existe', 404);
        }
        const cancha = canchaRows[0];

        const [torneoRows]: any = await pool.query('SELECT id, deporte FROM torneo WHERE id = ?', [partido.fk_torneo_id]);
        if (torneoRows && torneoRows.length > 0) {
          const torneoDeporte = torneoRows[0].deporte;
          if (normalizeSport(cancha.deporte) !== normalizeSport(torneoDeporte)) {
            throw new AppError(
              `La cancha asignada (${cancha.nombre} - ${cancha.deporte}) no corresponde al deporte del torneo (${torneoDeporte})`,
              400
            );
          }
        }

        // 2. Validar que no interfiera con otros partidos previamente programados
        const [conflict]: any = await pool.query(
          'SELECT id FROM partido WHERE fk_cancha_id = ? AND fecha = ? AND hora = ? AND id <> ? AND estado NOT IN ("SUSPENDIDO", "CANCELADO")',
          [targetCanchaId, fecha, hora, partidoId]
        );
        if (conflict && conflict.length > 0) {
          throw new AppError('La cancha seleccionada ya se encuentra ocupada por otro encuentro en ese día y horario', 409);
        }
      }

      await pool.query(
        'UPDATE partido SET fk_cancha_id = ?, fecha = ?, hora = ?, estado = "PROGRAMADO" WHERE id = ?',
        [targetCanchaId, fecha, hora, partidoId]
      );

      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "REPROGRAMAR_PARTIDO", "partido", ?, ?)',
        [adminId, partidoId, JSON.stringify({ fecha, hora, canchaId: targetCanchaId })]
      );

      return this.getById(partidoId);
    } else {
      const p = store.partidos.find(part => part.id === partidoId);
      if (!p) throw new AppError('Partido no encontrado', 404);

      if (targetCanchaId) {
        const cancha = store.canchas.find(ca => ca.id === targetCanchaId);
        if (!cancha) throw new AppError('La cancha especificada no existe', 404);

        const torneo = store.torneos.find(t => t.id === p.fk_torneo_id);
        if (torneo && normalizeSport(cancha.deporte) !== normalizeSport(torneo.deporte)) {
          throw new AppError(
            `La cancha asignada (${cancha.nombre} - ${cancha.deporte}) no corresponde al deporte del certamen (${torneo.deporte})`,
            400
          );
        }

        // Validar conflicto de horario con otros partidos activos en memoria
        const horaPrefix = hora.slice(0, 5);
        const conflict = store.partidos.find(
          other =>
            other.id !== partidoId &&
            other.fk_cancha_id === targetCanchaId &&
            other.fecha === fecha &&
            other.hora.slice(0, 5) === horaPrefix &&
            other.estado !== 'SUSPENDIDO'
        );
        if (conflict) {
          throw new AppError('La cancha seleccionada ya se encuentra ocupada por otro encuentro en ese día y horario', 409);
        }
      }

      p.fecha = fecha;
      p.hora = hora.length === 5 ? hora + ':00' : hora;
      if (targetCanchaId) p.fk_cancha_id = targetCanchaId;
      p.estado = 'PROGRAMADO';
      return this.getById(partidoId);
    }
  }

  private recalcularPosicionesEnMemoria(torneoId: number) {
    const equiposDelTorneo = store.equipos.filter(e => e.fk_torneo_id === torneoId);
    for (const eq of equiposDelTorneo) {
      eq.puntos = 0;
      eq.partidos_jugados = 0;
      eq.partidos_ganados = 0;
      eq.partidos_empatados = 0;
      eq.partidos_perdidos = 0;
      eq.goles_favor = 0;
      eq.goles_contra = 0;
      eq.diferencia_goles = 0;
    }

    const partidosDisputados = store.partidos.filter(
      p => p.fk_torneo_id === torneoId && p.estado === 'DISPUTADO' && p.fk_equipo_visitante_id !== null && p.goles_local !== null && p.goles_visitante !== null
    );

    for (const p of partidosDisputados) {
      const eqLoc = equiposDelTorneo.find(e => e.id === p.fk_equipo_local_id);
      const eqVis = equiposDelTorneo.find(e => e.id === p.fk_equipo_visitante_id);
      if (!eqLoc || !eqVis) continue;

      const gl = p.goles_local!;
      const gv = p.goles_visitante!;

      eqLoc.partidos_jugados += 1;
      eqVis.partidos_jugados += 1;
      eqLoc.goles_favor += gl;
      eqLoc.goles_contra += gv;
      eqVis.goles_favor += gv;
      eqVis.goles_contra += gl;

      if (gl > gv) {
        eqLoc.partidos_ganados += 1;
        eqLoc.puntos += 3;
        eqVis.partidos_perdidos += 1;
      } else if (gl === gv) {
        eqLoc.partidos_empatados += 1;
        eqLoc.puntos += 1;
        eqVis.partidos_empatados += 1;
        eqVis.puntos += 1;
      } else {
        eqVis.partidos_ganados += 1;
        eqVis.puntos += 3;
        eqLoc.partidos_perdidos += 1;
      }

      eqLoc.diferencia_goles = eqLoc.goles_favor - eqLoc.goles_contra;
      eqVis.diferencia_goles = eqVis.goles_favor - eqVis.goles_contra;
    }
  }

  /**
   * Recálculo directo en MySQL como fallback resiliente cuando el SP
   * sp_actualizar_tabla_posiciones no está instalado en la base de datos.
   */
  async recalcularPosicionesDirecto(torneoId: number, conexion?: PoolConnection) {
    if (!isDbConnected()) {
      this.recalcularPosicionesEnMemoria(torneoId);
      return;
    }
    const db = conexion ?? getPool()!;
    try {
      await db.query(
        `UPDATE equipo
         SET puntos = 0, partidos_jugados = 0, partidos_ganados = 0, partidos_empatados = 0,
             partidos_perdidos = 0, goles_favor = 0, goles_contra = 0, diferencia_goles = 0
         WHERE fk_torneo_id = ?`,
        [torneoId]
      );

      await db.query(
        `UPDATE equipo e
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
           WHERE fk_torneo_id = ? 
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
           e.puntos = e.puntos + loc.pts`,
        [torneoId]
      );

      await db.query(
        `UPDATE equipo e
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
           WHERE fk_torneo_id = ? 
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
           e.puntos = e.puntos + vis.pts`,
        [torneoId]
      );

      await db.query(
        `UPDATE equipo
         SET diferencia_goles = goles_favor - goles_contra
         WHERE fk_torneo_id = ?`,
        [torneoId]
      );
    } catch (directErr: any) {
      console.error('[partidosService] Fallo crítico al recalcular posiciones directamente en SQL:', directErr.message);
      throw directErr;
    }
  }
}

export const partidosService = new PartidosService();
