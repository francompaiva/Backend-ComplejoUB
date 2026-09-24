import { AppError } from '../../middlewares/error.middleware.js';
import { isDbConnected, getPool } from '../../config/database.js';
import { store, ListaEsperaModel } from '../../config/inMemoryStore.js';
import { canchasService } from '../canchas/canchas.service.js';

export interface UnirseListaEsperaDTO {
  canchaId: number;
  fecha: string;
  hora: string;
}

export class ListaEsperaService {
  async unirse(userId: number, data: UnirseListaEsperaDTO) {
    const { canchaId, fecha } = data;
    let hora = data.hora;
    if (hora.length === 5) hora = `${hora}:00`;

    const cancha = await canchasService.getById(canchaId);

    if (isDbConnected()) {
      const pool = getPool()!;
      // Verificar si ya está anotado
      const [existing]: any = await pool.query(
        'SELECT id FROM lista_espera WHERE fk_usuario_id = ? AND fk_cancha_id = ? AND fecha = ? AND hora = ? AND estado = "PENDIENTE"',
        [userId, canchaId, fecha, hora]
      );
      if (existing && existing.length > 0) {
        throw new AppError('Ya te encuentras registrado en la lista de espera para este horario', 400);
      }

      const [res]: any = await pool.query(
        'INSERT INTO lista_espera (fk_usuario_id, fk_cancha_id, fecha, hora, estado) VALUES (?, ?, ?, ?, "PENDIENTE")',
        [userId, canchaId, fecha, hora]
      );

      return {
        id: res.insertId,
        canchaId,
        canchaNombre: cancha.nombre,
        fecha,
        hora,
        estado: 'PENDIENTE',
        mensaje: 'Te has anotado exitosamente en la lista de espera. Te notificaremos si el turno se libera.',
      };
    } else {
      const existing = store.listasEspera.find(
        l => l.fk_usuario_id === userId && l.fk_cancha_id === canchaId && l.fecha === fecha && l.hora === hora && l.estado === 'PENDIENTE'
      );
      if (existing) {
        throw new AppError('Ya te encuentras registrado en la lista de espera para este horario', 400);
      }

      const newId = store.listasEspera.length > 0 ? Math.max(...store.listasEspera.map(l => l.id)) + 1 : 1;
      const item: ListaEsperaModel = {
        id: newId,
        fk_usuario_id: userId,
        fk_cancha_id: canchaId,
        fecha,
        hora,
        estado: 'PENDIENTE',
      };
      store.listasEspera.push(item);

      return {
        ...item,
        canchaNombre: cancha.nombre,
        mensaje: 'Te has anotado exitosamente en la lista de espera. Te notificaremos si el turno se libera.',
      };
    }
  }

  async getMisEspera(userId: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows] = await pool.query(
        `SELECT l.*, c.nombre as cancha_nombre, c.deporte
         FROM lista_espera l
         JOIN cancha c ON l.fk_cancha_id = c.id
         WHERE l.fk_usuario_id = ?
         ORDER BY l.fecha DESC, l.hora ASC`,
        [userId]
      );
      return rows;
    } else {
      return store.listasEspera
        .filter(l => l.fk_usuario_id === userId)
        .map(l => {
          const c = store.canchas.find(ca => ca.id === l.fk_cancha_id);
          return {
            ...l,
            cancha_nombre: c?.nombre || 'Cancha',
            deporte: c?.deporte || 'Futbol 5',
          };
        });
    }
  }

  async cancelar(id: number, userId: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      await pool.query('UPDATE lista_espera SET estado = "CANCELADO" WHERE id = ? AND fk_usuario_id = ?', [id, userId]);
      return { message: 'Inscripción en lista de espera cancelada' };
    } else {
      const item = store.listasEspera.find(l => l.id === id && l.fk_usuario_id === userId);
      if (item) item.estado = 'CANCELADO';
      return { message: 'Inscripción en lista de espera cancelada' };
    }
  }
}

export const listaEsperaService = new ListaEsperaService();
