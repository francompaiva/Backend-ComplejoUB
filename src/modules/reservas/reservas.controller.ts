import { Request, Response, NextFunction } from 'express';
import { reservasService } from './reservas.service.js';

export class ReservasController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await reservasService.createReserva(userId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async cancelar(req: Request, res: Response, next: NextFunction) {
    try {
      const reservaId = parseInt(req.params.id, 10);
      const userId = req.user!.id;
      const userRol = req.user!.rol;
      const motivo = req.body.motivo;
      const result = await reservasService.cancelarReserva(reservaId, userId, userRol, motivo);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async registrarInasistencia(req: Request, res: Response, next: NextFunction) {
    try {
      const reservaId = parseInt(req.params.id, 10);
      const adminId = req.user!.id;
      const result = await reservasService.registrarInasistencia(reservaId, adminId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMisReservas(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const reservas = await reservasService.getMisReservas(userId);
      res.status(200).json({ success: true, data: reservas });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const fecha = req.query.fecha as string | undefined;
      const reservas = await reservasService.getAllReservas(fecha);
      res.status(200).json({ success: true, data: reservas });
    } catch (error) {
      next(error);
    }
  }
}

export const reservasController = new ReservasController();
