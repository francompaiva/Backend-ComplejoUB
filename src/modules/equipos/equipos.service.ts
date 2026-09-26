import { AppError } from '../../middlewares/error.middleware.js';
import { isDbConnected, getPool } from '../../config/database.js';
import { store, EquipoModel, EquipoJugadorModel } from '../../config/in-memory-store.js';
import { torneosService } from '../torneos/torneos.service.js';

export interface InscribirEquipoDTO {
  torneoId: number;
  nombreEquipo: string;
}

export interface InvitarJugadorDTO {
  emailUsuario: string;
  dorsal?: number;
}

export class EquiposService {
  async getAll(torneoId?: number): Promise<any[]> {
    if (isDbConnected()) {
      const pool = getPool()!;
      let query = `
        SELECT e.*, t.nombre as torneo_nombre, u.nombre as capitan_nombre, u.email as capitan_email
        FROM equipo e
        JOIN torneo t ON e.fk_torneo_id = t.id
        JOIN usuario u ON e.fk_capitan_id = u.id
      `;
      const params: any[] = [];
      if (torneoId) {
        query += ' WHERE e.fk_torneo_id = ?';
        params.push(torneoId);
      }
      query += ' ORDER BY e.puntos DESC, e.diferencia_goles DESC';
      const [rows]: any = await pool.query(query, params);
      return rows;
    } else {
      let list = store.equipos;
      if (torneoId) list = list.filter(e => e.fk_torneo_id === torneoId);
      return list.map(e => {
        const t = store.torneos.find(tor => tor.id === e.fk_torneo_id);
        const c = store.usuarios.find(u => u.id === e.fk_capitan_id);
        return {
          ...e,
          torneo_nombre: t?.nombre || '',
          capitan_nombre: c?.nombre || '',
          capitan_email: c?.email || '',
        };
      });
    }
  }

  async getById(id: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        `SELECT e.*, t.nombre as torneo_nombre, t.deporte, t.min_jugadores_equipo, t.max_jugadores_equipo, u.nombre as capitan_nombre
         FROM equipo e
         JOIN torneo t ON e.fk_torneo_id = t.id
         JOIN usuario u ON e.fk_capitan_id = u.id
         WHERE e.id = ?`,
        [id]
      );
      if (!rows || rows.length === 0) throw new AppError('Equipo no encontrado', 404);
      const equipo = rows[0];

      // Obtener nómina de jugadores
      const [jugadores]: any = await pool.query(
        `SELECT ej.*, u.nombre, u.email, u.telefono
         FROM equipo_jugador ej
         JOIN usuario u ON ej.fk_usuario_id = u.id
         WHERE ej.fk_equipo_id = ?`,
        [id]
      );
      equipo.jugadores = jugadores;
      return equipo;
    } else {
      const e = store.equipos.find(eq => eq.id === id);
      if (!e) throw new AppError('Equipo no encontrado', 404);
      const t = store.torneos.find(tor => tor.id === e.fk_torneo_id);
      const c = store.usuarios.find(u => u.id === e.fk_capitan_id);

      const jugadores = store.equipoJugadores
        .filter(ej => ej.fk_equipo_id === id)
        .map(ej => {
          const u = store.usuarios.find(usr => usr.id === ej.fk_usuario_id);
          return {
            ...ej,
            nombre: u?.nombre || '',
            email: u?.email || '',
            telefono: u?.telefono || '',
          };
        });

      return {
        ...e,
        torneo_nombre: t?.nombre || '',
        deporte: t?.deporte || '',
        min_jugadores_equipo: t?.min_jugadores_equipo || 5,
        max_jugadores_equipo: t?.max_jugadores_equipo || 12,
        capitan_nombre: c?.nombre || '',
        jugadores,
      };
    }
  }

  /**
   * RF-08: Inscripción de equipos por el capitán
   * RF-16: Evita que el capitán o jugadores participen en más de un equipo del mismo torneo
   */
  async inscribirEquipo(capitanId: number, data: InscribirEquipoDTO) {
    const { torneoId, nombreEquipo } = data;
    if (!torneoId || !nombreEquipo) {
      throw new AppError('Torneo y nombre del equipo son requeridos', 400);
    }

    const torneo = await torneosService.getById(torneoId);
    if (torneo.estado !== 'INSCRIPCION_ABIERTA') {
      throw new AppError('Las inscripciones para este torneo ya no se encuentran abiertas', 400);
    }

    // Verificar cupo de equipos
    const equiposActuales = await this.getAll(torneoId);
    if (equiposActuales.length >= torneo.max_equipos) {
      throw new AppError(`El cupo máximo de equipos (${torneo.max_equipos}) ya fue alcanzado`, 400);
    }

    // RF-16: Control de participación - Un jugador/capitán no puede participar en más de un equipo dentro del mismo torneo
    await this.validarNoParticipaEnTorneo(capitanId, torneoId);

    if (isDbConnected()) {
      const pool = getPool()!;
      // Verificar nombre único en el torneo
      const [existingName]: any = await pool.query('SELECT id FROM equipo WHERE fk_torneo_id = ? AND nombre = ?', [torneoId, nombreEquipo]);
      if (existingName && existingName.length > 0) {
        throw new AppError('Ya existe un equipo con ese nombre en este torneo', 409);
      }

      const [res]: any = await pool.query(
        'INSERT INTO equipo (fk_torneo_id, fk_capitan_id, nombre, inscripcion_pagada) VALUES (?, ?, ?, true)',
        [torneoId, capitanId, nombreEquipo]
      );
      const equipoId = res.insertId;

      // Registrar al capitán automáticamente en la nómina
      await pool.query(
        'INSERT INTO equipo_jugador (fk_equipo_id, fk_usuario_id, es_capitan, estado_invitacion, fecha_respuesta) VALUES (?, ?, true, "ACEPTADA", NOW())',
        [equipoId, capitanId]
      );

      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "INSCRIBIR_EQUIPO", "equipo", ?, ?)',
        [capitanId, equipoId, JSON.stringify({ torneoId, nombreEquipo })]
      );

      return this.getById(equipoId);
    } else {
      const existingName = store.equipos.find(e => e.fk_torneo_id === torneoId && e.nombre.toLowerCase() === nombreEquipo.toLowerCase());
      if (existingName) {
        throw new AppError('Ya existe un equipo con ese nombre en este torneo', 409);
      }

      const newId = store.equipos.length > 0 ? Math.max(...store.equipos.map(e => e.id)) + 1 : 1;
      const newEquipo: EquipoModel = {
        id: newId,
        fk_torneo_id: torneoId,
        fk_capitan_id: capitanId,
        nombre: nombreEquipo,
        puntos: 0,
        partidos_jugados: 0,
        partidos_ganados: 0,
        partidos_empatados: 0,
        partidos_perdidos: 0,
        goles_favor: 0,
        goles_contra: 0,
        diferencia_goles: 0,
        inscripcion_pagada: true,
      };
      store.equipos.push(newEquipo);

      store.equipoJugadores.push({
        fk_equipo_id: newId,
        fk_usuario_id: capitanId,
        dorsal: 10,
        es_capitan: true,
        estado_invitacion: 'ACEPTADA',
        fecha_alta: new Date().toISOString(),
        fecha_respuesta: new Date().toISOString(),
      });

      return this.getById(newId);
    }
  }

  /**
   * RF-14: Invitaciones a equipos por el capitán
   * RF-16: Evita que el invitado participe en más de un equipo en el mismo torneo
   */
  async invitarJugador(equipoId: number, capitanId: number, data: InvitarJugadorDTO) {
    const { emailUsuario, dorsal } = data;
    const equipo = await this.getById(equipoId);

    if (equipo.fk_capitan_id !== capitanId) {
      throw new AppError('Solo el capitán del equipo puede enviar invitaciones', 403);
    }

    if (equipo.jugadores.length >= equipo.max_jugadores_equipo) {
      throw new AppError(`Se alcanzó el límite máximo de ${equipo.max_jugadores_equipo} jugadores para este deporte`, 400);
    }

    // Buscar al usuario por email
    let invitedUser: any = null;
    if (isDbConnected()) {
      const pool = getPool()!;
      const [uRows]: any = await pool.query('SELECT id, nombre, email FROM usuario WHERE email = ?', [emailUsuario]);
      if (!uRows || uRows.length === 0) throw new AppError(`No se encontró ningún usuario con el correo ${emailUsuario}`, 404);
      invitedUser = uRows[0];
    } else {
      invitedUser = store.usuarios.find(u => u.email.toLowerCase() === emailUsuario.toLowerCase());
      if (!invitedUser) throw new AppError(`No se encontró ningún usuario con el correo ${emailUsuario}`, 404);
    }

    // RF-16: Verificar que no esté en otro equipo del mismo torneo
    await this.validarNoParticipaEnTorneo(invitedUser.id, equipo.fk_torneo_id);

    if (isDbConnected()) {
      const pool = getPool()!;
      // Verificar si ya tiene invitación en este equipo
      const [existing]: any = await pool.query('SELECT * FROM equipo_jugador WHERE fk_equipo_id = ? AND fk_usuario_id = ?', [equipoId, invitedUser.id]);
      if (existing && existing.length > 0) {
        throw new AppError('El jugador ya forma parte o tiene una invitación pendiente en este equipo', 400);
      }

      await pool.query(
        'INSERT INTO equipo_jugador (fk_equipo_id, fk_usuario_id, dorsal, es_capitan, estado_invitacion) VALUES (?, ?, ?, false, "PENDIENTE")',
        [equipoId, invitedUser.id, dorsal || null]
      );

      // Notificación RF-23
      await pool.query(
        `INSERT INTO notificacion (fk_usuario_id, titulo, mensaje, tipo)
         VALUES (?, 'Invitación a Equipo', ?, 'InvitacionEquipo')`,
        [invitedUser.id, `El capitán de ${equipo.nombre} te ha invitado a sumarte al plantel para el torneo ${equipo.torneo_nombre}.`]
      );
    } else {
      const existing = store.equipoJugadores.find(ej => ej.fk_equipo_id === equipoId && ej.fk_usuario_id === invitedUser.id);
      if (existing) {
        throw new AppError('El jugador ya forma parte o tiene una invitación pendiente en este equipo', 400);
      }

      store.equipoJugadores.push({
        fk_equipo_id: equipoId,
        fk_usuario_id: invitedUser.id,
        dorsal: dorsal || null,
        es_capitan: false,
        estado_invitacion: 'PENDIENTE',
        fecha_alta: new Date().toISOString(),
      });

      store.notificaciones.push({
        id: store.notificaciones.length + 1,
        fk_usuario_id: invitedUser.id,
        titulo: 'Invitación a Equipo',
        mensaje: `El capitán de ${equipo.nombre} te invitó a sumarte al plantel para el torneo ${equipo.torneo_nombre}.`,
        tipo: 'InvitacionEquipo',
        leida: false,
        created_at: new Date().toISOString(),
      });
    }

    return { message: `Invitación enviada con éxito a ${invitedUser.nombre} (${emailUsuario})` };
  }

  /**
   * RF-15: Aceptación o rechazo de invitaciones por el jugador
   */
  async responderInvitacion(equipoId: number, usuarioId: number, respuesta: 'ACEPTADA' | 'RECHAZADA') {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query('SELECT * FROM equipo_jugador WHERE fk_equipo_id = ? AND fk_usuario_id = ?', [equipoId, usuarioId]);
      if (!rows || rows.length === 0) throw new AppError('Invitación no encontrada', 404);

      await pool.query(
        'UPDATE equipo_jugador SET estado_invitacion = ?, fecha_respuesta = NOW() WHERE fk_equipo_id = ? AND fk_usuario_id = ?',
        [respuesta, equipoId, usuarioId]
      );
    } else {
      const item = store.equipoJugadores.find(ej => ej.fk_equipo_id === equipoId && ej.fk_usuario_id === usuarioId);
      if (!item) throw new AppError('Invitación no encontrada', 404);
      item.estado_invitacion = respuesta;
      item.fecha_respuesta = new Date().toISOString();
    }

    return { message: `Invitación ${respuesta.toLowerCase()} con éxito` };
  }

  /**
   * RF-16: Control de participación: Un jugador no puede estar en dos equipos del mismo torneo
   */
  private async validarNoParticipaEnTorneo(usuarioId: number, torneoId: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        `SELECT e.nombre as equipo_nombre
         FROM equipo_jugador ej
         JOIN equipo e ON ej.fk_equipo_id = e.id
         WHERE ej.fk_usuario_id = ? AND e.fk_torneo_id = ? AND ej.estado_invitacion = 'ACEPTADA'`,
        [usuarioId, torneoId]
      );
      if (rows && rows.length > 0) {
        throw new AppError(
          `Regla RF-16: El jugador ya se encuentra inscripto en el equipo '${rows[0].equipo_nombre}' dentro de este mismo torneo. No se permite jugar en más de un equipo por torneo.`,
          409
        );
      }
    } else {
      const part = store.equipoJugadores.find(ej => {
        if (ej.fk_usuario_id !== usuarioId || ej.estado_invitacion !== 'ACEPTADA') return false;
        const eq = store.equipos.find(e => e.id === ej.fk_equipo_id);
        return eq && eq.fk_torneo_id === torneoId;
      });
      if (part) {
        const eq = store.equipos.find(e => e.id === part.fk_equipo_id);
        throw new AppError(
          `Regla RF-16: El jugador ya se encuentra inscripto en el equipo '${eq?.nombre}' dentro de este torneo.`,
          409
        );
      }
    }
  }
}

export const equiposService = new EquiposService();
