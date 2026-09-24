import { Router } from 'express';
import { reportesController } from './reportes.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('Administrador'));

router.get('/dashboard', (req, res, next) => reportesController.getDashboard(req, res, next));
router.get('/auditoria', (req, res, next) => reportesController.getAuditoria(req, res, next));

export default router;
