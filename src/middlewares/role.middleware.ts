import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';

export function requireRole(...allowedRoles: Array<'Cliente' | 'Administrador' | 'Arbitro' | 'Superadministrador'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401));
    }

    const userRol = req.user.rol as any;
    const isSuperAdmin = userRol === 'Superadministrador';
    const hasRole = allowedRoles.includes(userRol) || (isSuperAdmin && allowedRoles.includes('Administrador'));

    if (!hasRole) {
      return next(
        new AppError(
          `Permisos insuficientes: el rol '${req.user.rol}' no tiene acceso a esta acción. Requiere: ${allowedRoles.join(', ')}`,
          403
        )
      );
    }

    next();
  };
}
