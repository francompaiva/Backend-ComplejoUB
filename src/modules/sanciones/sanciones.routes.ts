import { Router } from 'express';
import { sancionesController } from './sanciones.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);

// Consultar sanciones
router.get('/', (req, res, next) => sancionesController.getAll(req, res, next));

// Registrar sanciones disciplinarias (Árbitros y Administradores) (RF-20)
router.post('/', requireRole('Arbitro', 'Administrador'), (req, res, next) =>
  sancionesController.create(req, res, next)
);

export default router;
