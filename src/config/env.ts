import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB: {
    URI: process.env.DATABASE_URL || process.env.DB_URI || '',
    HOST: process.env.DB_HOST || '',
    PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    USER: process.env.DB_USER || '',
    PASSWORD: process.env.DB_PASSWORD || '',
    NAME: process.env.DB_NAME || '',
  },
  JWT: {
    SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test_jwt_secret_only_for_unit_tests' : ''),
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  },
  SEED: {
    INITIAL_PASSWORD: process.env.INITIAL_SEED_PASSWORD || process.env.ADMIN_INITIAL_PASSWORD || '',
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
    FROM_EMAIL: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
    FROM_NAME: process.env.SMTP_FROM_NAME || 'Complejo Deportivo UB',
  },
};

/**
 * Valida la presencia de variables de entorno obligatorias para el arranque seguro de la aplicación.
 * Detiene el servidor si alguna variable crítica no se encuentra definida en .env o en el entorno.
 */
export function validateEnv(): void {
  const isTest = process.env.NODE_ENV === 'test' || 
                 process.argv.some(arg => arg.includes('--test') || arg.includes('test'));

  // En entorno de pruebas automatizadas aisladas se permite el secret temporal
  if (isTest) {
    if (!ENV.JWT.SECRET) {
      ENV.JWT.SECRET = 'test_jwt_secret_only_for_unit_tests';
    }
    return;
  }

  const requiredVars: { key: string; val: string | undefined }[] = [
    { key: 'DB_HOST', val: process.env.DB_HOST },
    { key: 'DB_USER', val: process.env.DB_USER },
    { key: 'DB_PASSWORD', val: process.env.DB_PASSWORD },
    { key: 'DB_NAME', val: process.env.DB_NAME },
    { key: 'JWT_SECRET', val: process.env.JWT_SECRET },
  ];

  const missing = requiredVars
    .filter(item => !item.val || item.val.trim() === '')
    .map(item => item.key);

  if (missing.length > 0) {
    throw new Error(
      `[DevSecOps Security Error] Faltan variables de entorno obligatorias requeridas para el arranque: ${missing.join(', ')}. ` +
      `Por favor configure estas variables en su archivo .env o en el panel de despliegue antes de iniciar el servidor.`
    );
  }
}

// Ejecutar validación temprana al importar la configuración
validateEnv();


