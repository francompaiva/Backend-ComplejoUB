import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    USER: process.env.DB_USER || 'root',
    PASSWORD: process.env.DB_PASSWORD || 'rootpassword',
    NAME: process.env.DB_NAME || 'complejo_deportivo_ub',
  },
  JWT: {
    SECRET: process.env.JWT_SECRET || 'complejo_ub_jwt_secret_2026_seba',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  },
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};
