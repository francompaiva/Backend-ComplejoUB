import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

// Rutas públicas
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/verificar-codigo', (req, res, next) => authController.verificarCodigo(req, res, next));
router.post('/reenviar-codigo', (req, res, next) => authController.reenviarCodigo(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));

// Rutas protegidas
router.get('/me', authMiddleware, (req, res, next) => authController.getMe(req, res, next));

export default router;
