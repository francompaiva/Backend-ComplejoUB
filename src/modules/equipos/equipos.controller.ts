import { Request, Response, NextFunction } from 'express';
import { equiposService } from './equipos.service.js';

export class EquiposController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const torneoParam = (req.query.torneoId || req.query['torneo-id']) as string | undefined;
      const torneoId = torneoParam ? parseInt(torneoParam, 10) : undefined;
      const equipos = await equiposService.getAll(torneoId);
      res.status(200).json({ success: true, data: equipos });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const equipo = await equiposService.getById(id);
      res.status(200).json({ success: true, data: equipo });
    } catch (error) {
      next(error);
    }
  }

  async inscribir(req: Request, res: Response, next: NextFunction) {
    try {
      const capitanId = req.user!.id;
      const equipo = await equiposService.inscribirEquipo(capitanId, req.body);
      res.status(201).json({ success: true, data: equipo });
    } catch (error) {
      next(error);
    }
  }

  async invitar(req: Request, res: Response, next: NextFunction) {
    try {
      const equipoId = parseInt(req.params.id, 10);
      const capitanId = req.user!.id;
      const result = await equiposService.invitarJugador(equipoId, capitanId, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async responderInvitacion(req: Request, res: Response, next: NextFunction) {
    try {
      const equipoId = parseInt(req.params.id, 10);
      const usuarioId = req.user!.id;
      const { respuesta } = req.body;
      const result = await equiposService.responderInvitacion(equipoId, usuarioId, respuesta);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const equiposController = new EquiposController();
