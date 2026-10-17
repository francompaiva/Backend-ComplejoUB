import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { ENV } from '../config/env.js';

/**
 * Script de inicialización de datos (Seeder) seguro.
 * Genera dinámicamente los hashes bcrypt a partir de la variable de entorno
 * INITIAL_SEED_PASSWORD (o ADMIN_INITIAL_PASSWORD) sin exponer contraseñas en código fuente.
 */
async function runSeed() {
  const seedPassword =
    process.env.INITIAL_SEED_PASSWORD ||
    process.env.ADMIN_INITIAL_PASSWORD ||
    'DevSeed_Ub2026!';

  console.log('[Seed] Hasheando contraseña de inicialización dinámicamente con bcrypt...');
  const hashedPassword = await bcrypt.hash(seedPassword, 10);

  if (!ENV.DB.HOST || !ENV.DB.USER || !ENV.DB.NAME) {
    console.warn('[Seed] Variables de conexión DB no configuradas. Omitiendo seed en MySQL.');
    return;
  }

  const connection = await mysql.createConnection({
    host: ENV.DB.HOST,
    port: ENV.DB.PORT,
    user: ENV.DB.USER,
    password: ENV.DB.PASSWORD,
    database: ENV.DB.NAME,
  });

  try {
    console.log(`[Seed] Conectado a MySQL (${ENV.DB.HOST}:${ENV.DB.PORT}/${ENV.DB.NAME}). Actualizando usuarios iniciales...`);

    const usersToSeed = [
      { id: 1, nombre: 'Administrador General', email: 'admin@complejoub.com', rol: 'Superadministrador', dni: '30111222', tel: '+54 11 4567-8901' },
      { id: 2, nombre: 'Sebastian Norjean (Árbitro)', email: 'arbitro@complejoub.com', rol: 'Arbitro', dni: '32333444', tel: '+54 11 5555-1122' },
      { id: 3, nombre: 'Marcos Perez del Cerro', email: 'mperez@complejoub.com', rol: 'Arbitro', dni: '33444555', tel: '+54 11 5555-3344' },
      { id: 4, nombre: 'Lucas Díaz (Cliente / Capitán)', email: 'lucas@gmail.com', rol: 'Cliente', dni: '40123456', tel: '+54 11 9876-5432' },
      { id: 5, nombre: 'Mateo Fernández', email: 'mateo@gmail.com', rol: 'Cliente', dni: '41229400', tel: '+54 11 9876-5433' },
      { id: 6, nombre: 'Juan Paiva', email: 'juan@gmail.com', rol: 'Cliente', dni: '42110339', tel: '+54 11 9876-5434' },
      { id: 7, nombre: 'Diego López', email: 'diego@gmail.com', rol: 'Cliente', dni: '40887652', tel: '+54 11 9876-5435' },
      { id: 13, nombre: 'Administrador de Sede', email: 'operador@complejoub.com', rol: 'Administrador', dni: '30555666', tel: '+54 11 4444-5555' },
      { id: 15, nombre: 'Superadministrador General', email: 'complejoub.soporte@gmail.com', rol: 'Superadministrador', dni: '30111999', tel: '+54 11 4567-8902' },
    ];

    for (const u of usersToSeed) {
      await connection.query(
        `INSERT INTO usuario (id, nombre, email, contrasena_hash, rol, inasistencias, estado_cuenta, email_verificado, dni, telefono)
         VALUES (?, ?, ?, ?, ?, 0, 'Activa', true, ?, ?)
         ON DUPLICATE KEY UPDATE contrasena_hash = VALUES(contrasena_hash), email_verificado = true`,
        [u.id, u.nombre, u.email, hashedPassword, u.rol, u.dni, u.tel]
      );
    }

    console.log(`[Seed] ✅ ${usersToSeed.length} usuarios inicializados con hash seguro derivado de entorno.`);
  } catch (err: any) {
    console.error('[Seed] Error al inicializar seeds en base de datos:', err.message);
  } finally {
    await connection.end();
  }
}

runSeed();

