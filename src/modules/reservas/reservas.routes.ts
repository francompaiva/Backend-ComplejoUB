import { Router } from 'express';
import { reservasController } from './reservas.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';

const router = Router();

// Todas las operaciones de reservas requieren autenticación
router.use(authMiddleware);

// Mis reservas (Cliente/Capitán)
router.get('/mis-reservas', (req, res, next) => reservasController.getMisReservas(req, res, next));

// Crear reserva (RF-03)
router.post('/', (req, res, next) => reservasController.create(req, res, next));

// Cancelar reserva con regla >24h (RF-04)
router.post('/:id/cancelar', (req, res, next) => reservasController.cancelar(req, res, next));

// Gestión de reservas por Administrador (RF-05, RF-06)
router.get('/', requireRole('Administrador'), (req, res, next) => reservasController.getAll(req, res, next));
router.put('/:id/inasistencia', requireRole('Administrador'), (req, res, next) =>
  reservasController.registrarInasistencia(req, res, next)
);

export default router;
