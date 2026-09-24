import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AppError } from './error.middleware.js';
import { isDbConnected, getPool } from '../config/database.js';
import { store } from '../config/inMemoryStore.js';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: 'Cliente' | 'Administrador' | 'Arbitro';
  estado_cuenta: string;
  suspension_hasta: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Acceso denegado: Token de autenticación no proporcionado', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT.SECRET) as { id: number; email: string; rol: string };

    let user: AuthUser | null = null;

    if (isDbConnected()) {
      const pool = getPool();
      const [rows]: any = await pool!.query(
        'SELECT id, nombre, email, rol, estado_cuenta, suspension_hasta FROM usuario WHERE id = ?',
        [decoded.id]
      );
      if (rows && rows.length > 0) {
        user = rows[0];
      }
    } else {
      const found = store.usuarios.find(u => u.id === decoded.id);
      if (found) {
        user = {
          id: found.id,
          nombre: found.nombre,
          email: found.email,
          rol: found.rol,
          estado_cuenta: found.estado_cuenta,
          suspension_hasta: found.suspension_hasta,
        };
      }
    }

    if (!user) {
      throw new AppError('Usuario no encontrado', 401);
    }

    // Comprobar si la cuenta está suspendida por inasistencias
    if (user.estado_cuenta === 'Suspendida' && user.suspension_hasta) {
      const hasta = new Date(user.suspension_hasta);
      if (hasta > new Date()) {
        // En ciertas rutas de consulta permitimos el acceso, pero registramos el estado en req.user
      }
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new AppError('Sesión inválida o expirada', 401));
    } else {
      next(error);
    }
  }
}
