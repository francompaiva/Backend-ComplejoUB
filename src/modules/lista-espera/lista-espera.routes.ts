import { Router } from 'express';
import { listaEsperaController } from './lista-espera.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/', (req, res, next) => listaEsperaController.unirse(req, res, next));
router.get('/mis-esperas', (req, res, next) => listaEsperaController.getMisEspera(req, res, next));
router.delete('/:id', (req, res, next) => listaEsperaController.cancelar(req, res, next));

export default router;
