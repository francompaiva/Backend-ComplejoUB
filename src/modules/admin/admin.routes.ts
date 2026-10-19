import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';

const router = Router();

// Exclusivo para roles con privilegios de Administrador
router.use(authMiddleware);
router.use(requireRole('Superadministrador', 'Administrador'));

router.get('/administradores', (req, res, next) => adminController.getAdministradores(req, res, next));
router.post('/promover', requireRole('Superadministrador'), (req, res, next) => adminController.promoverUsuario(req, res, next));
router.post('/crear-admin', requireRole('Superadministrador'), (req, res, next) => adminController.crearAdministrador(req, res, next));
router.delete('/revocar/:id', requireRole('Superadministrador'), (req, res, next) => adminController.revocarAdministrador(req, res, next));

export default router;
