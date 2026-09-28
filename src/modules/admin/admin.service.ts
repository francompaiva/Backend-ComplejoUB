import bcrypt from 'bcryptjs';
import { isDbConnected, getPool } from '../../config/database.js';
import { store, UsuarioModel } from '../../config/in-memory-store.js';
import { AppError } from '../../middlewares/error.middleware.js';

export class AdminService {
  async getAdministradores() {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows] = await pool.query(
        `SELECT id, nombre, email, rol, telefono, estado_cuenta, email_verificado, created_at 
         FROM usuario 
         WHERE rol IN ('Administrador', 'Superadministrador', 'Arbitro') 
         ORDER BY (rol = 'Superadministrador') DESC, (rol = 'Administrador') DESC, nombre ASC`
      );
      return rows;
    } else {
      return store.usuarios
        .filter(u => u.rol === 'Administrador' || u.rol === 'Superadministrador' || u.rol === 'Arbitro')
        .map(({ contrasena_hash, ...u }) => u);
    }
  }

  async promoverUsuario(email: string, promotedById: number, targetRole: 'Administrador' | 'Arbitro' = 'Administrador') {
    if (!email) throw new AppError('El email es obligatorio', 400);

    if (isDbConnected()) {
      const pool = getPool()!;
      const [users]: any = await pool.query('SELECT * FROM usuario WHERE email = ?', [email]);
      if (!users || users.length === 0) {
        throw new AppError('No existe ningún usuario registrado con ese correo', 404);
      }
      const user = users[0];
      if (user.rol === 'Superadministrador') {
        throw new AppError('El Superadministrador no puede ser modificado', 400);
      }

      await pool.query('UPDATE usuario SET rol = ? WHERE id = ?', [targetRole, user.id]);
      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "PROMOVER_USUARIO", "usuario", ?, ?)',
        [promotedById, user.id, JSON.stringify({ email: user.email, nuevoRol: targetRole })]
      );

      return {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: targetRole,
      };
    } else {
      const user = store.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) throw new AppError('No existe ningún usuario registrado con ese correo', 404);
      if (user.rol === 'Superadministrador') throw new AppError('El Superadministrador no puede ser modificado', 400);

      user.rol = targetRole;
      store.auditLogs.push({
        id: store.auditLogs.length + 1,
        fk_usuario_id: promotedById,
        accion: 'PROMOVER_USUARIO',
        entidad_afectada: 'usuario',
        entidad_id: user.id,
        detalles: JSON.stringify({ email: user.email, nuevoRol: targetRole }),
        ip_address: null,
        created_at: new Date().toISOString(),
      });

      const { contrasena_hash, ...safeUser } = user;
      return safeUser;
    }
  }

  async crearAdministrador(data: { nombre: string; email: string; contrasena: string; telefono?: string; rol?: 'Administrador' | 'Arbitro' }, createdById: number) {
    const { nombre, email, contrasena, telefono } = data;
    const rol = data.rol || 'Administrador';
    if (!nombre || !email || !contrasena) {
      throw new AppError('Nombre, email y contraseña son obligatorios', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Formato de email inválido', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(contrasena, salt);

    if (isDbConnected()) {
      const pool = getPool()!;
      const [existing]: any = await pool.query('SELECT id FROM usuario WHERE email = ?', [email]);
      if (existing && existing.length > 0) {
        throw new AppError('Ese correo ya está registrado en el sistema', 409);
      }

      const [result]: any = await pool.query(
        'INSERT INTO usuario (nombre, email, contrasena_hash, rol, telefono, email_verificado) VALUES (?, ?, ?, ?, ?, true)',
        [nombre, email, hash, rol, telefono || null]
      );

      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "CREAR_USUARIO", "usuario", ?, ?)',
        [createdById, result.insertId, JSON.stringify({ nombre, email, rol })]
      );

      return {
        id: result.insertId,
        nombre,
        email,
        rol,
      };
    } else {
      const existing = store.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) throw new AppError('Ese correo ya está registrado en el sistema', 409);

      const newId = store.usuarios.length > 0 ? Math.max(...store.usuarios.map(u => u.id)) + 1 : 1;
      const newAdmin: UsuarioModel = {
        id: newId,
        nombre,
        email,
        contrasena_hash: hash,
        rol,
        inasistencias: 0,
        estado_cuenta: 'Activa',
        suspension_hasta: null,
        telefono,
        email_verificado: true,
        created_at: new Date().toISOString(),
      };
      store.usuarios.push(newAdmin);

      store.auditLogs.push({
        id: store.auditLogs.length + 1,
        fk_usuario_id: createdById,
        accion: 'CREAR_USUARIO',
        entidad_afectada: 'usuario',
        entidad_id: newId,
        detalles: JSON.stringify({ nombre, email, rol }),
        ip_address: null,
        created_at: new Date().toISOString(),
      });

      const { contrasena_hash, ...safeAdmin } = newAdmin;
      return safeAdmin;
    }
  }

  async revocarAdministrador(targetId: number, revokedById: number) {
    if (targetId === revokedById) {
      throw new AppError('No puedes revocar tus propios privilegios', 400);
    }

    if (isDbConnected()) {
      const pool = getPool()!;
      const [users]: any = await pool.query('SELECT * FROM usuario WHERE id = ?', [targetId]);
      if (!users || users.length === 0) throw new AppError('Administrador no encontrado', 404);
      const user = users[0];
      if (user.rol === 'Superadministrador') {
        throw new AppError('No se puede degradar al Superadministrador titular', 403);
      }

      await pool.query('UPDATE usuario SET rol = "Cliente" WHERE id = ?', [targetId]);
      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "REVOCAR_ADMIN", "usuario", ?, ?)',
        [revokedById, targetId, JSON.stringify({ email: user.email, rolAnterior: 'Administrador', nuevoRol: 'Cliente' })]
      );

      return { success: true, message: `Permisos revocados. ${user.nombre} ahora es Cliente.` };
    } else {
      const user = store.usuarios.find(u => u.id === targetId);
      if (!user) throw new AppError('Administrador no encontrado', 404);
      if (user.rol === 'Superadministrador') throw new AppError('No se puede degradar al Superadministrador titular', 403);

      user.rol = 'Cliente';
      store.auditLogs.push({
        id: store.auditLogs.length + 1,
        fk_usuario_id: revokedById,
        accion: 'REVOCAR_ADMIN',
        entidad_afectada: 'usuario',
        entidad_id: targetId,
        detalles: JSON.stringify({ email: user.email, rolAnterior: 'Administrador', nuevoRol: 'Cliente' }),
        ip_address: null,
        created_at: new Date().toISOString(),
      });

      return { success: true, message: `Permisos revocados. ${user.nombre} ahora es Cliente.` };
    }
  }
}

export const adminService = new AdminService();
