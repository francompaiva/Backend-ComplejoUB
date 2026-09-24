import { Request, Response, NextFunction } from 'express';
import { listaEsperaService } from './lista_espera.service.js';

export class ListaEsperaController {
  async unirse(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await listaEsperaService.unirse(userId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMisEspera(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const list = await listaEsperaService.getMisEspera(userId);
      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  }

  async cancelar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user!.id;
      const result = await listaEsperaService.cancelar(id, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const listaEsperaController = new ListaEsperaController();
