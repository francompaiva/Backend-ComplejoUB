import { AppError } from '../../middlewares/error.middleware.js';
import { isDbConnected, getPool } from '../../config/database.js';
import { store, SancionModel } from '../../config/in-memory-store.js';

export interface CreateSancionDTO {
  usuarioId: number;
  partidoId?: number;
  tipoSancion: string;
  descripcion: string;
}

export class SancionesService {
  async getAll(usuarioId?: number, partidoId?: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      let query = `
        SELECT s.*, u.nombre as usuario_nombre, u.email as usuario_email,
               cp.nombre as creador_nombre, cp.rol as creador_rol
        FROM sancion s
        JOIN usuario u ON s.fk_usuario_id = u.id
        JOIN usuario cp ON s.fk_creado_por_id = cp.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (usuarioId) {
        query += ' AND s.fk_usuario_id = ?';
        params.push(usuarioId);
      }
      if (partidoId) {
        query += ' AND s.fk_partido_id = ?';
        params.push(partidoId);
      }
      query += ' ORDER BY s.fecha_sancion DESC';
      const [rows] = await pool.query(query, params);
      return rows;
    } else {
      let list = store.sanciones;
      if (usuarioId) list = list.filter(s => s.fk_usuario_id === usuarioId);
      if (partidoId) list = list.filter(s => s.fk_partido_id === partidoId);

      return list.map(s => {
        const u = store.usuarios.find(user => user.id === s.fk_usuario_id);
        const cp = store.usuarios.find(user => user.id === s.fk_creado_por_id);
        return {
          ...s,
          usuario_nombre: u?.nombre || '',
          usuario_email: u?.email || '',
          creador_nombre: cp?.nombre || '',
          creador_rol: cp?.rol || '',
        };
      });
    }
  }

  async create(data: CreateSancionDTO, creadorId: number) {
    const { usuarioId, partidoId, tipoSancion, descripcion } = data;
    if (!usuarioId || !tipoSancion || !descripcion) {
      throw new AppError('Usuario, tipo de sanción y descripción son requeridos', 400);
    }

    if (isDbConnected()) {
      const pool = getPool()!;
      const [res]: any = await pool.query(
        'INSERT INTO sancion (fk_usuario_id, fk_partido_id, tipo_sancion, descripcion, fecha_sancion, fk_creado_por_id) VALUES (?, ?, ?, ?, NOW(), ?)',
        [usuarioId, partidoId || null, tipoSancion, descripcion, creadorId]
      );

      // Notificación al usuario sancionado (RF-23)
      await pool.query(
        'INSERT INTO notificacion (fk_usuario_id, titulo, mensaje, tipo) VALUES (?, "Registro Disciplinario / Sanción", ?, "Sancion")',
        [usuarioId, `Se ha registrado una sanción disciplinaria (${tipoSancion}): ${descripcion}`]
      );

      return {
        id: res.insertId,
        usuarioId,
        partidoId,
        tipoSancion,
        descripcion,
        fecha: new Date().toISOString(),
      };
    } else {
      const newId = store.sanciones.length > 0 ? Math.max(...store.sanciones.map(s => s.id)) + 1 : 1;
      const sancion: SancionModel = {
        id: newId,
        fk_usuario_id: usuarioId,
        fk_partido_id: partidoId || null,
        tipo_sancion: tipoSancion,
        descripcion,
        fecha_sancion: new Date().toISOString(),
        fk_creado_por_id: creadorId,
      };
      store.sanciones.push(sancion);

      store.notificaciones.push({
        id: store.notificaciones.length + 1,
        fk_usuario_id: usuarioId,
        titulo: 'Registro Disciplinario / Sanción',
        mensaje: `Se ha registrado una sanción disciplinaria (${tipoSancion}): ${descripcion}`,
        tipo: 'Sancion',
        leida: false,
        created_at: new Date().toISOString(),
      });

      return sancion;
    }
  }
}

export const sancionesService = new SancionesService();
