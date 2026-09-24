import { Request, Response, NextFunction } from 'express';
import { reportesService } from './reportes.service.js';

export class ReportesController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await reportesService.getDashboardMetrics();
      res.status(200).json({ success: true, data: metrics });
    } catch (error) {
      next(error);
    }
  }

  async getAuditoria(req: Request, res: Response, next: NextFunction) {
    try {
      const limite = req.query.limite ? parseInt(req.query.limite as string, 10) : 50;
      const logs = await reportesService.getAuditLogs(limite);
      res.status(200).json({ success: true, data: logs });
    } catch (error) {
      next(error);
    }
  }
}

export const reportesController = new ReportesController();
