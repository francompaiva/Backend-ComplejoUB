import { Router } from 'express';
import { notificacionesController } from './notificaciones.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res, next) => notificacionesController.getMisNotificaciones(req, res, next));
router.put('/:id/leida', (req, res, next) => notificacionesController.marcarLeida(req, res, next));
router.put('/marcar-todas', (req, res, next) => notificacionesController.marcarTodas(req, res, next));

export default router;
