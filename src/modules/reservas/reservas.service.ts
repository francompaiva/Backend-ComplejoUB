import { AppError } from '../../middlewares/error.middleware.js';
import { isDbConnected, getPool } from '../../config/database.js';
import { store, ReservaModel, SancionModel, NotificacionModel, AuditLogModel } from '../../config/inMemoryStore.js';
import { canchasService } from '../canchas/canchas.service.js';

export interface CreateReservaDTO {
  canchaId: number;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:00:00 o HH:00
}

export class ReservasService {
  /**
   * RF-03: Reserva de turnos de una hora con seña del 30%
   * RF-05: Verificación de suspensión por inasistencias
   * RF-06: Verificación de disponibilidad y torneos de fin de semana
   */
  async createReserva(userId: number, data: CreateReservaDTO) {
    const { canchaId, fecha } = data;
    let hora = data.hora;
    if (hora.length === 5) hora = `${hora}:00`;

    // 1. Verificar si el usuario está suspendido
    if (isDbConnected()) {
      const pool = getPool()!;
      const [uRows]: any = await pool.query(
        'SELECT estado_cuenta, suspension_hasta, inasistencias FROM usuario WHERE id = ?',
        [userId]
      );
      if (uRows && uRows.length > 0) {
        const u = uRows[0];
        if (u.estado_cuenta === 'Suspendida' && u.suspension_hasta) {
          if (new Date(u.suspension_hasta) > new Date()) {
            throw new AppError(
              `Usuario suspendido hasta el ${new Date(u.suspension_hasta).toLocaleDateString()} por acumulación de inasistencias (RF-05)`,
              403
            );
          }
        }
      }
    } else {
      const u = store.usuarios.find(user => user.id === userId);
      if (u && u.estado_cuenta === 'Suspendida' && u.suspension_hasta) {
        if (new Date(u.suspension_hasta) > new Date()) {
          throw new AppError(
            `Usuario suspendido hasta el ${new Date(u.suspension_hasta).toLocaleDateString()} por acumulación de inasistencias (RF-05)`,
            403
          );
        }
      }
    }

    // 2. Obtener cancha y tarifa
    const cancha = await canchasService.getById(canchaId);
    if (!cancha.activa) {
      throw new AppError('La cancha seleccionada se encuentra inactiva', 400);
    }

    // 3. Verificar disponibilidad y regla RF-06 de torneos fin de semana
    const disponibilidad = await canchasService.getDisponibilidad(canchaId, fecha);
    if (disponibilidad.bloqueadoPorTorneo) {
      throw new AppError(disponibilidad.motivoBloqueo, 400);
    }

    const slot = disponibilidad.slots.find(s => s.horaCompleta.startsWith(hora.slice(0, 5)));
    if (!slot || slot.estado !== 'Libre') {
      throw new AppError('El turno seleccionado ya no se encuentra disponible. Puedes anotarte en la lista de espera.', 409);
    }

    // 4. Cálculo de tarifa fija y 30% de seña obligatoria
    const montoTotal = Number(cancha.precio_hora);
    const montoSena = Math.round(montoTotal * 0.3); // 30% de seña
    const senaAbonada = true; // Simulación de pago aprobada

    if (isDbConnected()) {
      const pool = getPool()!;
      const [result]: any = await pool.query(
        `INSERT INTO reserva (fk_usuario_id, fk_cancha_id, fecha, hora, monto_total, monto_sena, sena_abonada, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMADA')`,
        [userId, canchaId, fecha, hora, montoTotal, montoSena, senaAbonada]
      );
      const reservaId = result.insertId;

      // Crear notificación (RF-23)
      await pool.query(
        `INSERT INTO notificacion (fk_usuario_id, titulo, mensaje, tipo)
         VALUES (?, 'Reserva Confirmada', ?, 'ReservaConfirmada')`,
        [userId, `Tu turno para ${cancha.nombre} el ${fecha} a las ${hora.slice(0, 5)} hs ha sido reservado. Seña abonada: $${montoSena.toLocaleString()}.`]
      );

      return {
        id: reservaId,
        canchaId,
        canchaNombre: cancha.nombre,
        fecha,
        hora,
        montoTotal,
        montoSena,
        senaAbonada,
        estado: 'CONFIRMADA',
      };
    } else {
      const newId = store.reservas.length > 0 ? Math.max(...store.reservas.map(r => r.id)) + 1 : 1;
      const newReserva: ReservaModel = {
        id: newId,
        fk_usuario_id: userId,
        fk_cancha_id: canchaId,
        fecha,
        hora,
        monto_total: montoTotal,
        monto_sena: montoSena,
        sena_abonada: senaAbonada,
        estado: 'CONFIRMADA',
        devolucion_sena: null,
        asistencia_confirmada: null,
        created_at: new Date().toISOString(),
      };
      store.reservas.push(newReserva);

      // Notificación
      store.notificaciones.push({
        id: store.notificaciones.length + 1,
        fk_usuario_id: userId,
        titulo: 'Reserva Confirmada',
        mensaje: `Tu turno para ${cancha.nombre} el ${fecha} a las ${hora.slice(0, 5)} hs ha sido reservado. Seña abonada: $${montoSena.toLocaleString()}.`,
        tipo: 'ReservaConfirmada',
        leida: false,
        created_at: new Date().toISOString(),
      });

      return {
        ...newReserva,
        canchaNombre: cancha.nombre,
      };
    }
  }

  /**
   * RF-04: Cancelación de reservas con regla de más de 24 horas para devolución de seña
   * RF-24: Reactivación y notificación a usuarios en lista de espera
   */
  async cancelarReserva(reservaId: number, userId: number, userRol: string, motivo?: string) {
    let reserva: any = null;

    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        'SELECT r.*, c.nombre as cancha_nombre FROM reserva r JOIN cancha c ON r.fk_cancha_id = c.id WHERE r.id = ?',
        [reservaId]
      );
      if (!rows || rows.length === 0) throw new AppError('Reserva no encontrada', 404);
      reserva = rows[0];
    } else {
      reserva = store.reservas.find(r => r.id === reservaId);
      if (!reserva) throw new AppError('Reserva no encontrada', 404);
      const c = store.canchas.find(ca => ca.id === reserva.fk_cancha_id);
      reserva.cancha_nombre = c?.nombre || 'Cancha';
    }

    // Validar autorización: Solo el dueño de la reserva o un Administrador pueden cancelarla
    if (reserva.fk_usuario_id !== userId && userRol !== 'Administrador') {
      throw new AppError('No tienes autorización para cancelar esta reserva', 403);
    }

    if (reserva.estado === 'CANCELADA') {
      throw new AppError('La reserva ya se encuentra cancelada', 400);
    }

    // Calcular anticipación en horas
    const reservaDateTime = new Date(`${reserva.fecha}T${reserva.hora}`);
    const now = new Date();
    const diffHours = (reservaDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const aplicaDevolucion = diffHours > 24;

    if (isDbConnected()) {
      const pool = getPool()!;
      await pool.query(
        'UPDATE reserva SET estado = "CANCELADA", devolucion_sena = ?, notas_cancelacion = ? WHERE id = ?',
        [aplicaDevolucion, motivo || 'Cancelada por el usuario', reservaId]
      );

      // Notificar al usuario titular
      const mensajeReintegro = aplicaDevolucion
        ? `Cancelaste con ${Math.round(diffHours)}hs de anticipación (>24hs). Se acreditó la devolución del 100% de la seña ($${Number(reserva.monto_sena).toLocaleString()}).`
        : `Cancelaste con menos de 24hs de anticipación (${Math.max(0, Math.round(diffHours))}hs). De acuerdo a la política, no aplica reintegro de seña.`;

      await pool.query(
        `INSERT INTO notificacion (fk_usuario_id, titulo, mensaje, tipo)
         VALUES (?, 'Reserva Cancelada', ?, 'ReservaCancelada')`,
        [reserva.fk_usuario_id, mensajeReintegro]
      );

      // RF-24: Verificar si hay usuarios en lista de espera para notificar al primero
      const [esperaRows]: any = await pool.query(
        'SELECT * FROM lista_espera WHERE fk_cancha_id = ? AND fecha = ? AND hora = ? AND estado = "PENDIENTE" ORDER BY created_at ASC LIMIT 1',
        [reserva.fk_cancha_id, reserva.fecha, reserva.hora]
      );
      if (esperaRows && esperaRows.length > 0) {
        const primero = esperaRows[0];
        await pool.query('UPDATE lista_espera SET estado = "NOTIFICADO" WHERE id = ?', [primero.id]);
        await pool.query(
          `INSERT INTO notificacion (fk_usuario_id, titulo, mensaje, tipo)
           VALUES (?, '¡Turno Liberado en Lista de Espera!', ?, 'ListaEsperaDisponible')`,
          [primero.fk_usuario_id, `Se liberó el turno para ${reserva.cancha_nombre} el ${reserva.fecha} a las ${reserva.hora.slice(0, 5)} hs. Tienes prioridad para reservar.`]
        );
      }
    } else {
      reserva.estado = 'CANCELADA';
      reserva.devolucion_sena = aplicaDevolucion;
      reserva.notas_cancelacion = motivo;

      const mensajeReintegro = aplicaDevolucion
        ? `Cancelaste con más de 24hs de antelación. Se acreditó la devolución de la seña ($${reserva.monto_sena.toLocaleString()}).`
        : 'Cancelaste con menos de 24hs de anticipación. No aplica reintegro de seña.';

      store.notificaciones.push({
        id: store.notificaciones.length + 1,
        fk_usuario_id: reserva.fk_usuario_id,
        titulo: 'Reserva Cancelada',
        mensaje: mensajeReintegro,
        tipo: 'ReservaCancelada',
        leida: false,
        created_at: new Date().toISOString(),
      });

      // Lista de espera
      const espera = store.listasEspera.find(
        l => l.fk_cancha_id === reserva.fk_cancha_id && l.fecha === reserva.fecha && l.hora === reserva.hora && l.estado === 'PENDIENTE'
      );
      if (espera) {
        espera.estado = 'NOTIFICADO';
        store.notificaciones.push({
          id: store.notificaciones.length + 1,
          fk_usuario_id: espera.fk_usuario_id,
          titulo: '¡Turno Liberado en Lista de Espera!',
          mensaje: `Se liberó el turno en ${reserva.cancha_nombre} para el ${reserva.fecha} a las ${reserva.hora.slice(0, 5)} hs.`,
          tipo: 'ListaEsperaDisponible',
          leida: false,
          created_at: new Date().toISOString(),
        });
      }
    }

    return {
      reservaId,
      estado: 'CANCELADA',
      aplicaDevolucion,
      horasAnticipacion: Math.round(diffHours),
      montoSenaDevuelto: aplicaDevolucion ? reserva.monto_sena : 0,
      mensaje: aplicaDevolucion
        ? 'Reserva cancelada con éxito. Aplica devolución del 100% de la seña por anticipación > 24hs.'
        : 'Reserva cancelada con éxito. No aplica devolución de seña (menos de 24hs de anticipación).',
    };
  }

  /**
   * RF-05: Control de inasistencias por Administrador
   * Si un cliente acumula 3 inasistencias consecutivas -> suspensión de 2 semanas
   */
  async registrarInasistencia(reservaId: number, adminId: number) {
    let reserva: any = null;

    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query('SELECT * FROM reserva WHERE id = ?', [reservaId]);
      if (!rows || rows.length === 0) throw new AppError('Reserva no encontrada', 404);
      reserva = rows[0];

      // Actualizar reserva
      await pool.query(
        'UPDATE reserva SET estado = "INASISTENCIA", asistencia_confirmada = false, devolucion_sena = false WHERE id = ?',
        [reservaId]
      );

      // Incrementar contador de inasistencias
      await pool.query('UPDATE usuario SET inasistencias = inasistencias + 1 WHERE id = ?', [reserva.fk_usuario_id]);

      const [userRows]: any = await pool.query('SELECT inasistencias, nombre FROM usuario WHERE id = ?', [reserva.fk_usuario_id]);
      const currentInasistencias = userRows[0].inasistencias;
      let suspendido = false;

      if (currentInasistencias >= 3) {
        suspendido = true;
        await pool.query(
          'UPDATE usuario SET estado_cuenta = "Suspendida", suspension_hasta = DATE_ADD(NOW(), INTERVAL 14 DAY) WHERE id = ?',
          [reserva.fk_usuario_id]
        );
        await pool.query(
          'INSERT INTO sancion (fk_usuario_id, fk_partido_id, tipo_sancion, descripcion, fecha_sancion, fk_creado_por_id) VALUES (?, NULL, "Suspensión 2 semanas", "Suspensión automática por 3 inasistencias consecutivas.", NOW(), ?)',
          [reserva.fk_usuario_id, adminId]
        );
        await pool.query(
          'INSERT INTO notificacion (fk_usuario_id, titulo, mensaje, tipo) VALUES (?, "Cuenta Suspendida", "Has acumulado 3 inasistencias sin aviso. Tu cuenta ha sido suspendida para reservas durante 2 semanas.", "Sancion")',
          [reserva.fk_usuario_id]
        );
      }

      await pool.query(
        'INSERT INTO audit_log (fk_usuario_id, accion, entidad_afectada, entidad_id, detalles) VALUES (?, "REGISTRAR_INASISTENCIA", "reserva", ?, ?)',
        [adminId, reservaId, JSON.stringify({ usuarioId: reserva.fk_usuario_id, totalInasistencias: currentInasistencias, suspendido })]
      );

      return {
        reservaId,
        estado: 'INASISTENCIA',
        inasistenciasAcumuladas: currentInasistencias,
        cuentaSuspendida: suspendido,
      };
    } else {
      reserva = store.reservas.find(r => r.id === reservaId);
      if (!reserva) throw new AppError('Reserva no encontrada', 404);
      reserva.estado = 'INASISTENCIA';
      reserva.asistencia_confirmada = false;
      reserva.devolucion_sena = false;

      const user = store.usuarios.find(u => u.id === reserva.fk_usuario_id);
      if (user) {
        user.inasistencias += 1;
        let suspendido = false;
        if (user.inasistencias >= 3) {
          suspendido = true;
          user.estado_cuenta = 'Suspendida';
          const sup = new Date();
          sup.setDate(sup.getDate() + 14);
          user.suspension_hasta = sup.toISOString();

          store.sanciones.push({
            id: store.sanciones.length + 1,
            fk_usuario_id: user.id,
            fk_partido_id: null,
            tipo_sancion: 'Suspensión 2 semanas',
            descripcion: 'Suspensión automática por acumular 3 inasistencias consecutivas (RF-05).',
            fecha_sancion: new Date().toISOString(),
            fk_creado_por_id: adminId,
          });

          store.notificaciones.push({
            id: store.notificaciones.length + 1,
            fk_usuario_id: user.id,
            titulo: 'Cuenta Suspendida por Inasistencias',
            mensaje: 'Has acumulado 3 inasistencias a turnos reservados. Tu cuenta está suspendida por 14 días.',
            tipo: 'Sancion',
            leida: false,
            created_at: new Date().toISOString(),
          });
        }

        store.auditLogs.push({
          id: store.auditLogs.length + 1,
          fk_usuario_id: adminId,
          accion: 'REGISTRAR_INASISTENCIA',
          entidad_afectada: 'reserva',
          entidad_id: reservaId,
          detalles: JSON.stringify({ usuarioId: user.id, inasistencias: user.inasistencias, suspendido }),
          ip_address: '127.0.0.1',
          created_at: new Date().toISOString(),
        });

        return {
          reservaId,
          estado: 'INASISTENCIA',
          inasistenciasAcumuladas: user.inasistencias,
          cuentaSuspendida: suspendido,
        };
      }
      return { reservaId, estado: 'INASISTENCIA' };
    }
  }

  async getMisReservas(userId: number) {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows]: any = await pool.query(
        `SELECT r.*, c.nombre as cancha_nombre, c.deporte, c.superficie, c.techada
         FROM reserva r
         JOIN cancha c ON r.fk_cancha_id = c.id
         WHERE r.fk_usuario_id = ?
         ORDER BY r.fecha DESC, r.hora DESC`,
        [userId]
      );
      return rows;
    } else {
      return store.reservas
        .filter(r => r.fk_usuario_id === userId)
        .map(r => {
          const c = store.canchas.find(ca => ca.id === r.fk_cancha_id);
          return {
            ...r,
            cancha_nombre: c?.nombre || 'Cancha',
            deporte: c?.deporte || 'Futbol 5',
            superficie: c?.superficie || 'Sintético',
            techada: c?.techada || false,
          };
        })
        .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    }
  }

  async getAllReservas(fecha?: string) {
    if (isDbConnected()) {
      const pool = getPool()!;
      let query = `
        SELECT r.*, c.nombre as cancha_nombre, c.deporte, u.nombre as usuario_nombre, u.email as usuario_email, u.telefono as usuario_telefono, u.inasistencias
        FROM reserva r
        JOIN cancha c ON r.fk_cancha_id = c.id
        JOIN usuario u ON r.fk_usuario_id = u.id
      `;
      const params: any[] = [];
      if (fecha) {
        query += ' WHERE r.fecha = ?';
        params.push(fecha);
      }
      query += ' ORDER BY r.fecha DESC, r.hora ASC';
      const [rows] = await pool.query(query, params);
      return rows;
    } else {
      let list = store.reservas;
      if (fecha) {
        list = list.filter(r => r.fecha === fecha);
      }
      return list.map(r => {
        const c = store.canchas.find(ca => ca.id === r.fk_cancha_id);
        const u = store.usuarios.find(user => user.id === r.fk_usuario_id);
        return {
          ...r,
          cancha_nombre: c?.nombre || 'Cancha',
          deporte: c?.deporte || 'Futbol 5',
          usuario_nombre: u?.nombre || 'Usuario',
          usuario_email: u?.email || '',
          usuario_telefono: u?.telefono || '',
          inasistencias: u?.inasistencias || 0,
        };
      });
    }
  }
}

export const reservasService = new ReservasService();
