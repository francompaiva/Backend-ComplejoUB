import mysql, { Pool } from 'mysql2/promise';
import { ENV } from './env.js';

let pool: Pool | null = null;
let isConnected = false;

export async function initDatabase(): Promise<boolean> {
  try {
    pool = mysql.createPool({
      host: ENV.DB.HOST,
      port: ENV.DB.PORT,
      user: ENV.DB.USER,
      password: ENV.DB.PASSWORD,
      database: ENV.DB.NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    isConnected = true;
    console.log(`[Database] Conectado exitosamente a MySQL (${ENV.DB.HOST}:${ENV.DB.PORT}/${ENV.DB.NAME})`);

    // Verificación y migración idempotente de restricciones de reserva (permite re-reservar turnos cancelados)
    try {
      const [idxRows]: any = await pool.query(
        "SELECT COUNT(*) as cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'reserva' AND index_name = 'uq_cancha_fecha_hora'"
      );
      if (idxRows && idxRows[0]?.cnt > 0) {
        try {
          await pool.query("ALTER TABLE reserva ADD INDEX idx_reserva_cancha (fk_cancha_id)");
        } catch {
          // ignore if already present
        }
        await pool.query("ALTER TABLE reserva DROP INDEX uq_cancha_fecha_hora");
        try {
          await pool.query("ALTER TABLE reserva ADD INDEX idx_reserva_cancha_fecha_hora (fk_cancha_id, fecha, hora, estado)");
        } catch {
          // ignore if already present
        }
        console.log('[Database] Restricción uq_cancha_fecha_hora migrada con éxito para permitir re-reserva de turnos cancelados.');
      }
    } catch {
      // Ignorar si no aplica
    }

    return true;
  } catch (error: any) {
    isConnected = false;
    console.warn(`[Database] No se pudo conectar a MySQL (${error.message}). Modo en-memoria activado para desarrollo/evaluación.`);
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}

export function getPool(): Pool | null {
  return pool;
}
