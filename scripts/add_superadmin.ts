import bcrypt from 'bcryptjs';
import { getPool, initDatabase } from '../src/config/database.js';

async function main() {
  await initDatabase();
  const pool = getPool();
  if (!pool) {
    console.error('No se pudo conectar al pool de base de datos.');
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('admin123', salt);

  const email = 'complejoub.soporte@gmail.com';
  const nombre = 'Superadministrador General (Soporte UB)';
  const rol = 'Superadministrador';

  const [existing]: any = await pool.query('SELECT id FROM usuario WHERE email = ?', [email]);

  if (existing && existing.length > 0) {
    await pool.query(
      'UPDATE usuario SET nombre = ?, contrasena_hash = ?, rol = ?, email_verificado = 1, estado_cuenta = "Activa" WHERE id = ?',
      [nombre, hash, rol, existing[0].id]
    );
    console.log(`Usuario ${email} actualizado con éxito a Superadministrador (ID: ${existing[0].id}).`);
  } else {
    const [result]: any = await pool.query(
      'INSERT INTO usuario (nombre, email, contrasena_hash, rol, inasistencias, estado_cuenta, email_verificado, telefono) VALUES (?, ?, ?, ?, 0, "Activa", 1, "+54 11 4567-8901")',
      [nombre, email, hash, rol]
    );
    console.log(`Usuario Superadministrador ${email} creado con éxito (ID: ${result.insertId}).`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error al configurar superadmin:', err);
  process.exit(1);
});
