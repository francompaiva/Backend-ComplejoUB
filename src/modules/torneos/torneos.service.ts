import { AppError } from '../../middlewares/error.middleware.js';
import { isDbConnected, getPool } from '../../config/database.js';
import { store, TorneoModel, PartidoModel } from '../../config/in-memory-store.js';

export interface CreateTorneoDTO {
  nombre: string;
  deporte: 'Futbol 5' | 'Futbol 8' | 'Futbol 11' | 'Tenis' | 'Padel';
  costoInscripcion?: number;
  costo_inscripcion?: number;
  valorPartido?: number;
  valor_partido?: number;
  maxEquipos?: number;
  max_equipos?: number;
  minJugadoresEquipo?: number;
  min_jugadores_equipo?: number;
  maxJugadoresEquipo?: number;
  max_jugadores_equipo?: number;
  fechaInicio?: string;
  fecha_inicio?: string;
  fechaFin?: string;
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
    const { nombre, deporte } = data;
    const costoInscripcion = data.costoInscripcion ?? data.costo_inscripcion;
    const valorPartido = data.valorPartido ?? data.valor_partido;
    const maxEquipos = data.maxEquipos ?? data.max_equipos;

    if (!nombre || !deporte || costoInscripcion === undefined || valorPartido === undefined || !maxEquipos) {
      throw new AppError('Todos los campos del torneo son obligatorios', 400);
    }

    if (maxEquipos < 2) {
      throw new AppError('La cantidad máxima de equipos debe ser al menos 2', 400);
    }

    const deporteNorm = deporte.replace('ú', 'u').replace('á', 'a');
    const minJugadores = data.minJugadoresEquipo ?? data.min_jugadores_equipo ?? (deporteNorm === 'Futbol 5' ? 5 : deporteNorm === 'Padel' ? 2 : 7);
    const maxJugadores = data.maxJugadoresEquipo ?? data.max_jugadores_equipo ?? (deporteNorm === 'Futbol 5' ? 12 : deporteNorm === 'Padel' ? 4 : 16);
    const fechaInicio = data.fechaInicio ?? data.fecha_inicio ?? new Date().toISOString().slice(0, 10);
    const defaultFin = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const fechaFin = data.fechaFin ?? data.fecha_fin ?? defaultFin;

    if (isDbConnected()) {
      const pool = getPool()!;
      const [result]: any = await pool.query(
        `INSERT INTO torneo (nombre, deporte, costo_inscripcion, valor_partido, max_equipos, min_jugadores_equipo, max_jugadores_equipo, fecha_inicio, fecha_fin, estado, reglamento)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'INSCRIPCION_ABIERTA', ?)`,
        [nombre, deporteNorm, costoInscripcion, valorPartido, maxEquipos, minJugadores, maxJugadores, fechaInicio, fechaFin, data.reglamento || null]
      );
      const torneoId = result.insertId;

      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "CREAR_TORNEO", "torneo", ?, ?)',
        [adminId || null, torneoId, JSON.stringify(data)]
      );

      return this.getById(torneoId);
    } else {
      const newId = store.torneos.length > 0 ? Math.max(...store.torneos.map(t => t.id)) + 1 : 1;
      const newTorneo: TorneoModel = {
        id: newId,
        nombre,
        deporte,
        costo_inscripcion: costoInscripcion,
        valor_partido: valorPartido,
        max_equipos: maxEquipos,
        min_jugadores_equipo: minJugadores,
        max_jugadores_equipo: maxJugadores,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
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
   * Cierra inscripciones, genera cruces de liga todos contra todos en transacción atómica.
   */
  async generarFixture(
    torneoId: number,
    adminId: number,
    fechaInicioStr?: string,
  ) {
    const normalizeSport = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    const formatLocalDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const torneo = await this.getById(torneoId);
    if (!torneo) {
      throw new AppError("Torneo no encontrado", 404);
    }
    if (torneo.estado !== "INSCRIPCION_ABIERTA") {
      throw new AppError(
        "Solo se puede generar el fixture de un torneo con inscripciones abiertas (fixture inmutable)",
        400,
      );
    }
    // Obtener equipos inscriptos y canchas activas del deporte
    let equipos: Array<{ id: number; nombre: string }> = [];
    let canchas: Array<{ id: number }> = [];
    const ocupados = new Set<string>(); // `${canchaId}|${YYYY-MM-DD}|${HH:mm}`
    if (isDbConnected()) {
      const pool = getPool()!;
      const [eqRows]: any = await pool.query(
        "SELECT id, nombre FROM equipo WHERE fk_torneo_id = ? ORDER BY id ASC",
        [torneoId],
      );
      equipos = eqRows;
      const [cRows]: any = await pool.query(
        "SELECT id, deporte FROM cancha WHERE activa = true ORDER BY id ASC",
      );
      canchas = cRows
        .filter(
          (c: any) =>
            normalizeSport(c.deporte) === normalizeSport(torneo.deporte),
        )
        .map((c: any) => ({ id: Number(c.id) }));
    } else {
      equipos = store.equipos
        .filter((e) => e.fk_torneo_id === torneoId)
        .map((e) => ({ id: e.id, nombre: e.nombre }));
      canchas = store.canchas
        .filter(
          (c) =>
            c.activa &&
            normalizeSport(c.deporte) === normalizeSport(torneo.deporte),
        )
        .map((c) => ({ id: c.id }));
    }
    if (equipos.length < 2) {
      throw new AppError(
        "Se necesitan al menos 2 equipos inscriptos para generar el fixture del torneo",
        400,
      );
    }
    if (canchas.length === 0) {
      throw new AppError(
        `No hay canchas activas de ${torneo.deporte} para programar el fixture`,
        400,
      );
    }
    // Algoritmo Round-Robin
    const teamsList = [...equipos];
    if (teamsList.length % 2 !== 0) {
      teamsList.push({ id: -1, nombre: "FECHA_LIBRE" });
    }
    const n = teamsList.length;
    const totalFechas = n - 1;
    const partidosPorFecha = n / 2;
    const cleanInicio = fechaInicioStr
      ? fechaInicioStr.includes("T")
        ? fechaInicioStr.split("T")[0]
        : fechaInicioStr
      : formatLocalDate(new Date());
    const [iy, im, iday] = cleanInicio.split("-").map(Number);
    const baseDate = new Date(iy, im - 1, iday);
    if (Number.isNaN(baseDate.getTime())) {
      throw new AppError("Fecha de inicio inválida para el fixture", 400);
    }
    // Ajustar fecha base al sábado correspondiente (RF-06)
    const dow = baseDate.getDay();
    if (dow !== 6) {
      const daysUntilSaturday = (6 - dow + 7) % 7;
      baseDate.setDate(baseDate.getDate() + daysUntilSaturday);
    }
    const canchaIds = canchas.map((c) => c.id);
    const minFecha = formatLocalDate(baseDate);
    const maxDate = new Date(baseDate);
    maxDate.setDate(maxDate.getDate() + (totalFechas + 4) * 7);
    const maxFecha = formatLocalDate(maxDate);
    // Pre-cargar turnos ocupados por otros torneos o reservas confirmadas
    if (isDbConnected()) {
      const pool = getPool()!;
      const placeholders = canchaIds.map(() => "?").join(",");
      const [partRows]: any = await pool.query(
        `SELECT fk_cancha_id, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha_str, TIME_FORMAT(hora, '%H:%i') AS hora_str
         FROM partido
         WHERE fk_torneo_id <> ? AND fk_cancha_id IN (${placeholders}) AND fecha BETWEEN ? AND ?`,
        [torneoId, ...canchaIds, minFecha, maxFecha],
      );
      for (const r of partRows) {
        ocupados.add(`${r.fk_cancha_id}|${r.fecha_str}|${r.hora_str}`);
      }
      const [resRows]: any = await pool.query(
        `SELECT fk_cancha_id, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha_str, TIME_FORMAT(hora, '%H:%i') AS hora_str
         FROM reserva
         WHERE estado = 'CONFIRMADA' AND fk_cancha_id IN (${placeholders}) AND fecha BETWEEN ? AND ?`,
        [...canchaIds, minFecha, maxFecha],
      );
      for (const r of resRows) {
        ocupados.add(`${r.fk_cancha_id}|${r.fecha_str}|${r.hora_str}`);
      }
    } else {
      for (const p of store.partidos) {
        if (
          p.fk_torneo_id !== torneoId &&
          p.fk_cancha_id &&
          canchaIds.includes(p.fk_cancha_id)
        ) {
          ocupados.add(
            `${p.fk_cancha_id}|${p.fecha}|${String(p.hora).slice(0, 5)}`,
          );
        }
      }
      for (const r of store.reservas) {
        if (r.estado === "CONFIRMADA" && canchaIds.includes(r.fk_cancha_id)) {
          ocupados.add(
            `${r.fk_cancha_id}|${r.fecha}|${String(r.hora).slice(0, 5)}`,
          );
        }
      }
    }
    const buscarSlotLibre = (fechaStr: string) => {
      for (let h = 18; h <= 23; h++) {
        const hhmm = `${String(h).padStart(2, "0")}:00`;
        for (const cId of canchaIds) {
          const key = `${cId}|${fechaStr}|${hhmm}`;
          if (!ocupados.has(key)) {
            ocupados.add(key);
            return { canchaId: cId, hora: `${hhmm}:00` };
          }
        }
      }
      return null;
    };
    const fixtureGenerated: Array<{
      torneoId: number;
      canchaId: number | null;
      localId: number;
      visitanteId: number | null;
      numeroFecha: number;
      fecha: string;
      hora: string;
      estado: "PROGRAMADO";
    }> = [];
    for (let round = 0; round < totalFechas; round++) {
      const roundDate = new Date(baseDate);
      roundDate.setDate(roundDate.getDate() + round * 7);
      const fechaStr = formatLocalDate(roundDate);
      for (let match = 0; match < partidosPorFecha; match++) {
        const homeIdx = (round + match) % (n - 1);
        let awayIdx = (n - 1 - match + round) % (n - 1);
        if (match === 0) awayIdx = n - 1;
        const teamA = teamsList[homeIdx];
        const teamB = teamsList[awayIdx];
        if (teamA.id === -1 || teamB.id === -1) {
          const teamReal = teamA.id === -1 ? teamB : teamA;
          fixtureGenerated.push({
            torneoId,
            canchaId: null,
            localId: teamReal.id,
            visitanteId: null,
            numeroFecha: round + 1,
            fecha: fechaStr,
            hora: "18:00:00",
            estado: "PROGRAMADO",
          });
        } else {
          const slot = buscarSlotLibre(fechaStr);
          if (!slot) {
            throw new AppError(
              `No hay suficientes canchas u horarios libres (18:00–23:00) el sábado ${fechaStr} para programar la Fecha ${round + 1}`,
              409,
            );
          }
          fixtureGenerated.push({
            torneoId,
            canchaId: slot.canchaId,
            localId: teamA.id,
            visitanteId: teamB.id,
            numeroFecha: round + 1,
            fecha: fechaStr,
            hora: slot.hora,
            estado: "PROGRAMADO",
          });
        }
      }
    }
    if (isDbConnected()) {
      const pool = getPool()!;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        // Bloquear fila del torneo hasta terminar todo el fixture
        const [tRows]: any = await conn.query(
          "SELECT estado FROM torneo WHERE id = ? FOR UPDATE",
          [torneoId],
        );
        if (!tRows || tRows.length === 0) {
          throw new AppError("Torneo no encontrado", 404);
        }
        if (tRows[0].estado !== "INSCRIPCION_ABIERTA") {
          throw new AppError(
            "El fixture ya fue generado o el torneo cambió de estado",
            409,
          );
        }
        await conn.query("DELETE FROM partido WHERE fk_torneo_id = ?", [
          torneoId,
        ]);
        for (const p of fixtureGenerated) {
          await conn.query(
            `INSERT INTO partido (fk_torneo_id, fk_cancha_id, fk_equipo_local_id, fk_equipo_visitante_id, numero_fecha, fecha, hora, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'PROGRAMADO')`,
            [
              p.torneoId,
              p.canchaId,
              p.localId,
              p.visitanteId,
              p.numeroFecha,
              p.fecha,
              p.hora,
            ],
          );
        }
        await conn.query(
          'UPDATE torneo SET estado = "EN_CURSO" WHERE id = ?',
          [torneoId],
        );
        await conn.query(
          'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "GENERAR_FIXTURE", "torneo", ?, ?)',
          [
            adminId,
            torneoId,
            JSON.stringify({
              totalFechas,
              totalPartidos: fixtureGenerated.length,
            }),
          ],
        );
        await conn.commit();
      } catch (err: any) {
        await conn.rollback();
        if (err?.code === "ER_DUP_ENTRY") {
          throw new AppError(
            "Conflicto de horario en cancha al guardar el fixture. Reintentá nuevamente.",
            409,
          );
        }
        throw err;
      } finally {
        conn.release();
      }
    } else {
      torneo.estado = "EN_CURSO";
      store.partidos = store.partidos.filter(
        (p) => p.fk_torneo_id !== torneoId,
      );
      let nextPartId =
        store.partidos.length > 0
          ? Math.max(...store.partidos.map((p) => p.id)) + 1
          : 1;
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
          estado: "PROGRAMADO",
          goles_local: null,
          goles_visitante: null,
          observaciones: null,
        });
      }
      store.auditLogs.push({
        id: store.auditLogs.length + 1,
        fk_usuario_id: adminId,
        accion: "GENERAR_FIXTURE",
        entidad_afectada: "torneo",
        entidad_id: torneoId,
        detalles: JSON.stringify({
          totalFechas,
          totalPartidos: fixtureGenerated.length,
        }),
        ip_address: "127.0.0.1",
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
        `SELECT p.*, COALESCE(c.nombre, 'Fecha Libre') as cancha_nombre, el.nombre as equipo_local, ev.nombre as equipo_visitante, u.nombre as arbitro_nombre
         FROM partido p
         LEFT JOIN cancha c ON p.fk_cancha_id = c.id
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

  /**
   * RF-07 / Admin: Eliminación de torneo y datos asociados
   * BUG-011: Protección estricta de historial deportivo y partidos disputados
   */
  async delete(id: number, adminId: number) {
    const torneo = await this.getById(id);

    // 1. Prohibir eliminación si el torneo cuenta con partidos disputados
    if (isDbConnected()) {
      const pool = getPool()!;
      const [disputadosRows]: any = await pool.query(
        'SELECT COUNT(*) as count FROM partido WHERE fk_torneo_id = ? AND estado = "DISPUTADO"',
        [id]
      );
      const disputados = disputadosRows && disputadosRows[0] ? Number(disputadosRows[0].count) : 0;
      if (disputados > 0) {
        throw new AppError(
          `No es posible eliminar el torneo "${torneo.nombre}" porque ya cuenta con ${disputados} partido(s) disputado(s) e historial deportivo registrado. Para cerrarlo, debe archivarse o marcarse como Finalizado/Cancelado.`,
          400
        );
      }

      if (torneo.estado !== 'INSCRIPCION_ABIERTA') {
        throw new AppError(
          `No es posible eliminar físicamente un torneo en estado "${torneo.estado}". Solo pueden eliminarse torneos en estado "INSCRIPCION_ABIERTA" sin actividad deportiva disputada.`,
          400
        );
      }

      const [partidosRows]: any = await pool.query('SELECT COUNT(*) as count FROM partido WHERE fk_torneo_id = ?', [id]);
      const totalPartidos = partidosRows && partidosRows[0] ? Number(partidosRows[0].count) : 0;
      if (totalPartidos > 0) {
        throw new AppError(
          `No es posible eliminar el torneo porque ya posee un fixture generado con ${totalPartidos} partido(s). Cancele el torneo en lugar de eliminarlo para preservar la integridad operativa.`,
          400
        );
      }

      // Proceder con la eliminación física segura
      await pool.query('DELETE FROM torneo WHERE id = ?', [id]);

      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "ELIMINAR_TORNEO", "torneo", ?, ?)',
        [adminId, id, JSON.stringify({ nombre: torneo.nombre, deporte: torneo.deporte })]
      );
    } else {
      const disputados = store.partidos.filter(p => p.fk_torneo_id === id && p.estado === 'DISPUTADO').length;
      if (disputados > 0) {
        throw new AppError(
          `No es posible eliminar el torneo "${torneo.nombre}" porque ya cuenta con ${disputados} partido(s) disputado(s) e historial deportivo registrado. Para cerrarlo, debe archivarse o marcarse como Finalizado/Cancelado.`,
          400
        );
      }

      if (torneo.estado !== 'INSCRIPCION_ABIERTA') {
        throw new AppError(
          `No es posible eliminar físicamente un torneo en estado "${torneo.estado}". Solo pueden eliminarse torneos en estado "INSCRIPCION_ABIERTA" sin actividad deportiva disputada.`,
          400
        );
      }

      const totalPartidos = store.partidos.filter(p => p.fk_torneo_id === id).length;
      if (totalPartidos > 0) {
        throw new AppError(
          `No es posible eliminar el torneo porque ya posee un fixture generado con ${totalPartidos} partido(s). Cancele el torneo en lugar de eliminarlo para preservar la integridad operativa.`,
          400
        );
      }

      // Limpiar datos asociados en memoria solo si no tiene partidos
      const equiposDelTorneo = store.equipos.filter(e => e.fk_torneo_id === id).map(e => e.id);
      store.equipoJugadores = store.equipoJugadores.filter(ej => !equiposDelTorneo.includes(ej.fk_equipo_id));
      store.equipos = store.equipos.filter(e => e.fk_torneo_id !== id);
      store.torneos = store.torneos.filter(t => t.id !== id);

      store.auditLogs.push({
        id: store.auditLogs.length + 1,
        fk_usuario_id: adminId,
        accion: 'ELIMINAR_TORNEO',
        entidad_afectada: 'torneo',
        entidad_id: id,
        detalles: JSON.stringify({ nombre: torneo.nombre, deporte: torneo.deporte }),
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
      });
    }

    return { id, message: `Torneo "${torneo.nombre}" eliminado exitosamente` };
  }

  /**
   * Cancelar o archivar torneo preservando su historial deportivo completo
   */
  async cancelar(id: number, adminId: number, motivo?: string) {
    const torneo = await this.getById(id);
    if (torneo.estado === 'CANCELADO') {
      throw new AppError('El torneo ya se encuentra cancelado', 400);
    }

    if (isDbConnected()) {
      const pool = getPool()!;
      await pool.query('UPDATE torneo SET estado = "CANCELADO" WHERE id = ?', [id]);
      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "CANCELAR_TORNEO", "torneo", ?, ?)',
        [adminId, id, JSON.stringify({ nombre: torneo.nombre, motivo: motivo || 'Cancelado por administración' })]
      );
    } else {
      const t = store.torneos.find(item => item.id === id);
      if (t) t.estado = 'CANCELADO';
      store.auditLogs.push({
        id: store.auditLogs.length + 1,
        fk_usuario_id: adminId,
        accion: 'CANCELAR_TORNEO',
        entidad_afectada: 'torneo',
        entidad_id: id,
        detalles: JSON.stringify({ nombre: torneo.nombre, motivo: motivo || 'Cancelado por administración' }),
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
      });
    }

    return { id, estado: 'CANCELADO', message: `Torneo "${torneo.nombre}" cancelado y archivado exitosamente para preservar su historial.` };
  }
}

export const torneosService = new TorneosService();
