import { Request, Response, NextFunction } from 'express';
import { partidosService } from './partidos.service.js';

export class PartidosController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const torneoParam = (req.query.torneoId || req.query['torneo-id']) as string | undefined;
      const arbitroParam = (req.query.arbitroId || req.query['arbitro-id']) as string | undefined;
      const numeroFechaParam = (req.query.numeroFecha || req.query['numero-fecha']) as string | undefined;

      const torneoId = torneoParam ? parseInt(torneoParam, 10) : undefined;
      const arbitroId = arbitroParam ? parseInt(arbitroParam, 10) : undefined;
      const fecha = req.query.fecha as string | undefined;
      const numeroFecha = numeroFechaParam ? parseInt(numeroFechaParam, 10) : undefined;
      const partidos = await partidosService.getAll(torneoId, arbitroId, fecha, numeroFecha);
      res.status(200).json({ success: true, data: partidos });
    } catch (error) {
      next(error);
    }
  }

  async getMisPartidosArbitro(req: Request, res: Response, next: NextFunction) {
    try {
      const arbitroId = req.user!.id;
      const partidos = await partidosService.getAll(undefined, arbitroId);
      res.status(200).json({ success: true, data: partidos });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const partido = await partidosService.getById(id);
      res.status(200).json({ success: true, data: partido });
    } catch (error) {
      next(error);
    }
  }

  async registrarResultado(req: Request, res: Response, next: NextFunction) {
    try {
      const partidoId = parseInt(req.params.id, 10);
      const usuarioId = req.user!.id;
      const usuarioRol = req.user!.rol;
      const result = await partidosService.registrarResultado(partidoId, usuarioId, usuarioRol, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async asignarArbitro(req: Request, res: Response, next: NextFunction) {
    try {
      const partidoId = parseInt(req.params.id, 10);
      const adminId = req.user!.id;
      const { arbitroId } = req.body;
      const result = await partidosService.asignarArbitro(partidoId, arbitroId, adminId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async cambiarEstado(req: Request, res: Response, next: NextFunction) {
    try {
      const partidoId = parseInt(req.params.id, 10);
      const adminId = req.user!.id;
      const { estado } = req.body;
      const result = await partidosService.cambiarEstado(partidoId, estado, adminId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async reprogramar(req: Request, res: Response, next: NextFunction) {
    try {
      const partidoId = parseInt(req.params.id, 10);
      const adminId = req.user!.id;
      const result = await partidosService.reprogramarPartido(partidoId, adminId, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const partidosController = new PartidosController();
