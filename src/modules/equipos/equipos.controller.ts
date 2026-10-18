import { Request, Response, NextFunction } from 'express';
import { equiposService } from './equipos.service.js';
import { AppError } from '../../middlewares/error.middleware.js';

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
      const capitanId = req.user?.id;
      if (!capitanId) {
        throw new AppError('Usuario no autenticado. Debe iniciar sesión para inscribir un equipo.', 401);
      }
      const equipo = await equiposService.inscribirEquipo(capitanId, req.body);
      return res.status(201).json({ success: true, data: equipo });
    } catch (error) {
      return next(error);
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

  async getMisInvitaciones(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.user!.id;
      const invitaciones = await equiposService.getMisInvitaciones(usuarioId);
      res.status(200).json({ success: true, data: invitaciones });
    } catch (error) {
      next(error);
    }
  }

  async responderInvitacion(req: Request, res: Response, next: NextFunction) {
    try {
      const equipoId = parseInt(req.params.id, 10);
      const usuarioId = req.user!.id;
      const respuesta = (req.body.respuesta || req.body.estado || req.body.action || 'ACEPTADA') as 'ACEPTADA' | 'RECHAZADA';
      const result = await equiposService.responderInvitacion(equipoId, usuarioId, respuesta);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMisEquipos(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.user!.id;
      const equipos = await equiposService.getMisEquipos(usuarioId);
      res.status(200).json({ success: true, data: equipos });
    } catch (error) {
      next(error);
    }
  }
}

export const equiposController = new EquiposController();
