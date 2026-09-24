import { AppError } from '../../middlewares/error.middleware.js';
import { isDbConnected, getPool } from '../../config/database.js';
import { store, PartidoModel } from '../../config/inMemoryStore.js';

export interface CargarResultadoDTO {
  golesLocal: number;
  golesVisitante: number;
  observaciones?: string;
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
  async getAll(torneoId?: number, arbitroId?: number, fecha?: string) {
    if (isDbConnected()) {
      const pool = getPool()!;
      let query = `
        SELECT p.*, t.nombre as torneo_nombre, c.nombre as cancha_nombre,
               el.nombre as equipo_local, ev.nombre as equipo_visitante,
               u.nombre as arbitro_nombre
        FROM partido p
        JOIN torneo t ON p.fk_torneo_id = t.id
        JOIN cancha c ON p.fk_cancha_id = c.id
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
      query += ' ORDER BY p.fecha ASC, p.hora ASC';
      const [rows] = await pool.query(query, params);
      return rows;
    } else {
      let list = store.partidos;
      if (torneoId) list = list.filter(p => p.fk_torneo_id === torneoId);
      if (arbitroId) list = list.filter(p => p.fk_arbitro_id === arbitroId);
      if (fecha) list = list.filter(p => p.fecha === fecha);

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
        `SELECT p.*, t.nombre as torneo_nombre, c.nombre as cancha_nombre,
               el.nombre as equipo_local, ev.nombre as equipo_visitante,
               u.nombre as arbitro_nombre
        FROM partido p
        JOIN torneo t ON p.fk_torneo_id = t.id
        JOIN cancha c ON p.fk_cancha_id = c.id
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
    const partido = await this.getById(partidoId);

    // Validar autorización: Solo el Árbitro asignado o un Administrador pueden cargar el resultado
    if (usuarioRol === 'Arbitro' && partido.fk_arbitro_id !== usuarioId) {
      throw new AppError('No tienes permiso para registrar resultados de un partido que no tienes asignado', 403);
    }

    if (partido.fk_equipo_visitante_id === null) {
      throw new AppError('No se puede cargar resultado a un partido de Fecha Libre', 400);
    }

    const { golesLocal, golesVisitante, observaciones } = data;
    if (golesLocal === undefined || golesVisitante === undefined || golesLocal < 0 || golesVisitante < 0) {
      throw new AppError('Goles local y goles visitante deben ser valores numéricos mayores o iguales a cero', 400);
    }

    if (isDbConnected()) {
      const pool = getPool()!;
      // Actualizar partido
      await pool.query(
        `UPDATE partido 
         SET goles_local = ?, goles_visitante = ?, observaciones = ?, estado = 'DISPUTADO'
         WHERE id = ?`,
        [golesLocal, golesVisitante, observaciones || null, partidoId]
      );

      // Recalcular tabla de posiciones para el torneo (RF-11)
      await pool.query('CALL sp_actualizar_tabla_posiciones(?)', [partido.fk_torneo_id]);

      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "CARGAR_RESULTADO", "partido", ?, ?)',
        [usuarioId, partidoId, JSON.stringify({ golesLocal, golesVisitante, torneoId: partido.fk_torneo_id })]
      );

      return this.getById(partidoId);
    } else {
      const part = store.partidos.find(p => p.id === partidoId);
      if (part) {
        part.goles_local = golesLocal;
        part.goles_visitante = golesVisitante;
        part.observaciones = observaciones || null;
        part.estado = 'DISPUTADO';
      }

      // Actualizar tabla de posiciones en memoria (RF-11)
      this.recalcularPosicionesEnMemoria(partido.fk_torneo_id);

      store.auditLogs.push({
        id: store.auditLogs.length + 1,
        fk_usuario_id: usuarioId,
        accion: 'CARGAR_RESULTADO',
        entidad_afectada: 'partido',
        entidad_id: partidoId,
        detalles: JSON.stringify({ golesLocal, golesVisitante, torneoId: partido.fk_torneo_id }),
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
      });

      return this.getById(partidoId);
    }
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
}

export const partidosService = new PartidosService();
