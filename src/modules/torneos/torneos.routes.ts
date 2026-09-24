import { Router } from 'express';
import { torneosController } from './torneos.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';

const router = Router();

// Consultas públicas / usuarios
router.get('/', (req, res, next) => torneosController.getAll(req, res, next));
router.get('/:id', (req, res, next) => torneosController.getById(req, res, next));
router.get('/:id/posiciones', (req, res, next) => torneosController.getTablaPosiciones(req, res, next));
router.get('/:id/fixture', (req, res, next) => torneosController.getFixture(req, res, next));

// Acciones exclusivas de Administrador (RF-07, RF-09)
router.post('/', authMiddleware, requireRole('Administrador'), (req, res, next) =>
  torneosController.create(req, res, next)
);
router.post('/:id/generar-fixture', authMiddleware, requireRole('Administrador'), (req, res, next) =>
  torneosController.generarFixture(req, res, next)
);
router.delete('/:id', authMiddleware, requireRole('Administrador'), (req, res, next) =>
  torneosController.delete(req, res, next)
);

export default router;
