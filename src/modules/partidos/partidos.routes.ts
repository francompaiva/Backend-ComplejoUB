import { Router } from 'express';
import { partidosController } from './partidos.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';

const router = Router();

// Consultas públicas
router.get('/', (req, res, next) => partidosController.getAll(req, res, next));
router.get('/:id', (req, res, next) => partidosController.getById(req, res, next));

// Rutas autenticadas
router.use(authMiddleware);

// Partidos asignados al árbitro actual (RF-17)
router.get('/arbitro/mis-partidos', requireRole('Arbitro', 'Administrador'), (req, res, next) =>
  partidosController.getMisPartidosArbitro(req, res, next)
);

// Carga de resultados (Árbitro asignado o Administrador) (RF-10)
router.put('/:id/resultado', requireRole('Arbitro', 'Administrador'), (req, res, next) =>
  partidosController.registrarResultado(req, res, next)
);

// Asignación de árbitro (Administrador) (RF-17)
router.put('/:id/asignar-arbitro', requireRole('Administrador'), (req, res, next) =>
  partidosController.asignarArbitro(req, res, next)
);

// Cambio de estado (Administrador) (RF-19)
router.put('/:id/estado', requireRole('Administrador'), (req, res, next) =>
  partidosController.cambiarEstado(req, res, next)
);

export default router;
