import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service.js';

export class AdminController {
  async getAdministradores(req: Request, res: Response, next: NextFunction) {
    try {
      const admins = await adminService.getAdministradores();
      res.status(200).json({ success: true, data: admins });
    } catch (error) {
      next(error);
    }
  }

  async promoverUsuario(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, rol } = req.body;
      const promotedById = req.user!.id;
      const targetRole = rol === 'Arbitro' ? 'Arbitro' : 'Administrador';
      const result = await adminService.promoverUsuario(email, promotedById, targetRole);
      res.status(200).json({ success: true, message: `Usuario promovido a ${targetRole} con éxito`, data: result });
    } catch (error) {
      next(error);
    }
  }

  async crearAdministrador(req: Request, res: Response, next: NextFunction) {
    try {
      const createdById = req.user!.id;
      const targetRole = req.body.rol === 'Arbitro' ? 'Arbitro' : 'Administrador';
      const result = await adminService.crearAdministrador({ ...req.body, rol: targetRole }, createdById);
      res.status(201).json({ success: true, message: `${targetRole} creado con éxito`, data: result });
    } catch (error) {
      next(error);
    }
  }

  async revocarAdministrador(req: Request, res: Response, next: NextFunction) {
    try {
      const targetId = parseInt(req.params.id, 10);
      const revokedById = req.user!.id;
      const result = await adminService.revocarAdministrador(targetId, revokedById);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
