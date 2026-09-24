import { Router } from 'express';
import { equiposController } from './equipos.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

// Consultas de equipos (públicas o autenticadas)
router.get('/', (req, res, next) => equiposController.getAll(req, res, next));
router.get('/:id', (req, res, next) => equiposController.getById(req, res, next));

// Rutas autenticadas
router.use(authMiddleware);

// Inscripción de equipos por el capitán (RF-08)
router.post('/', (req, res, next) => equiposController.inscribir(req, res, next));

// Enviar invitación a un jugador (RF-14)
router.post('/:id/invitar', (req, res, next) => equiposController.invitar(req, res, next));

// Responder invitación por el jugador (RF-15)
router.put('/:id/responder-invitacion', (req, res, next) =>
  equiposController.responderInvitacion(req, res, next)
);

export default router;
