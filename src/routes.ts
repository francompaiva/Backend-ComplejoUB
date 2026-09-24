import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import canchasRoutes from './modules/canchas/canchas.routes.js';
import reservasRoutes from './modules/reservas/reservas.routes.js';
import torneosRoutes from './modules/torneos/torneos.routes.js';
import equiposRoutes from './modules/equipos/equipos.routes.js';
import partidosRoutes from './modules/partidos/partidos.routes.js';
import listaEsperaRoutes from './modules/lista_espera/lista_espera.routes.js';
import sancionesRoutes from './modules/sanciones/sanciones.routes.js';
import notificacionesRoutes from './modules/notificaciones/notificaciones.routes.js';
import reportesRoutes from './modules/reportes/reportes.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Complejo Deportivo UB - Backend REST API',
    version: '1.0.0',
  });
});

// Montar sub-rutas modulares
router.use('/auth', authRoutes);
router.use('/canchas', canchasRoutes);
router.use('/reservas', reservasRoutes);
router.use('/torneos', torneosRoutes);
router.use('/equipos', equiposRoutes);
router.use('/partidos', partidosRoutes);
router.use('/lista-espera', listaEsperaRoutes);
router.use('/sanciones', sancionesRoutes);
router.use('/notificaciones', notificacionesRoutes);
router.use('/reportes', reportesRoutes);

export default router;
