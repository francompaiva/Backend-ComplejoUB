import { Router } from 'express';
import { equiposController } from './equipos.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

// Mis invitaciones a equipos (RF-15 - requiere autenticación)
router.get('/mis-invitaciones', authMiddleware, (req, res, next) => equiposController.getMisInvitaciones(req, res, next));
router.get('/invitaciones', authMiddleware, (req, res, next) => equiposController.getMisInvitaciones(req, res, next));

// Historial de equipos y torneos del usuario autenticado (RF-15 / Perfil)
router.get('/mis-equipos', authMiddleware, (req, res, next) => equiposController.getMisEquipos(req, res, next));
router.get('/historial', authMiddleware, (req, res, next) => equiposController.getMisEquipos(req, res, next));

// Consultas de equipos (públicas o autenticadas)
router.get('/buscar-jugador/:dni', (req, res, next) => equiposController.buscarJugadorPorDni(req, res, next));
router.get('/', (req, res, next) => equiposController.getAll(req, res, next));
router.get('/:id', (req, res, next) => equiposController.getById(req, res, next));

// Rutas autenticadas
router.use(authMiddleware);

// Inscripción de equipos por el capitán (RF-08)
router.post('/', (req, res, next) => equiposController.inscribir(req, res, next));
router.post('/inscribir', (req, res, next) => equiposController.inscribir(req, res, next));

// Enviar invitación a un jugador (RF-14)
router.post('/:id/invitar', (req, res, next) => equiposController.invitar(req, res, next));

// Responder invitación por el jugador (RF-15) - Soporta PUT/POST/PATCH y rutas canónicas
router.put('/:id/responder-invitacion', (req, res, next) =>
  equiposController.responderInvitacion(req, res, next)
);
router.post('/:id/responder-invitacion', (req, res, next) =>
  equiposController.responderInvitacion(req, res, next)
);
router.post('/invitaciones/:id/responder', (req, res, next) =>
  equiposController.responderInvitacion(req, res, next)
);
router.patch('/invitaciones/:id/responder', (req, res, next) =>
  equiposController.responderInvitacion(req, res, next)
);
router.put('/invitaciones/:id/responder', (req, res, next) =>
  equiposController.responderInvitacion(req, res, next)
);

export default router;
