import { AppError } from '../../middlewares/error.middleware.js';
import { isDbConnected, getPool } from '../../config/database.js';
import { store, TorneoModel, PartidoModel } from '../../config/inMemoryStore.js';

export interface CreateTorneoDTO {
  nombre: string;
  deporte: 'Futbol 5' | 'Futbol 8' | 'Futbol 11' | 'Tenis' | 'Padel';
  costo_inscripcion: number;
  valor_partido: number;
  max_equipos: number;
  min_jugadores_equipo?: number;
  max_jugadores_equipo?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  reglamento?: string;
}

export class TorneosService {
  async getAll(estado?: string) {
    if (isDbConnected()) {
      const pool = getPool()!;
      let query = 'SELECT * FROM torneo';
      const params: any[] = [];
      if (estado) {
        query += ' WHERE estado = ?';
        params.push(estado);
      }
      query += ' ORDER BY id DESC';
      const [rows] = await pool.query(query, params);
      return rows;
    } else {
      let list = store.torneos;
      if (estado) list = list.filter(t => t.estado === estado);
      return list;
    }
  }

  async getById(id: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query('SELECT * FROM torneo WHERE id = ?', [id]);
      if (!rows || rows.length === 0) throw new AppError('Torneo no encontrado', 404);
      return rows[0];
    } else {
      const found = store.torneos.find(t => t.id === id);
      if (!found) throw new AppError('Torneo no encontrado', 404);
      return found;
    }
  }

  /**
   * RF-07: Creación de torneos por el Administrador
   */
  async create(data: CreateTorneoDTO, adminId: number) {
    const { nombre, deporte, costo_inscripcion, valor_partido, max_equipos } = data;

    if (!nombre || !deporte || costo_inscripcion === undefined || valor_partido === undefined || !max_equipos) {
      throw new AppError('Todos los campos del torneo son obligatorios', 400);
    }

    if (max_equipos < 2) {
      throw new AppError('La cantidad máxima de equipos debe ser al menos 2', 400);
    }

    const minJugadores = data.min_jugadores_equipo || (deporte === 'Futbol 5' ? 5 : deporte === 'Padel' ? 2 : 7);
    const maxJugadores = data.max_jugadores_equipo || (deporte === 'Futbol 5' ? 12 : deporte === 'Padel' ? 4 : 16);

    if (isDbConnected()) {
      const pool = getPool()!;
      const [result]: any = await pool.query(
        `INSERT INTO torneo (nombre, deporte, costo_inscripcion, valor_partido, max_equipos, min_jugadores_equipo, max_jugadores_equipo, fecha_inicio, fecha_fin, estado, reglamento)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'INSCRIPCION_ABIERTA', ?)`,
        [nombre, deporte, costo_inscripcion, valor_partido, max_equipos, minJugadores, maxJugadores, data.fecha_inicio || null, data.fecha_fin || null, data.reglamento || null]
      );
      const torneoId = result.insertId;

      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "CREAR_TORNEO", "torneo", ?, ?)',
        [adminId, torneoId, JSON.stringify(data)]
      );

      return this.getById(torneoId);
    } else {
      const newId = store.torneos.length > 0 ? Math.max(...store.torneos.map(t => t.id)) + 1 : 1;
      const newTorneo: TorneoModel = {
        id: newId,
        nombre,
        deporte,
        costo_inscripcion,
        valor_partido,
        max_equipos,
        min_jugadores_equipo: minJugadores,
        max_jugadores_equipo: maxJugadores,
        fecha_inicio: data.fecha_inicio || null,
        fecha_fin: data.fecha_fin || null,
        estado: 'INSCRIPCION_ABIERTA',
        reglamento: data.reglamento,
      };
      store.torneos.push(newTorneo);

      store.auditLogs.push({
        id: store.auditLogs.length + 1,
        fk_usuario_id: adminId,
        accion: 'CREAR_TORNEO',
        entidad_afectada: 'torneo',
        entidad_id: newId,
        detalles: JSON.stringify(data),
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
      });

      return newTorneo;
    }
  }

  /**
   * RF-09: Generación automática de fixture Round-Robin
   * Cierra inscripciones, genera cruces de liga todos contra todos.
   * Si la cantidad de equipos es impar, asigna una fecha libre rotativa dejando rival en null.
   */
  async generarFixture(torneoId: number, adminId: number, fechaInicioStr?: string) {
    const torneo = await this.getById(torneoId);

    // Obtener equipos inscriptos
    let equipos: Array<{ id: number; nombre: string }> = [];
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query('SELECT id, nombre FROM equipo WHERE fk_torneo_id = ?', [torneoId]);
      equipos = rows;
    } else {
      equipos = store.equipos.filter(e => e.fk_torneo_id === torneoId).map(e => ({ id: e.id, nombre: e.nombre }));
    }

    if (equipos.length < 2) {
      throw new AppError('Se necesitan al menos 2 equipos inscriptos para generar el fixture del torneo', 400);
    }

    // Obtener canchas disponibles para este deporte
    let canchas: Array<{ id: number }> = [];
    if (isDbConnected()) {
      const pool = getPool()!;
      const [cRows]: any = await pool.query('SELECT id FROM cancha WHERE deporte = ? AND activa = true', [torneo.deporte]);
      canchas = cRows;
    } else {
      canchas = store.canchas.filter(c => c.deporte === torneo.deporte && c.activa).map(c => ({ id: c.id }));
    }
    const fallbackCanchaId = canchas.length > 0 ? canchas[0].id : 1;

    // Algoritmo Round-Robin
    const teamsList = [...equipos];
    const isOdd = teamsList.length % 2 !== 0;
    if (isOdd) {
      // Dummy team para fecha libre
      teamsList.push({ id: -1, nombre: 'FECHA_LIBRE' });
    }

    const n = teamsList.length;
    const totalFechas = n - 1;
    const partidosPorFecha = n / 2;

    const fixtureGenerated: Array<{
      torneoId: number;
      canchaId: number;
      localId: number;
      visitanteId: number | null;
      numeroFecha: number;
      fecha: string;
      hora: string;
      estado: 'PROGRAMADO';
    }> = [];

    const baseDate = fechaInicioStr ? new Date(fechaInicioStr) : new Date();

    for (let round = 0; round < totalFechas; round++) {
      const roundDate = new Date(baseDate);
      roundDate.setDate(roundDate.getDate() + round * 7); // Un sábado/semana por fecha
      const fechaStr = roundDate.toISOString().split('T')[0];

      for (let match = 0; match < partidosPorFecha; match++) {
        const homeIdx = (round + match) % (n - 1);
        let awayIdx = (n - 1 - match + round) % (n - 1);
        if (match === 0) {
          awayIdx = n - 1;
        }

        const teamA = teamsList[homeIdx];
        const teamB = teamsList[awayIdx];

        // Determinar local y visitante (o fecha libre)
        if (teamA.id === -1) {
          // teamB tiene fecha libre
          fixtureGenerated.push({
            torneoId,
            canchaId: fallbackCanchaId,
            localId: teamB.id,
            visitanteId: null, // Fecha Libre
            numeroFecha: round + 1,
            fecha: fechaStr,
            hora: '19:00:00',
            estado: 'PROGRAMADO',
          });
        } else if (teamB.id === -1) {
          // teamA tiene fecha libre
          fixtureGenerated.push({
            torneoId,
            canchaId: fallbackCanchaId,
            localId: teamA.id,
            visitanteId: null, // Fecha Libre
            numeroFecha: round + 1,
            fecha: fechaStr,
            hora: '19:00:00',
            estado: 'PROGRAMADO',
          });
        } else {
          // Cruce normal
          const canchaAsignada = canchas.length > 0 ? canchas[match % canchas.length].id : fallbackCanchaId;
          const horaAsignada = `${(18 + match).toString().padStart(2, '0')}:00:00`;

          fixtureGenerated.push({
            torneoId,
            canchaId: canchaAsignada,
            localId: teamA.id,
            visitanteId: teamB.id,
            numeroFecha: round + 1,
            fecha: fechaStr,
            hora: horaAsignada,
            estado: 'PROGRAMADO',
          });
        }
      }
    }

    if (isDbConnected()) {
      const pool = getPool()!;
      // Actualizar estado del torneo a EN_CURSO
      await pool.query('UPDATE torneo SET estado = "EN_CURSO" WHERE id = ?', [torneoId]);

      // Eliminar partidos previos si los hubiera
      await pool.query('DELETE FROM partido WHERE fk_torneo_id = ?', [torneoId]);

      // Insertar nuevos partidos
      for (const p of fixtureGenerated) {
        await pool.query(
          `INSERT INTO partido (fk_torneo_id, fk_cancha_id, fk_equipo_local_id, fk_equipo_visitante_id, numero_fecha, fecha, hora, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'PROGRAMADO')`,
          [p.torneoId, p.canchaId, p.localId, p.visitanteId, p.numeroFecha, p.fecha, p.hora]
        );
      }

      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "GENERAR_FIXTURE", "torneo", ?, ?)',
        [adminId, torneoId, JSON.stringify({ totalFechas, totalPartidos: fixtureGenerated.length })]
      );
    } else {
      torneo.estado = 'EN_CURSO';
      // Limpiar partidos previos del torneo
      store.partidos = store.partidos.filter(p => p.fk_torneo_id !== torneoId);

      let nextPartId = store.partidos.length > 0 ? Math.max(...store.partidos.map(p => p.id)) + 1 : 1;
      for (const p of fixtureGenerated) {
        store.partidos.push({
          id: nextPartId++,
          fk_torneo_id: p.torneoId,
          fk_cancha_id: p.canchaId,
          fk_equipo_local_id: p.localId,
          fk_equipo_visitante_id: p.visitanteId,
          fk_arbitro_id: null,
          numero_fecha: p.numeroFecha,
          fecha: p.fecha,
          hora: p.hora,
          estado: 'PROGRAMADO',
          goles_local: null,
          goles_visitante: null,
          observaciones: null,
        });
      }

      store.auditLogs.push({
        id: store.auditLogs.length + 1,
        fk_usuario_id: adminId,
        accion: 'GENERAR_FIXTURE',
        entidad_afectada: 'torneo',
        entidad_id: torneoId,
        detalles: JSON.stringify({ totalFechas, totalPartidos: fixtureGenerated.length }),
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
      });
    }

    return {
      torneoId,
      nombreTorneo: torneo.nombre,
      totalFechas,
      totalPartidos: fixtureGenerated.length,
      partidos: fixtureGenerated,
    };
  }

  /**
   * RF-11: Tabla de Posiciones automática
   * Puntos: Victoria = 3, Empate = 1, Derrota = 0.
   * Criterio de desempate: Puntos -> Diferencia de Goles (DG) -> Goles a Favor (GF).
   */
  async getTablaPosiciones(torneoId: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      // Ejecutar cálculo automático o consulta ordenada
      const [equipos]: any = await pool.query(
        `SELECT id, nombre, puntos, partidos_jugados, partidos_ganados, partidos_empatados, partidos_perdidos, goles_favor, goles_contra, diferencia_goles
         FROM equipo
         WHERE fk_torneo_id = ?
         ORDER BY puntos DESC, diferencia_goles DESC, goles_favor DESC, nombre ASC`,
        [torneoId]
      );
      return equipos;
    } else {
      const equipos = store.equipos
        .filter(e => e.fk_torneo_id === torneoId)
        .sort((a, b) => {
          if (b.puntos !== a.puntos) return b.puntos - a.puntos;
          if (b.diferencia_goles !== a.diferencia_goles) return b.diferencia_goles - a.diferencia_goles;
          return b.goles_favor - a.goles_favor;
        });
      return equipos;
    }
  }

  async getFixture(torneoId: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        `SELECT p.*, c.nombre as cancha_nombre, el.nombre as equipo_local, ev.nombre as equipo_visitante, u.nombre as arbitro_nombre
         FROM partido p
         JOIN cancha c ON p.fk_cancha_id = c.id
         JOIN equipo el ON p.fk_equipo_local_id = el.id
         LEFT JOIN equipo ev ON p.fk_equipo_visitante_id = ev.id
         LEFT JOIN usuario u ON p.fk_arbitro_id = u.id
         WHERE p.fk_torneo_id = ?
         ORDER BY p.numero_fecha ASC, p.fecha ASC, p.hora ASC`,
        [torneoId]
      );
      return rows;
    } else {
      return store.partidos
        .filter(p => p.fk_torneo_id === torneoId)
        .map(p => {
          const c = store.canchas.find(ca => ca.id === p.fk_cancha_id);
          const el = store.equipos.find(eq => eq.id === p.fk_equipo_local_id);
          const ev = p.fk_equipo_visitante_id ? store.equipos.find(eq => eq.id === p.fk_equipo_visitante_id) : null;
          const u = p.fk_arbitro_id ? store.usuarios.find(user => user.id === p.fk_arbitro_id) : null;
          return {
            ...p,
            cancha_nombre: c?.nombre || 'Cancha',
            equipo_local: el?.nombre || 'Local',
            equipo_visitante: ev ? ev.nombre : 'Fecha Libre',
            arbitro_nombre: u ? u.nombre : 'Sin designar',
          };
        })
        .sort((a, b) => a.numero_fecha - b.numero_fecha);
    }
  }
}

export const torneosService = new TorneosService();
