import { Request, Response, NextFunction } from 'express';
import { sancionesService } from './sanciones.service.js';

export class SancionesController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.query.usuarioId ? parseInt(req.query.usuarioId as string, 10) : undefined;
      const partidoId = req.query.partidoId ? parseInt(req.query.partidoId as string, 10) : undefined;
      const result = await sancionesService.getAll(usuarioId, partidoId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const creadorId = req.user!.id;
      const result = await sancionesService.create(req.body, creadorId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const sancionesController = new SancionesController();
