import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB: {
    URI: process.env.DATABASE_URL || process.env.DB_URI || '',
    HOST: process.env.DB_HOST || 'localhost',
    PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    USER: process.env.DB_USER || 'root',
    PASSWORD: process.env.DB_PASSWORD || '',
    NAME: process.env.DB_NAME || 'complejo_deportivo',
  },
  JWT: {
    SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test_jwt_secret_only_for_unit_tests' : ''),
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  },
  AUTH: {
    OTP_MASTER_CODE: process.env.OTP_MASTER_CODE || (process.env.NODE_ENV === 'production' ? '' : '123456'),
  },
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  SMTP: {
    HOST: process.env.SMTP_HOST || '',
    PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    USER: process.env.SMTP_USER || '',
    PASSWORD: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '',
    FROM_EMAIL: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@complejoub.com',
    FROM_NAME: process.env.SMTP_FROM_NAME || 'Complejo Deportivo UB',
  },
};

/**
 * Valida la presencia de variables de entorno obligatorias para el arranque seguro de la aplicación.
 * Previene el inicio con secretos vacíos y evita exponer datos sensibles en el mensaje de error.
 */
export function validateEnv(): void {
  const isTest = process.env.NODE_ENV === 'test' || 
                 process.argv.some(arg => arg.includes('--test') || arg.includes('test'));

  // En entorno de pruebas automatizadas se permite el secret dummy temporal
  if (isTest) {
    if (!ENV.JWT.SECRET) {
      ENV.JWT.SECRET = 'test_jwt_secret_only_for_unit_tests';
    }
    return;
  }

  const missing: string[] = [];

  if (!ENV.JWT.SECRET || ENV.JWT.SECRET.trim() === '') {
    missing.push('JWT_SECRET');
  }

  if (missing.length > 0) {
    throw new Error(
      `[Config Error] Faltan variables de entorno obligatorias: ${missing.join(', ')}. ` +
      `Por favor genera un archivo .env en la raíz del backend tomando como base el archivo .env.example.`
    );
  }
}

// Ejecutar validación temprana al importar la configuración
validateEnv();

