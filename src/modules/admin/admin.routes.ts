import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';

const router = Router();

// Exclusivo para Superadministrador titular
router.use(authMiddleware);
router.use(requireRole('Superadministrador'));

router.get('/administradores', (req, res, next) => adminController.getAdministradores(req, res, next));
router.post('/promover', (req, res, next) => adminController.promoverUsuario(req, res, next));
router.post('/crear-admin', (req, res, next) => adminController.crearAdministrador(req, res, next));
router.delete('/revocar/:id', (req, res, next) => adminController.revocarAdministrador(req, res, next));

export default router;
