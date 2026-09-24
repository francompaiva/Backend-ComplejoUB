import { AppError } from '../../middlewares/error.middleware.js';
import { isDbConnected, getPool } from '../../config/database.js';
import { store, CanchaModel } from '../../config/inMemoryStore.js';

export interface CreateCanchaDTO {
  nombre: string;
  deporte: 'Futbol 5' | 'Futbol 8' | 'Futbol 11' | 'Tenis' | 'Padel';
  superficie?: string;
  techada?: boolean;
  iluminacion?: boolean;
  precio_hora: number;
}

export class CanchasService {
  async getAll(deporte?: string) {
    if (isDbConnected()) {
      const pool = getPool()!;
      let query = 'SELECT * FROM cancha WHERE activa = true';
      const params: any[] = [];
      if (deporte) {
        query += ' AND deporte = ?';
        params.push(deporte);
      }
      query += ' ORDER BY id ASC';
      const [rows] = await pool.query(query, params);
      return rows;
    } else {
      let result = store.canchas.filter(c => c.activa);
      if (deporte) {
        result = result.filter(c => c.deporte.toLowerCase() === deporte.toLowerCase());
      }
      return result;
    }
  }

  async getById(id: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query('SELECT * FROM cancha WHERE id = ?', [id]);
      if (!rows || rows.length === 0) throw new AppError('Cancha no encontrada', 404);
      return rows[0];
    } else {
      const found = store.canchas.find(c => c.id === id);
      if (!found) throw new AppError('Cancha no encontrada', 404);
      return found;
    }
  }

  /**
   * RF-06: Disponibilidad de fines de semana y turnos de 1 hora
   * El sistema verificará si existen torneos programados durante el fin de semana.
   * Si los hay, las reservas comunes quedarán deshabilitadas.
   */
  async getDisponibilidad(canchaId: number, fechaStr: string) {
    const cancha = await this.getById(canchaId);
    const dateObj = new Date(fechaStr + 'T00:00:00');
    const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 6 = Sábado
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Verificar si hay torneos programados durante el fin de semana en esa fecha/cancha
    let torneoBloqueaFinDeSemana = false;
    let motivoBloqueo = '';

    if (isWeekend) {
      if (isDbConnected()) {
        const pool = getPool()!;
        const [partidosTorneo]: any = await pool.query(
          'SELECT p.id, t.nombre as torneo_nombre FROM partido p JOIN torneo t ON p.fk_torneo_id = t.id WHERE p.fecha = ? AND (t.estado = "EN_CURSO" OR t.estado = "INSCRIPCION_ABIERTA")',
          [fechaStr]
        );
        if (partidosTorneo && partidosTorneo.length > 0) {
          torneoBloqueaFinDeSemana = true;
          motivoBloqueo = `Reservas comunes deshabilitadas por Torneo: ${partidosTorneo[0].torneo_nombre} (RF-06)`;
        }
      } else {
        const partidosTorneo = store.partidos.filter(p => p.fecha === fechaStr);
        if (partidosTorneo.length > 0) {
          torneoBloqueaFinDeSemana = true;
          motivoBloqueo = 'Reservas comunes deshabilitadas por Torneo programado el fin de semana (RF-06)';
        }
      }
    }

    // Obtener reservas existentes para la fecha y cancha
    let reservasExistentes: Array<{ hora: string; estado: string }> = [];
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        'SELECT hora, estado FROM reserva WHERE fk_cancha_id = ? AND fecha = ? AND estado = "CONFIRMADA"',
        [canchaId, fechaStr]
      );
      reservasExistentes = rows;
    } else {
      reservasExistentes = store.reservas
        .filter(r => r.fk_cancha_id === canchaId && r.fecha === fechaStr && r.estado === 'CONFIRMADA')
        .map(r => ({ hora: r.hora, estado: r.estado }));
    }

    // Obtener partidos de torneo que ocupen esta cancha específica
    let partidosEnCancha: Array<{ hora: string; id: number }> = [];
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        'SELECT hora, id FROM partido WHERE fk_cancha_id = ? AND fecha = ? AND estado != "SUSPENDIDO"',
        [canchaId, fechaStr]
      );
      partidosEnCancha = rows;
    } else {
      partidosEnCancha = store.partidos
        .filter(p => p.fk_cancha_id === canchaId && p.fecha === fechaStr && p.estado !== 'SUSPENDIDO')
        .map(p => ({ hora: p.hora, id: p.id }));
    }

    // Generar franjas horarias de 08:00 a 23:00 (duración fija de 1 hora)
    const slots = [];
    for (let h = 8; h <= 23; h++) {
      const hourStr = `${h.toString().padStart(2, '0')}:00:00`;
      const timeDisplay = `${h.toString().padStart(2, '0')}:00`;

      const estaReservado = reservasExistentes.some(r => r.hora.startsWith(hourStr.slice(0, 5)));
      const tienePartido = partidosEnCancha.some(p => p.hora.startsWith(hourStr.slice(0, 5)));

      let estado: 'Libre' | 'Ocupado' | 'DeshabilitadoTorneo' | 'Mantenimiento' = 'Libre';
      let motivo = '';

      if (torneoBloqueaFinDeSemana) {
        estado = 'DeshabilitadoTorneo';
        motivo = motivoBloqueo;
      } else if (estaReservado) {
        estado = 'Ocupado';
        motivo = 'Turno reservado por otro usuario';
      } else if (tienePartido) {
        estado = 'Ocupado';
        motivo = 'Partido oficial de torneo';
      }

      slots.push({
        hora: timeDisplay,
        horaCompleta: hourStr,
        estado,
        motivo,
        precioHora: cancha.precio_hora,
        montoSena: Math.round(cancha.precio_hora * 0.3), // 30% de seña obligatoria
      });
    }

    return {
      cancha,
      fecha: fechaStr,
      esFinDeSemana: isWeekend,
      bloqueadoPorTorneo: torneoBloqueaFinDeSemana,
      motivoBloqueo,
      slots,
    };
  }

  async create(data: CreateCanchaDTO, adminId: number) {
    if (!data.nombre || !data.deporte || !data.precio_hora) {
      throw new AppError('Nombre, deporte y precio por hora son obligatorios', 400);
    }

    const deporteNorm = (data.deporte as string).replace('ú', 'u').replace('á', 'a') as any;

    if (isDbConnected()) {
      const pool = getPool()!;
      const [res]: any = await pool.query(
        'INSERT INTO cancha (nombre, deporte, superficie, techada, iluminacion, precio_hora, activa) VALUES (?, ?, ?, ?, ?, ?, true)',
        [data.nombre, deporteNorm, data.superficie || 'Sintetico', !!data.techada, data.iluminacion !== false, data.precio_hora]
      );
      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "CREAR_CANCHA", "cancha", ?, ?)',
        [adminId || null, res.insertId, JSON.stringify(data)]
      );
      return this.getById(res.insertId);
    } else {
      const newId = store.canchas.length > 0 ? Math.max(...store.canchas.map(c => c.id)) + 1 : 1;
      const newCancha: CanchaModel = {
        id: newId,
        nombre: data.nombre,
        deporte: data.deporte,
        superficie: data.superficie || 'Sintético',
        techada: !!data.techada,
        iluminacion: data.iluminacion !== false,
        precio_hora: data.precio_hora,
        activa: true,
      };
      store.canchas.push(newCancha);
      store.auditLogs.push({
        id: store.auditLogs.length + 1,
        fk_usuario_id: adminId,
        accion: 'CREAR_CANCHA',
        entidad_afectada: 'cancha',
        entidad_id: newId,
        detalles: JSON.stringify(data),
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
      });
      return newCancha;
    }
  }

  async update(id: number, data: Partial<CreateCanchaDTO & { activa: boolean }>, adminId: number) {
    const existing = await this.getById(id);

    if (isDbConnected()) {
      const pool = getPool()!;
      const fields: string[] = [];
      const values: any[] = [];
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) {
          fields.push(`${k} = ?`);
          values.push(v);
        }
      }
      if (fields.length > 0) {
        values.push(id);
        await pool.query(`UPDATE cancha SET ${fields.join(', ')} WHERE id = ?`, values);
        await pool.query(
          'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "MODIFICAR_CANCHA", "cancha", ?, ?)',
          [adminId, id, JSON.stringify(data)]
        );
      }
      return this.getById(id);
    } else {
      Object.assign(existing, data);
      store.auditLogs.push({
        id: store.auditLogs.length + 1,
        fk_usuario_id: adminId,
        accion: 'MODIFICAR_CANCHA',
        entidad_afectada: 'cancha',
        entidad_id: id,
        detalles: JSON.stringify(data),
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
      });
      return existing;
    }
  }

  async delete(id: number, adminId: number) {
    await this.getById(id);
    if (isDbConnected()) {
      const pool = getPool()!;
      await pool.query('UPDATE cancha SET activa = false WHERE id = ?', [id]);
      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "ELIMINAR_CANCHA", "cancha", ?, NULL)',
        [adminId, id]
      );
    } else {
      const idx = store.canchas.findIndex(c => c.id === id);
      if (idx !== -1) store.canchas[idx].activa = false;
      store.auditLogs.push({
        id: store.auditLogs.length + 1,
        fk_usuario_id: adminId,
        accion: 'ELIMINAR_CANCHA',
        entidad_afectada: 'cancha',
        entidad_id: id,
        detalles: null,
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
      });
    }
    return { message: 'Cancha dada de baja con éxito' };
  }
}

export const canchasService = new CanchasService();
