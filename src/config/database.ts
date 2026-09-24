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
