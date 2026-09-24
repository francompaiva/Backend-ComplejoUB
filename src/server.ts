import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { initDatabase } from './config/database.js';
import { errorHandler } from './middlewares/error.middleware.js';
import apiRoutes from './routes.js';

const app = express();

// Middlewares globales
app.use(cors({
  origin: ENV.CORS_ORIGIN === '*' ? true : [ENV.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger básico de solicitudes HTTP
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Rutas de API
app.use('/api/v1', apiRoutes);

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
      statusCode: 404,
    },
  });
});

// Manejador global de errores
app.use(errorHandler);

// Iniciar servidor
async function startServer() {
  await initDatabase();

  const server = app.listen(ENV.PORT, () => {
    console.log(`====================================================`);
    console.log(`  COMPLEJO DEPORTIVO UB - BACKEND API`);
    console.log(`  Servidor activo en: http://localhost:${ENV.PORT}`);
    console.log(`  Health Check: http://localhost:${ENV.PORT}/api/v1/health`);
    console.log(`  Modo: ${ENV.NODE_ENV}`);
    console.log(`====================================================`);
  });

  const shutdown = () => {
    console.log('\n[Server] Cerrando servidor de forma ordenada...');
    server.close(() => {
      console.log('[Server] Servidor cerrado.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();

export default app;
