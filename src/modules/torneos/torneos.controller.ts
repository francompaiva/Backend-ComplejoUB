import { Request, Response, NextFunction } from 'express';
import { torneosService } from './torneos.service.js';

export class TorneosController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const estado = req.query.estado as string | undefined;
      const torneos = await torneosService.getAll(estado);
      res.status(200).json({ success: true, data: torneos });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const torneo = await torneosService.getById(id);
      res.status(200).json({ success: true, data: torneo });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const result = await torneosService.create(req.body, adminId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async generarFixture(req: Request, res: Response, next: NextFunction) {
    try {
      const torneoId = parseInt(req.params.id, 10);
      const adminId = req.user!.id;
      const fechaInicio = req.body.fechaInicio as string | undefined;
      const result = await torneosService.generarFixture(torneoId, adminId, fechaInicio);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTablaPosiciones(req: Request, res: Response, next: NextFunction) {
    try {
      const torneoId = parseInt(req.params.id, 10);
      const tabla = await torneosService.getTablaPosiciones(torneoId);
      res.status(200).json({ success: true, data: tabla });
    } catch (error) {
      next(error);
    }
  }

  async getFixture(req: Request, res: Response, next: NextFunction) {
    try {
      const torneoId = parseInt(req.params.id, 10);
      const fixture = await torneosService.getFixture(torneoId);
      res.status(200).json({ success: true, data: fixture });
    } catch (error) {
      next(error);
    }
  }
}

export const torneosController = new TorneosController();
