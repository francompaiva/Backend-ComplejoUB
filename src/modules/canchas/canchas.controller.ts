import { Request, Response, NextFunction } from 'express';
import { canchasService } from './canchas.service.js';

export class CanchasController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const deporte = req.query.deporte as string | undefined;
      const canchas = await canchasService.getAll(deporte);
      res.status(200).json({ success: true, data: canchas });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const cancha = await canchasService.getById(id);
      res.status(200).json({ success: true, data: cancha });
    } catch (error) {
      next(error);
    }
  }

  async getDisponibilidad(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const fecha = (req.query.fecha as string) ||
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Argentina/Buenos_Aires',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(new Date());
      const disponibilidad = await canchasService.getDisponibilidad(id, fecha);
      res.status(200).json({ success: true, data: disponibilidad });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const created = await canchasService.create(req.body, adminId);
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const adminId = req.user!.id;
      const updated = await canchasService.update(id, req.body, adminId);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const adminId = req.user!.id;
      const result = await canchasService.delete(id, adminId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const canchasController = new CanchasController();
