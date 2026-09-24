import { Router } from 'express';
import { canchasController } from './canchas.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';

const router = Router();

router.get('/', (req, res, next) => canchasController.getAll(req, res, next));
router.get('/:id', (req, res, next) => canchasController.getById(req, res, next));
router.get('/:id/disponibilidad', (req, res, next) => canchasController.getDisponibilidad(req, res, next));

// Acciones exclusivas del Administrador (RF-02)
router.post('/', authMiddleware, requireRole('Administrador'), (req, res, next) =>
  canchasController.create(req, res, next)
);
router.put('/:id', authMiddleware, requireRole('Administrador'), (req, res, next) =>
  canchasController.update(req, res, next)
);
router.delete('/:id', authMiddleware, requireRole('Administrador'), (req, res, next) =>
  canchasController.delete(req, res, next)
);

export default router;
