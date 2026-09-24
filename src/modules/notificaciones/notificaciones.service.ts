import { isDbConnected, getPool } from '../../config/database.js';
import { store } from '../../config/inMemoryStore.js';

export class NotificacionesService {
  async getByUsuario(usuarioId: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows] = await pool.query(
        'SELECT * FROM notificacion WHERE fk_usuario_id = ? ORDER BY created_at DESC LIMIT 50',
        [usuarioId]
      );
      return rows;
    } else {
      return store.notificaciones
        .filter(n => n.fk_usuario_id === usuarioId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  }

  async marcarLeida(id: number, usuarioId: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      await pool.query('UPDATE notificacion SET leida = true WHERE id = ? AND fk_usuario_id = ?', [id, usuarioId]);
      return { success: true };
    } else {
      const n = store.notificaciones.find(notif => notif.id === id && notif.fk_usuario_id === usuarioId);
      if (n) n.leida = true;
      return { success: true };
    }
  }

  async marcarTodasLeidas(usuarioId: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      await pool.query('UPDATE notificacion SET leida = true WHERE fk_usuario_id = ?', [usuarioId]);
      return { success: true };
    } else {
      store.notificaciones.filter(n => n.fk_usuario_id === usuarioId).forEach(n => (n.leida = true));
      return { success: true };
    }
  }
}

export const notificacionesService = new NotificacionesService();
