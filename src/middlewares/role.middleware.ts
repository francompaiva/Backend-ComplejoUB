import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';

export function requireRole(...allowedRoles: Array<'Cliente' | 'Administrador' | 'Arbitro'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401));
    }

    if (!allowedRoles.includes(req.user.rol)) {
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
