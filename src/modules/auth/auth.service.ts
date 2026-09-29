import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { isDbConnected, getPool } from '../../config/database.js';
import { store, UsuarioModel } from '../../config/in-memory-store.js';
import { emailService } from '../email/email.service.js';

export interface RegisterDTO {
  nombre: string;
  email: string;
  contrasena: string;
  rol?: 'Cliente' | 'Administrador' | 'Arbitro' | 'Superadministrador';
  telefono?: string;
}

export interface LoginDTO {
  email: string;
  contrasena: string;
}

export class AuthService {
  async register(data: RegisterDTO) {
    const { nombre, email, contrasena, rol = 'Cliente', telefono } = data;

    if (!nombre || !email || !contrasena) {
      throw new AppError('Nombre, email y contraseña son obligatorios', 400);
    }

    const emailTrimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      throw new AppError('Formato de email inválido (debe contener @ y dominio válido, ej: nombre@correo.com)', 400);
    }

    if (contrasena.length < 6) {
      throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(contrasena, salt);

    // Generar código OTP de 6 dígitos con expiración de 15 minutos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracion = new Date(Date.now() + 15 * 60 * 1000);

    if (isDbConnected()) {
      const pool = getPool()!;
      const [existing]: any = await pool.query('SELECT id, email_verificado FROM usuario WHERE email = ?', [emailTrimmed]);
      if (existing && existing.length > 0) {
        if (!existing[0].email_verificado) {
          // Si el usuario ya existía pero no verificó su correo, actualizamos contraseña, datos y código OTP
          await pool.query(
            'UPDATE usuario SET nombre = ?, contrasena_hash = ?, telefono = ?, codigo_verificacion = ?, codigo_expiracion = ? WHERE id = ?',
            [nombre, hash, telefono || null, codigo, expiracion, existing[0].id]
          );
          await emailService.enviarCodigoVerificacion(emailTrimmed, nombre, codigo);
          return {
            requiresVerification: true,
            email: emailTrimmed,
            message: 'Registro actualizado. Te enviamos un nuevo código de activación de 6 dígitos a tu casilla de correo.',
          };
        }
        throw new AppError('El correo electrónico ya se encuentra registrado y activo', 409);
      }

      await pool.query(
        `INSERT INTO usuario (nombre, email, contrasena_hash, rol, telefono, email_verificado, codigo_verificacion, codigo_expiracion) 
         VALUES (?, ?, ?, ?, ?, false, ?, ?)`,
        [nombre, emailTrimmed, hash, rol, telefono || null, codigo, expiracion]
      );

      await emailService.enviarCodigoVerificacion(emailTrimmed, nombre, codigo);

      return {
        requiresVerification: true,
        email: emailTrimmed,
        message: 'Registro iniciado. Te enviamos un código de 6 dígitos para verificar tu cuenta.',
      };
    } else {
      const existing = store.usuarios.find(u => u.email.toLowerCase() === emailTrimmed);
      if (existing) {
        if (!existing.email_verificado) {
          existing.nombre = nombre;
          existing.contrasena_hash = hash;
          if (telefono) existing.telefono = telefono;
          existing.codigo_verificacion = codigo;
          existing.codigo_expiracion = expiracion.toISOString();
          await emailService.enviarCodigoVerificacion(emailTrimmed, nombre, codigo);
          return {
            requiresVerification: true,
            email: emailTrimmed,
            message: 'Registro actualizado. Te enviamos un nuevo código de activación de 6 dígitos a tu casilla de correo.',
          };
        }
        throw new AppError('El correo electrónico ya se encuentra registrado', 409);
      }

      const newId = store.usuarios.length > 0 ? Math.max(...store.usuarios.map(u => u.id)) + 1 : 1;
      const newUser: UsuarioModel = {
        id: newId,
        nombre,
        email: emailTrimmed,
        contrasena_hash: hash,
        rol,
        inasistencias: 0,
        estado_cuenta: 'Activa',
        suspension_hasta: null,
        telefono,
        email_verificado: false,
        codigo_verificacion: codigo,
        codigo_expiracion: expiracion.toISOString(),
        created_at: new Date().toISOString(),
      };
      store.usuarios.push(newUser);

      await emailService.enviarCodigoVerificacion(emailTrimmed, nombre, codigo);

      return {
        requiresVerification: true,
        email: emailTrimmed,
        message: 'Registro iniciado. Te enviamos un código de 6 dígitos para verificar tu cuenta.',
      };
    }
  }

  async verificarCodigo(email: string, codigo: string) {
    if (!email || !codigo) {
      throw new AppError('El email y el código de verificación son requeridos', 400);
    }

    const emailTrimmed = email.trim().toLowerCase();
    const codigoTrimmed = codigo.trim();

    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query('SELECT * FROM usuario WHERE email = ?', [emailTrimmed]);
      if (!rows || rows.length === 0) {
        throw new AppError('Usuario no encontrado', 404);
      }
      const user = rows[0];

      if (user.email_verificado) {
        const token = this.generateToken(user.id, user.email, user.rol);
        return { user, token, message: 'La cuenta ya se encuentra verificada.' };
      }

      // Soporte para bypass maestro universal de test (123456)
      const isMasterCode = codigoTrimmed === '123456';
      const isCodeValid = user.codigo_verificacion === codigoTrimmed;
      const isExpired = user.codigo_expiracion && new Date(user.codigo_expiracion) < new Date();

      if (!isMasterCode && (!isCodeValid || isExpired)) {
        throw new AppError('Código de verificación inválido o expirado', 400);
      }

      await pool.query(
        'UPDATE usuario SET email_verificado = true, codigo_verificacion = NULL, codigo_expiracion = NULL WHERE id = ?',
        [user.id]
      );

      const token = this.generateToken(user.id, user.email, user.rol);
      return {
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          inasistencias: user.inasistencias,
          estado_cuenta: user.estado_cuenta,
        },
        token,
        message: '¡Cuenta verificada exitosamente!',
      };
    } else {
      const user = store.usuarios.find(u => u.email.toLowerCase() === emailTrimmed);
      if (!user) throw new AppError('Usuario no encontrado', 404);

      if (user.email_verificado) {
        const token = this.generateToken(user.id, user.email, user.rol);
        return { user, token, message: 'La cuenta ya se encuentra verificada.' };
      }

      const isMasterCode = codigoTrimmed === '123456';
      const isCodeValid = user.codigo_verificacion === codigoTrimmed;
      const isExpired = user.codigo_expiracion && new Date(user.codigo_expiracion) < new Date();

      if (!isMasterCode && (!isCodeValid || isExpired)) {
        throw new AppError('Código de verificación inválido o expirado', 400);
      }

      user.email_verificado = true;
      user.codigo_verificacion = null;
      user.codigo_expiracion = null;

      const token = this.generateToken(user.id, user.email, user.rol);
      const { contrasena_hash, ...safeUser } = user;
      return {
        user: safeUser,
        token,
        message: '¡Cuenta verificada exitosamente!',
      };
    }
  }

  async reenviarCodigo(email: string) {
    if (!email) throw new AppError('El email es obligatorio', 400);
    const emailTrimmed = email.trim().toLowerCase();
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracion = new Date(Date.now() + 15 * 60 * 1000);

    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query('SELECT * FROM usuario WHERE email = ?', [emailTrimmed]);
      if (!rows || rows.length === 0) throw new AppError('Usuario no encontrado', 404);
      const user = rows[0];

      await pool.query(
        'UPDATE usuario SET codigo_verificacion = ?, codigo_expiracion = ? WHERE id = ?',
        [codigo, expiracion, user.id]
      );

      await emailService.enviarCodigoVerificacion(emailTrimmed, user.nombre, codigo);
      return { success: true, message: 'Código reenviado con éxito.' };
    } else {
      const user = store.usuarios.find(u => u.email.toLowerCase() === emailTrimmed);
      if (!user) throw new AppError('Usuario no encontrado', 404);

      user.codigo_verificacion = codigo;
      user.codigo_expiracion = expiracion.toISOString();

      await emailService.enviarCodigoVerificacion(emailTrimmed, user.nombre, codigo);
      return { success: true, message: 'Código reenviado con éxito.' };
    }
  }

  async login(data: LoginDTO) {
    const { email, contrasena } = data;
    if (!email || !contrasena) {
      throw new AppError('Email y contraseña son obligatorios', 400);
    }

    const emailTrimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      throw new AppError('El formato de correo no es válido. Debe contener @ y un dominio (.com, .edu, etc.)', 400);
    }

    let user: any = null;

    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query('SELECT * FROM usuario WHERE email = ?', [emailTrimmed]);
      if (rows && rows.length > 0) user = rows[0];
    } else {
      user = store.usuarios.find(u => u.email.toLowerCase() === emailTrimmed);
    }

    if (!user) {
      throw new AppError('No existe una cuenta registrada con este correo electrónico. Por favor regístrate.', 401);
    }

    // Validación criptográfica estricta contra el hash de la base de datos
    const passwordMatch = await bcrypt.compare(contrasena, user.contrasena_hash);

    if (!passwordMatch) {
      if (!user.email_verificado) {
        throw new AppError(
          'Contraseña incorrecta. Si aún no confirmaste tu cuenta o deseas definir una nueva contraseña, puedes volver a registrarte con este correo o verificar el código.',
          401
        );
      }
      throw new AppError('Contraseña incorrecta. Por favor verifica tus credenciales.', 401);
    }

    // Requerir email verificado (excepto cuentas demo creadas por seed)
    if (!user.email_verificado && !['admin@complejoub.com', 'lucas@gmail.com', 'arbitro@complejoub.com'].includes(user.email)) {
      // Generar nuevo código OTP y reenviar por correo automáticamente
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      const expiracion = new Date(Date.now() + 15 * 60 * 1000);

      if (isDbConnected()) {
        await getPool()!.query(
          'UPDATE usuario SET codigo_verificacion = ?, codigo_expiracion = ? WHERE id = ?',
          [codigo, expiracion, user.id]
        );
      } else {
        user.codigo_verificacion = codigo;
        user.codigo_expiracion = expiracion.toISOString();
      }

      await emailService.enviarCodigoVerificacion(user.email, user.nombre, codigo);

      throw new AppError('Debes verificar tu correo electrónico antes de ingresar. Te hemos enviado un nuevo código de activación a tu casilla de correo.', 403);
    }

    // Verificar si la cuenta está suspendida por inasistencias
    let isSuspended = false;
    if (user.estado_cuenta === 'Suspendida' && user.suspension_hasta) {
      const suspensionEnd = new Date(user.suspension_hasta);
      if (suspensionEnd > new Date()) {
        isSuspended = true;
      } else {
        // La suspensión ya venció, restablecer automáticamente a Activa
        if (isDbConnected()) {
          await getPool()!.query('UPDATE usuario SET estado_cuenta = "Activa", suspension_hasta = NULL WHERE id = ?', [user.id]);
        } else {
          user.estado_cuenta = 'Activa';
          user.suspension_hasta = null;
        }
      }
    }

    const token = this.generateToken(user.id, user.email, user.rol);
    return {
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        inasistencias: user.inasistencias,
        estado_cuenta: isSuspended ? 'Suspendida' : user.estado_cuenta,
        suspension_hasta: user.suspension_hasta,
      },
      token,
    };
  }

  async getProfile(userId: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        'SELECT id, nombre, email, rol, inasistencias, estado_cuenta, suspension_hasta, telefono, created_at FROM usuario WHERE id = ?',
        [userId]
      );
      if (!rows || rows.length === 0) throw new AppError('Usuario no encontrado', 404);
      return rows[0];
    } else {
      const user = store.usuarios.find(u => u.id === userId);
      if (!user) throw new AppError('Usuario no encontrado', 404);
      const { contrasena_hash, ...profile } = user;
      return profile;
    }
  }

  private generateToken(id: number, email: string, rol: string): string {
    return jwt.sign({ id, email, rol }, ENV.JWT.SECRET, { expiresIn: ENV.JWT.EXPIRES_IN as any });
  }
}

export const authService = new AuthService();
