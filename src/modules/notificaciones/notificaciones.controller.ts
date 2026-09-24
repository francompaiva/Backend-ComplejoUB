import { Request, Response, NextFunction } from 'express';
import { notificacionesService } from './notificaciones.service.js';

export class NotificacionesController {
  async getMisNotificaciones(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.user!.id;
      const list = await notificacionesService.getByUsuario(usuarioId);
      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  }

  async marcarLeida(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const usuarioId = req.user!.id;
      const result = await notificacionesService.marcarLeida(id, usuarioId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async marcarTodas(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.user!.id;
      const result = await notificacionesService.marcarTodasLeidas(usuarioId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const notificacionesController = new NotificacionesController();
