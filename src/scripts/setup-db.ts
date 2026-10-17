import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Cargar variables de .env si existe
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

interface DbConnectionConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  uri?: string;
}

/**
 * Parsea los argumentos de línea de comandos o variables de entorno para obtener
 * la configuración de conexión hacia Railway o MySQL local/remoto.
 */
function resolveConnectionConfig(): DbConnectionConfig {
  const args = process.argv.slice(2);
  const config: DbConnectionConfig = {};

  // 1. Revisar si se pasó --url="mysql://..."
  const urlArg = args.find((a) => a.startsWith('--url=') || a.startsWith('--uri='));
  if (urlArg) {
    config.uri = urlArg.split('=')[1].replace(/^["']|["']$/g, '');
  }

  // 2. Revisar flags individuales (--host=, --port=, --user=, etc.)
  args.forEach((arg) => {
    if (arg.startsWith('--host=')) config.host = arg.split('=')[1].replace(/^["']|["']$/g, '');
    if (arg.startsWith('--port=')) config.port = parseInt(arg.split('=')[1].replace(/^["']|["']$/g, ''), 10);
    if (arg.startsWith('--user=')) config.user = arg.split('=')[1].replace(/^["']|["']$/g, '');
    if (arg.startsWith('--password=')) config.password = arg.split('=')[1].replace(/^["']|["']$/g, '');
    if (arg.startsWith('--database=') || arg.startsWith('--db=')) config.database = arg.split('=')[1].replace(/^["']|["']$/g, '');
  });

  // 3. Fallbacks de variables de entorno habituales en Railway y Render
  if (!config.uri) {
    const envUri =
      process.env.MYSQL_URL ||
      process.env.DATABASE_URL ||
      process.env.DATABASE_PUBLIC_URL ||
      process.env.RAILWAY_MYSQL_URL ||
      process.env.MYSQL_PUBLIC_URL;
    if (envUri) config.uri = envUri;
  }

  if (!config.uri) {
    config.host = config.host || process.env.MYSQLHOST || process.env.DB_HOST || 'localhost';
    config.port = config.port || parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10);
    config.user = config.user || process.env.MYSQLUSER || process.env.DB_USER || 'root';
    config.password = config.password || process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '';
    config.database = config.database || process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway';
  }

  return config;
}

async function main() {
  const args = process.argv.slice(2);
  const isSchemaOnly = args.includes('--schema-only');
  const isSeedOnly = args.includes('--seed-only');

  console.log('\n======================================================');
  console.log('🚀 COMPLEJO DEPORTIVO UB - SCRIPT DE MIGRACIÓN Y SEED');
  console.log('======================================================\n');

  const config = resolveConnectionConfig();

  let connection: mysql.Connection;

  try {
    if (config.uri) {
      // Ocultar password en logs
      const sanitizedUri = config.uri.replace(/:([^:@]+)@/, ':****@');
      console.log(`🔌 Conectando a MySQL mediante URL: ${sanitizedUri}`);
      connection = await mysql.createConnection({
        uri: config.uri,
        multipleStatements: true,
        connectTimeout: 20000,
        ssl: { rejectUnauthorized: false },
      });
    } else {
      console.log(`🔌 Conectando a MySQL en ${config.user}@${config.host}:${config.port}/${config.database}...`);
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        multipleStatements: true,
        connectTimeout: 20000,
        ssl: { rejectUnauthorized: false },
      });
    }
    console.log('✅ Conexión establecida exitosamente con el servidor MySQL.\n');
  } catch (err: any) {
    console.error('❌ Error fatal al conectar con la base de datos MySQL:');
    console.error(`   ${err.message}`);
    console.error('\n💡 Verifica que:');
    console.error('   1. Hayas habilitado la red pública ("Public Networking") en el plugin de MySQL en Railway.');
    console.error('   2. El puerto, host, usuario y contraseña coincidan con los datos públicos.');
    console.error('   3. Estés pasando los datos mediante flags (ej: --url="..." o --host=... --port=... --user=... --password=... --database=...)\n');
    process.exit(1);
  }

  try {
    const seedPassword =
      process.env.INITIAL_SEED_PASSWORD ||
      process.env.ADMIN_INITIAL_PASSWORD ||
      'password123';

    // 1. Ejecutar DDL (schema.sql)
    if (!isSeedOnly) {
      const schemaPath = path.join(projectRoot, 'database/schema.sql');
      console.log(`📄 Leyendo esquema DDL desde: ${path.relative(projectRoot, schemaPath)}`);
      if (!fs.existsSync(schemaPath)) {
        throw new Error(`No se encontró el archivo ${schemaPath}`);
      }
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');

      console.log('⏳ Creando tablas e índices en MySQL...');
      await connection.query(schemaSql);
      console.log('✅ Esquema DDL aplicado con éxito. Todas las tablas fueron creadas/actualizadas.\n');
    }

    // 2. Ejecutar DML / SEEDS (seeds.sql)
    if (!isSchemaOnly) {
      const seedsPath = path.join(projectRoot, 'database/seeds.sql');
      console.log(`🌱 Leyendo seeds de datos desde: ${path.relative(projectRoot, seedsPath)}`);
      if (!fs.existsSync(seedsPath)) {
        throw new Error(`No se encontró el archivo ${seedsPath}`);
      }
      let seedsSql = fs.readFileSync(seedsPath, 'utf8');

      console.log(`🔒 Hasheando contraseña inicial para cuentas de prueba con bcrypt ("${seedPassword}")...`);
      const dynamicHash = await bcrypt.hash(seedPassword, 10);

      // Reemplazar la asignación de variable de sesión en seedsSql con el hash dinámico
      const hashInjection = `SET @SEED_PASSWORD_HASH = '${dynamicHash}';\n`;
      seedsSql = hashInjection + seedsSql;

      console.log('⏳ Insertando registros iniciales de prueba (usuarios, canchas, torneos, fixture, etc.)...');
      await connection.query(seedsSql);
      console.log('✅ Datos iniciales (seeds) insertados exitosamente.\n');
    }

    // 3. Verificación de conteo de registros
    console.log('📊 Verificación de registros en la base de datos:');
    const tables = ['usuario', 'cancha', 'torneo', 'equipo', 'equipo_jugador', 'partido', 'reserva', 'lista_espera', 'sancion', 'notificacion', 'audit_log'];
    for (const t of tables) {
      try {
        const [rows]: any = await connection.query(`SELECT COUNT(*) as count FROM ${t}`);
        const count = rows && rows[0] ? rows[0].count : 0;
        console.log(`   • ${t.padEnd(16)} : ${count} registros`);
      } catch (err: any) {
        console.log(`   • ${t.padEnd(16)} : (no disponible)`);
      }
    }

    console.log('\n🎉 ¡Proceso finalizado con éxito! La base de datos está lista para operar.\n');
  } catch (err: any) {
    console.error('❌ Error durante la ejecución de los scripts en la base de datos:');
    console.error(`   ${err.message}`);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();

