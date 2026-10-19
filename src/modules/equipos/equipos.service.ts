import { AppError } from '../../middlewares/error.middleware.js';
import { isDbConnected, getPool } from '../../config/database.js';
import { store, EquipoModel, EquipoJugadorModel } from '../../config/in-memory-store.js';
import { torneosService } from '../torneos/torneos.service.js';

export interface InscribirEquipoDTO {
  torneoId: number;
  nombreEquipo: string;
  players?: any[];
  jugadores?: any[];
}

export interface InvitarJugadorDTO {
  emailUsuario: string;
  dorsal?: number;
}

export function getPosicionesValidas(deporte?: string): string[] {
  const dep = (deporte || '').toLowerCase();
  if (dep.includes('padel') || dep.includes('pádel')) return ['Drive', 'Revés'];
  if (dep.includes('tenis')) return ['Single', 'Dobles', 'Drive', 'Revés'];
  return ['Arquero', 'Defensor', 'Mediocampista', 'Delantero'];
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

      // Enriquecer cada equipo con su nómina completa de jugadores
      for (const eq of rows) {
        const [jugadores]: any = await pool.query(
          `SELECT ej.*, u.nombre, u.email, u.telefono, u.dni, u.posicion_preferida
           FROM equipo_jugador ej
           JOIN usuario u ON ej.fk_usuario_id = u.id
           WHERE ej.fk_equipo_id = ?
           ORDER BY ej.es_capitan DESC, ej.dorsal ASC`,
          [eq.id]
        );
        eq.jugadores = jugadores || [];
        eq.playersCount = (jugadores || []).length;
      }

      return rows;
    } else {
      let list = store.equipos;
      if (torneoId) list = list.filter(e => e.fk_torneo_id === torneoId);
      return list.map(e => {
        const t = store.torneos.find(tor => tor.id === e.fk_torneo_id);
        const c = store.usuarios.find(u => u.id === e.fk_capitan_id);
        const jugadores = store.equipoJugadores
          .filter(ej => ej.fk_equipo_id === e.id)
          .map(ej => {
            const u = store.usuarios.find(usr => usr.id === ej.fk_usuario_id);
            return {
              ...ej,
              nombre: u?.nombre || '',
              email: u?.email || '',
              telefono: u?.telefono || '',
              dni: u?.dni || '',
            };
          })
          .sort((a, b) => (b.es_capitan ? 1 : 0) - (a.es_capitan ? 1 : 0));

        return {
          ...e,
          torneo_nombre: t?.nombre || '',
          capitan_nombre: c?.nombre || '',
          capitan_email: c?.email || '',
          jugadores,
          playersCount: jugadores.length,
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
    const rawTorneoId = data.torneoId || (data as any).tournamentId || (data as any).fk_torneo_id;
    const torneoId = typeof rawTorneoId === 'number'
      ? rawTorneoId
      : parseInt(String(rawTorneoId).replace(/\D/g, ''), 10) || parseInt(String(rawTorneoId), 10);
    const nombreEquipo = (data.nombreEquipo || (data as any).nombre || (data as any).teamName || '').trim();

    if (!torneoId || !nombreEquipo) {
      throw new AppError('Torneo y nombre del equipo son requeridos', 400);
    }

    const torneo = await torneosService.getById(torneoId);
    const estadoNorm = (torneo.estado || '').toUpperCase().replace(/\s+/g, '_');
    const isAbierto = estadoNorm === 'INSCRIPCION_ABIERTA' || estadoNorm === 'INSCRIPCIONES_ABIERTAS' || estadoNorm === 'ABIERTA';
    if (!isAbierto) {
      throw new AppError('Las inscripciones para este torneo ya no se encuentran abiertas', 400);
    }

    // Verificar cupo de equipos
    const equiposActuales = await this.getAll(torneoId);
    if (equiposActuales.length >= torneo.max_equipos) {
      throw new AppError(`El cupo máximo de equipos (${torneo.max_equipos}) ya fue alcanzado`, 400);
    }

    // Obtener y validar estado del capitán
    let capitanUser: any = null;
    if (isDbConnected()) {
      const pool = getPool()!;
      const [capRows]: any = await pool.query('SELECT id, nombre, email, dni, estado_cuenta FROM usuario WHERE id = ?', [capitanId]);
      if (!capRows || capRows.length === 0) throw new AppError('Capitán no encontrado en el sistema', 404);
      capitanUser = capRows[0];
    } else {
      capitanUser = store.usuarios.find(u => u.id === capitanId);
      if (!capitanUser) throw new AppError('Capitán no encontrado en el sistema', 404);
    }

    if (capitanUser.estado_cuenta === 'Suspendida') {
      throw new AppError('Tu cuenta se encuentra suspendida temporalmente por acumulación de inasistencias o sanciones.', 403);
    }

    const capDni = capitanUser.dni ? String(capitanUser.dni).trim() : null;

    // RF-16: Control de participación - El capitán no puede participar en más de un equipo dentro del mismo torneo
    await this.validarNoParticipaEnTorneo(capitanId, torneoId, capitanUser.nombre, capDni || undefined);

    const rawPlayerList: any[] = data.players || (data as any).jugadores || [];

    // Validaciones estrictas de DNI (7 u 8 dígitos numéricos, sin letras ni símbolos) y posición reglamentaria
    const DNI_REGEX = /^\d{7,8}$/;
    const posicionesValidas = getPosicionesValidas(torneo.deporte);

    if (Array.isArray(rawPlayerList) && rawPlayerList.length > 0) {
      for (let i = 0; i < rawPlayerList.length; i++) {
        const p = rawPlayerList[i];
        const dni = String(p.dni || p.documento || '').replace(/\D/g, '').trim();
        const pos = String(p.position || p.posicion || '').trim();

        if (!dni) {
          throw new AppError(`El DNI del jugador #${i + 1} es obligatorio`, 400);
        }
        if (!DNI_REGEX.test(dni)) {
          throw new AppError(
            `El DNI '${dni}' del jugador #${i + 1} es inválido: debe contener exactamente 7 u 8 dígitos numéricos sin letras, espacios, puntos ni símbolos`,
            400
          );
        }
        if (!pos) {
          throw new AppError(`La posición del jugador #${i + 1} es obligatoria`, 400);
        }
        const isPosValid = posicionesValidas.some(v => v.localeCompare(pos, undefined, { sensitivity: 'accent' }) === 0);
        if (!isPosValid) {
          throw new AppError(
            `La posición '${pos}' del jugador #${i + 1} no es válida para ${torneo.deporte}. Posiciones permitidas: ${posicionesValidas.join(', ')}`,
            400
          );
        }

        // Buscar al usuario registrado en la base de datos por DNI y tomar su nombre real
        let regUser: any = null;
        if (isDbConnected()) {
          const pool = getPool()!;
          const [uRows]: any = await pool.query(
            'SELECT id, nombre, email, dni, estado_cuenta FROM usuario WHERE REPLACE(REPLACE(dni, ".", ""), " ", "") = ?',
            [dni]
          );
          if (uRows && uRows.length > 0) regUser = uRows[0];
        } else {
          regUser = store.usuarios.find(u => u.dni && String(u.dni).replace(/\D/g, '') === dni);
        }

        if (!regUser) {
          throw new AppError(
            `El jugador con DNI '${dni}' no se encuentra registrado en el sistema. Todos los integrantes del plantel deben poseer una cuenta activa previamente en Complejo Deportivo UB para poder ser inscriptos.`,
            400
          );
        }

        if (regUser.estado_cuenta === 'Suspendida') {
          throw new AppError(
            `El jugador ${regUser.nombre} (DNI ${dni}) posee su cuenta suspendida por acumulación de inasistencias o sanciones y no puede ser inscripto.`,
            400
          );
        }

        // Asignar el nombre oficial de la base de datos (ignorar cualquier nombre enviado por el cliente)
        p.name = regUser.nombre;
        p.nombre = regUser.nombre;
        p.usuarioId = regUser.id;
      }

      // Verificar que no haya DNIs duplicados en la nómina presentada
      const dnisPresentados = rawPlayerList.map(p => String(p.dni || p.documento || '').trim());
      if (new Set(dnisPresentados).size !== dnisPresentados.length) {
        throw new AppError('Existen jugadores con números de DNI duplicados dentro del mismo plantel', 400);
      }
    }

    // Identificar al capitán dentro de playerList para no duplicarlo en la nómina
    const teammates: any[] = [];
    if (Array.isArray(rawPlayerList)) {
      for (const p of rawPlayerList) {
        const pDni = String(p.dni || p.documento || '').trim();
        const isCap = Boolean(
          p.isCaptain ||
          p.id === 'capitan-1' ||
          (capDni && pDni === capDni) ||
          p.id === capitanId ||
          p.usuarioId === capitanId
        );
        if (!isCap) {
          teammates.push(p);
        }
      }
    }

    // Verificar que ningún compañero repita el DNI del capitán
    if (capDni && teammates.some(t => String(t.dni || t.documento || '').trim() === capDni)) {
      throw new AppError('El DNI del capitán no puede repetirse en los miembros del plantel', 400);
    }

    // Verificar cupos reglamentarios del plantel por deporte (Capitán 1 + compañeros)
    const totalSquad = 1 + teammates.length;
    const minJug = torneo.min_jugadores_equipo || 5;
    const maxJug = torneo.max_jugadores_equipo || 12;

    if (totalSquad < minJug) {
      throw new AppError(
        `Plantel insuficiente: se requiere un mínimo de ${minJug} jugadores para ${torneo.deporte} (actualmente hay ${totalSquad}).`,
        400
      );
    }
    if (totalSquad > maxJug) {
      throw new AppError(
        `Límite de plantel superado: el máximo permitido para ${torneo.deporte} es de ${maxJug} jugadores (presentados: ${totalSquad}).`,
        400
      );
    }

    if (isDbConnected()) {
      const pool = getPool()!;

      // 1. Validar existencia y disponibilidad de cada compañero en MySQL antes de abrir transacción
      const resolvedTeammates: Array<{ user: any; dni: string; position: string; dorsal?: number }> = [];
      for (let i = 0; i < teammates.length; i++) {
        const p = teammates[i];
        const dni = String(p.dni || p.documento || '').trim();
        const [uRows]: any = await pool.query(
          'SELECT id, nombre, email, dni, estado_cuenta FROM usuario WHERE dni = ?',
          [dni]
        );
        if (!uRows || uRows.length === 0) {
          throw new AppError(
            `El jugador "${p.name || p.nombre || 'Sin nombre'}" (DNI: ${dni}) no se encuentra registrado en el sistema. Todos los jugadores del plantel deben contar con una cuenta de usuario en la plataforma.`,
            400
          );
        }
        const playerUser = uRows[0];
        if (playerUser.estado_cuenta === 'Suspendida') {
          throw new AppError(
            `El jugador "${playerUser.nombre}" (DNI: ${dni}) tiene su cuenta suspendida y no puede ser inscripto en el torneo.`,
            400
          );
        }
        // RF-16: Comprobar que no participe ya en otro equipo del mismo torneo
        await this.validarNoParticipaEnTorneo(playerUser.id, torneoId, playerUser.nombre, dni);

        resolvedTeammates.push({
          user: playerUser,
          dni,
          position: String(p.position || p.posicion || '').trim(),
          dorsal: p.dorsal ? Number(p.dorsal) : undefined,
        });
      }

      // 2. Ejecutar inserción en transacción MySQL atómica
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Verificar nombre único en el torneo bajo bloqueo
        const [existingName]: any = await connection.query(
          'SELECT id FROM equipo WHERE fk_torneo_id = ? AND LOWER(nombre) = LOWER(?) FOR UPDATE',
          [torneoId, nombreEquipo]
        );
        if (existingName && existingName.length > 0) {
          throw new AppError('Ya existe un equipo con ese nombre en este torneo', 409);
        }

        // Re-verificar cupo máximo bajo bloqueo
        const [countRows]: any = await connection.query(
          'SELECT COUNT(*) as cnt FROM equipo WHERE fk_torneo_id = ? FOR UPDATE',
          [torneoId]
        );
        if (countRows[0].cnt >= torneo.max_equipos) {
          throw new AppError(`El cupo máximo de equipos (${torneo.max_equipos}) ya fue alcanzado`, 400);
        }

        // Re-verificar RF-16 bajo bloqueo de transacción para prevenir carreras
        await this.validarNoParticipaEnTorneoDb(connection, capitanId, torneoId, capitanUser.nombre, capDni || undefined);
        for (const t of resolvedTeammates) {
          await this.validarNoParticipaEnTorneoDb(connection, t.user.id, torneoId, t.user.nombre, t.dni);
        }

        // Insertar el equipo
        const [res]: any = await connection.query(
          'INSERT INTO equipo (fk_torneo_id, fk_capitan_id, nombre, inscripcion_pagada) VALUES (?, ?, ?, true)',
          [torneoId, capitanId, nombreEquipo]
        );
        const equipoId = res.insertId;

        // Registrar al capitán automáticamente en la nómina (dorsal 10 por defecto, capitán = true)
        await connection.query(
          'INSERT INTO equipo_jugador (fk_equipo_id, fk_usuario_id, dorsal, es_capitan, estado_invitacion, fecha_respuesta) VALUES (?, ?, 10, true, "ACEPTADA", NOW())',
          [equipoId, capitanId]
        );

        // Registrar a todos los jugadores del plantel en equipo_jugador
        for (let i = 0; i < resolvedTeammates.length; i++) {
          const t = resolvedTeammates[i];
          const defaultDorsal = (i + 1 === 10) ? 11 : (i + 1);
          const dorsal = t.dorsal || defaultDorsal;
          await connection.query(
            'INSERT INTO equipo_jugador (fk_equipo_id, fk_usuario_id, dorsal, es_capitan, estado_invitacion, fecha_respuesta) VALUES (?, ?, ?, false, "ACEPTADA", NOW())',
            [equipoId, t.user.id, dorsal]
          );
        }

        // Auditoría
        await connection.query(
          'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "INSCRIBIR_EQUIPO", "equipo", ?, ?)',
          [capitanId, equipoId, JSON.stringify({ torneoId, nombreEquipo, jugadoresCount: totalSquad })]
        );

        await connection.commit();
        return this.getById(equipoId);
      } catch (txErr) {
        await connection.rollback();
        throw txErr;
      } finally {
        connection.release();
      }
    } else {
      // 1. Validar existencia y disponibilidad de cada compañero en store
      const resolvedTeammates: Array<{ user: any; dni: string; position: string; dorsal?: number }> = [];
      for (let i = 0; i < teammates.length; i++) {
        const p = teammates[i];
        const dni = String(p.dni || p.documento || '').trim();
        const playerUser = store.usuarios.find(u => u.dni && String(u.dni).trim() === dni);
        if (!playerUser) {
          throw new AppError(
            `El jugador "${p.name || p.nombre || 'Sin nombre'}" (DNI: ${dni}) no se encuentra registrado en el sistema. Todos los jugadores del plantel deben contar con una cuenta de usuario en la plataforma.`,
            400
          );
        }
        if (playerUser.estado_cuenta === 'Suspendida') {
          throw new AppError(
            `El jugador "${playerUser.nombre}" (DNI: ${dni}) tiene su cuenta suspendida y no puede ser inscripto en el torneo.`,
            400
          );
        }
        // RF-16: Comprobar que no participe ya en otro equipo del mismo torneo
        await this.validarNoParticipaEnTorneo(playerUser.id, torneoId, playerUser.nombre, dni);

        resolvedTeammates.push({
          user: playerUser,
          dni,
          position: String(p.position || p.posicion || '').trim(),
          dorsal: p.dorsal ? Number(p.dorsal) : undefined,
        });
      }

      const existingName = store.equipos.find(
        e => e.fk_torneo_id === torneoId && e.nombre.toLowerCase() === nombreEquipo.toLowerCase()
      );
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

      // Capitán registrado
      store.equipoJugadores.push({
        fk_equipo_id: newId,
        fk_usuario_id: capitanId,
        dorsal: 10,
        es_capitan: true,
        estado_invitacion: 'ACEPTADA',
        fecha_alta: new Date().toISOString(),
        fecha_respuesta: new Date().toISOString(),
      });

      // Nómina completa de jugadores registrada
      resolvedTeammates.forEach((t, idx) => {
        const defaultDorsal = (idx + 1 === 10) ? 11 : (idx + 1);
        const dorsal = t.dorsal || defaultDorsal;
        store.equipoJugadores.push({
          fk_equipo_id: newId,
          fk_usuario_id: t.user.id,
          dorsal,
          es_capitan: false,
          estado_invitacion: 'ACEPTADA',
          fecha_alta: new Date().toISOString(),
          fecha_respuesta: new Date().toISOString(),
        });
      });

      store.auditLogs.push({
        id: store.auditLogs.length + 1,
        fk_usuario_id: capitanId,
        accion: 'INSCRIBIR_EQUIPO',
        entidad_afectada: 'equipo',
        entidad_id: newId,
        detalles: JSON.stringify({ torneoId, nombreEquipo, jugadoresCount: totalSquad }),
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
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
   * RF-15: Obtener invitaciones pendientes del usuario actual
   */
  async getMisInvitaciones(usuarioId: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        `SELECT ej.fk_equipo_id as equipo_id, ej.fk_usuario_id, ej.dorsal, ej.es_capitan, ej.estado_invitacion, ej.fecha_alta,
                e.nombre as equipo_nombre, e.fk_torneo_id as torneo_id, t.nombre as torneo_nombre, t.deporte,
                u.nombre as capitan_nombre, u.email as capitan_email
         FROM equipo_jugador ej
         JOIN equipo e ON ej.fk_equipo_id = e.id
         JOIN torneo t ON e.fk_torneo_id = t.id
         JOIN usuario u ON e.fk_capitan_id = u.id
         WHERE ej.fk_usuario_id = ? AND ej.estado_invitacion = 'PENDIENTE'
         ORDER BY ej.fecha_alta DESC`,
        [usuarioId]
      );
      return rows;
    } else {
      const list = store.equipoJugadores.filter(ej => ej.fk_usuario_id === usuarioId && ej.estado_invitacion === 'PENDIENTE');
      return list.map(ej => {
        const e = store.equipos.find(eq => eq.id === ej.fk_equipo_id);
        const t = e ? store.torneos.find(tor => tor.id === e.fk_torneo_id) : null;
        const c = e ? store.usuarios.find(u => u.id === e.fk_capitan_id) : null;
        return {
          equipo_id: ej.fk_equipo_id,
          fk_equipo_id: ej.fk_equipo_id,
          fk_usuario_id: ej.fk_usuario_id,
          dorsal: ej.dorsal,
          es_capitan: ej.es_capitan,
          estado_invitacion: ej.estado_invitacion,
          fecha_alta: ej.fecha_alta,
          equipo_nombre: e?.nombre || 'Equipo',
          torneo_id: t?.id,
          torneo_nombre: t?.nombre || 'Torneo Oficial',
          deporte: t?.deporte || 'Futbol 5',
          capitan_nombre: c?.nombre || 'Capitán',
          capitan_email: c?.email || '',
        };
      });
    }
  }

  /**
   * RF-15 / Perfil: Obtener historial de equipos y torneos del usuario (capitán o miembro aceptado)
   */
  async getMisEquipos(usuarioId: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        `SELECT e.id as equipo_id, e.nombre as equipo_nombre, e.fk_torneo_id as torneo_id,
                t.nombre as torneo_nombre, t.deporte, t.estado as torneo_estado,
                ej.es_capitan, ej.dorsal, ej.estado_invitacion, ej.fecha_alta,
                u.nombre as capitan_nombre, u.email as capitan_email
         FROM equipo_jugador ej
         JOIN equipo e ON ej.fk_equipo_id = e.id
         JOIN torneo t ON e.fk_torneo_id = t.id
         JOIN usuario u ON e.fk_capitan_id = u.id
         WHERE ej.fk_usuario_id = ? AND ej.estado_invitacion = 'ACEPTADA'
         ORDER BY ej.fecha_alta DESC`,
        [usuarioId]
      );
      return rows;
    } else {
      const memberships = store.equipoJugadores.filter(
        ej => ej.fk_usuario_id === usuarioId && ej.estado_invitacion === 'ACEPTADA'
      );
      return memberships.map(ej => {
        const e = store.equipos.find(eq => eq.id === ej.fk_equipo_id);
        const t = e ? store.torneos.find(tor => tor.id === e.fk_torneo_id) : null;
        const cap = e ? store.usuarios.find(u => u.id === e.fk_capitan_id) : null;
        return {
          equipo_id: ej.fk_equipo_id,
          equipo_nombre: e?.nombre || 'Equipo',
          torneo_id: t?.id,
          torneo_nombre: t?.nombre || 'Torneo Oficial',
          deporte: t?.deporte || 'Futbol 5',
          torneo_estado: t?.estado || 'EN_CURSO',
          es_capitan: ej.es_capitan,
          dorsal: ej.dorsal,
          estado_invitacion: ej.estado_invitacion,
          fecha_alta: ej.fecha_alta,
          capitan_nombre: cap?.nombre || '',
          capitan_email: cap?.email || '',
        };
      });
    }
  }

  /**
   * RF-15: Aceptación o rechazo de invitaciones por el jugador
   */
  async responderInvitacion(equipoId: number, usuarioId: number, respuesta: 'ACEPTADA' | 'RECHAZADA') {
    const cleanRespuesta: 'ACEPTADA' | 'RECHAZADA' = (respuesta || '').toUpperCase().includes('ACEP') ? 'ACEPTADA' : 'RECHAZADA';

    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query('SELECT * FROM equipo_jugador WHERE fk_equipo_id = ? AND fk_usuario_id = ?', [equipoId, usuarioId]);
      if (!rows || rows.length === 0) throw new AppError('Invitación no encontrada', 404);

      if (cleanRespuesta === 'ACEPTADA') {
        const [eqRows]: any = await pool.query('SELECT fk_torneo_id FROM equipo WHERE id = ?', [equipoId]);
        if (eqRows && eqRows.length > 0) {
          await this.validarNoParticipaEnTorneo(usuarioId, eqRows[0].fk_torneo_id);
        }
      }

      await pool.query(
        'UPDATE equipo_jugador SET estado_invitacion = ?, fecha_respuesta = NOW() WHERE fk_equipo_id = ? AND fk_usuario_id = ?',
        [cleanRespuesta, equipoId, usuarioId]
      );
    } else {
      const item = store.equipoJugadores.find(ej => ej.fk_equipo_id === equipoId && ej.fk_usuario_id === usuarioId);
      if (!item) throw new AppError('Invitación no encontrada', 404);

      if (cleanRespuesta === 'ACEPTADA') {
        const eq = store.equipos.find(e => e.id === equipoId);
        if (eq) {
          await this.validarNoParticipaEnTorneo(usuarioId, eq.fk_torneo_id);
        }
      }

      item.estado_invitacion = cleanRespuesta;
      item.fecha_respuesta = new Date().toISOString();
    }

    return { success: true, estado: cleanRespuesta, message: `Invitación ${cleanRespuesta.toLowerCase()} con éxito` };
  }

  /**
   * RF-16: Control de participación: Un jugador no puede estar en dos equipos del mismo torneo
   */
  async validarNoParticipaEnTorneo(usuarioId: number, torneoId: number, nombre?: string, dni?: string) {
    const ident = nombre ? (dni ? `"${nombre}" (DNI: ${dni})` : `"${nombre}"`) : 'El jugador';
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
          `El jugador ${ident} ya se encuentra inscripto en el equipo '${rows[0].equipo_nombre}' dentro de este mismo torneo. No se permite jugar en más de un equipo por certamen.`,
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
          `El jugador ${ident} ya se encuentra inscripto en el equipo '${eq?.nombre}' dentro de este mismo torneo. No se permite jugar en más de un equipo por certamen.`,
          409
        );
      }
    }
  }

  private async validarNoParticipaEnTorneoDb(conn: any, usuarioId: number, torneoId: number, nombre?: string, dni?: string) {
    const ident = nombre ? (dni ? `"${nombre}" (DNI: ${dni})` : `"${nombre}"`) : 'El jugador';
    const [rows]: any = await conn.query(
      `SELECT e.nombre as equipo_nombre
       FROM equipo_jugador ej
       JOIN equipo e ON ej.fk_equipo_id = e.id
       WHERE ej.fk_usuario_id = ? AND e.fk_torneo_id = ? AND ej.estado_invitacion = 'ACEPTADA'
       FOR UPDATE`,
      [usuarioId, torneoId]
    );
    if (rows && rows.length > 0) {
      throw new AppError(
        `El jugador ${ident} ya se encuentra inscripto en el equipo '${rows[0].equipo_nombre}' dentro de este mismo torneo. No se permite jugar en más de un equipo por certamen.`,
        409
      );
    }
  }

  /**
   * Búsqueda automática de jugador registrado por DNI para corroborar cuenta previa en la plataforma
   */
  async buscarJugadorPorDni(rawDni: string) {
    const cleanDni = String(rawDni || '').replace(/\D/g, '').trim();
    if (!cleanDni || cleanDni.length < 7 || cleanDni.length > 8) {
      throw new AppError('El DNI ingresado debe contener 7 u 8 dígitos numéricos', 400);
    }

    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        'SELECT id, nombre, email, dni, estado_cuenta FROM usuario WHERE REPLACE(REPLACE(dni, ".", ""), " ", "") = ?',
        [cleanDni]
      );
      if (!rows || rows.length === 0) {
        throw new AppError(`Usuario no registrado: el jugador con DNI ${cleanDni} debe registrarse previamente en Complejo Deportivo UB`, 404);
      }
      const u = rows[0];
      return {
        id: u.id,
        nombre: u.nombre,
        dni: u.dni,
        estado_cuenta: u.estado_cuenta,
      };
    } else {
      const u = store.usuarios.find(user => user.dni && String(user.dni).replace(/\D/g, '') === cleanDni);
      if (!u) {
        throw new AppError(`Usuario no registrado: el jugador con DNI ${cleanDni} debe registrarse previamente en Complejo Deportivo UB`, 404);
      }
      return {
        id: u.id,
        nombre: u.nombre,
        dni: u.dni,
        estado_cuenta: u.estado_cuenta,
      };
    }
  }
}

export const equiposService = new EquiposService();
