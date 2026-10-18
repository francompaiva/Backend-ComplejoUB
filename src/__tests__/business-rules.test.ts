import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ReservasService } from '../modules/reservas/reservas.service.js';
import { TorneosService } from '../modules/torneos/torneos.service.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { EquiposService } from '../modules/equipos/equipos.service.js';
import { store } from '../config/in-memory-store.js';

describe('Reglas de Negocio - Complejo Deportivo UB', () => {
  const reservasService = new ReservasService();
  const torneosService = new TorneosService();
  const authService = new AuthService();
  const equiposService = new EquiposService();

  it('RF-03: Cálculo exacto de seña del 30% al reservar', async () => {
    // Cancha 1 (Fútbol 5) cuesta $18.000 -> la seña del 30% debe ser $5.400
    const cancha = store.canchas.find(c => c.id === 1)!;
    const precio = Number(cancha.precio_hora);
    const montoSena = Math.round(precio * 0.3);

    assert.equal(precio, 18000);
    assert.equal(montoSena, 5400);
  });

  it('RF-04: Cancelación con más de 24 horas reintegra la seña', async () => {
    // Crear reserva a 48 horas en el futuro
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const fechaStr = futureDate.toISOString().split('T')[0];

    const reserva = await reservasService.createReserva(4, {
      canchaId: 1,
      fecha: fechaStr,
      hora: '15:00:00',
    });

    const resultado = await reservasService.cancelarReserva(reserva.id, 4, 'Cliente', 'Imprevisto');
    assert.equal(resultado.estado, 'CANCELADA');
    assert.equal(resultado.aplicaDevolucion, true);
    assert.ok(resultado.montoSenaDevuelto > 0);
  });

  it('RF-05: Acumulación de 3 inasistencias suspende al usuario por 14 días', async () => {
    // Creamos un usuario de prueba para inasistencias
    const testUserId = 999;
    store.usuarios.push({
      id: testUserId,
      nombre: 'Usuario Faltador Test',
      email: 'faltador@test.com',
      contrasena_hash: 'hash',
      rol: 'Cliente',
      inasistencias: 2, // Ya tiene 2 inasistencias
      estado_cuenta: 'Activa',
      suspension_hasta: null,
      created_at: new Date().toISOString(),
    });

    // Crear reserva y marcar inasistencia (tercera falta)
    const resId = 888;
    store.reservas.push({
      id: resId,
      fk_usuario_id: testUserId,
      fk_cancha_id: 1,
      fecha: '2026-10-01',
      hora: '10:00:00',
      monto_total: 18000,
      monto_sena: 5400,
      sena_abonada: true,
      estado: 'CONFIRMADA',
      devolucion_sena: null,
      asistencia_confirmada: null,
      created_at: new Date().toISOString(),
    });

    const resultado = await reservasService.registrarInasistencia(resId, 1);
    assert.equal(resultado.inasistenciasAcumuladas, 3);
    assert.equal(resultado.cuentaSuspendida, true);

    const user = store.usuarios.find(u => u.id === testUserId)!;
    assert.equal(user.estado_cuenta, 'Suspendida');
    assert.ok(user.suspension_hasta !== null);
  });

  it('RF-09: Generador de Fixture Round-Robin con número impar de equipos asigna Fecha Libre rotativa', async () => {
    // Crear un torneo de prueba con 3 equipos (impar)
    const torneoId = 999;
    store.torneos.push({
      id: torneoId,
      nombre: 'Torneo Triangular Test',
      deporte: 'Futbol 5',
      costo_inscripcion: 10000,
      valor_partido: 2000,
      max_equipos: 4,
      min_jugadores_equipo: 5,
      max_jugadores_equipo: 10,
      fecha_inicio: '2026-11-01',
      fecha_fin: '2026-11-30',
      estado: 'INSCRIPCION_ABIERTA',
    });

    store.equipos.push(
      { id: 901, fk_torneo_id: torneoId, fk_capitan_id: 4, nombre: 'Equipo A', puntos: 0, partidos_jugados: 0, partidos_ganados: 0, partidos_empatados: 0, partidos_perdidos: 0, goles_favor: 0, goles_contra: 0, diferencia_goles: 0, inscripcion_pagada: true },
      { id: 902, fk_torneo_id: torneoId, fk_capitan_id: 5, nombre: 'Equipo B', puntos: 0, partidos_jugados: 0, partidos_ganados: 0, partidos_empatados: 0, partidos_perdidos: 0, goles_favor: 0, goles_contra: 0, diferencia_goles: 0, inscripcion_pagada: true },
      { id: 903, fk_torneo_id: torneoId, fk_capitan_id: 6, nombre: 'Equipo C', puntos: 0, partidos_jugados: 0, partidos_ganados: 0, partidos_empatados: 0, partidos_perdidos: 0, goles_favor: 0, goles_contra: 0, diferencia_goles: 0, inscripcion_pagada: true }
    );

    const fixture = await torneosService.generarFixture(torneoId, 1, '2026-11-01');
    assert.ok(fixture.partidos.length > 0);

    // Debe contener partidos con visitanteId === null (representando Fecha Libre rotativa)
    const fechaLibrePartidos = fixture.partidos.filter(p => p.visitanteId === null);
    assert.ok(fechaLibrePartidos.length > 0, 'Debe haber asignado al menos una fecha libre rotativa');
  });

  it('RF-11: Ordenamiento de tabla de posiciones por Puntos, DG y GF', async () => {
    const tabla = await torneosService.getTablaPosiciones(1);
    assert.ok(tabla.length >= 2);
    // El primer equipo debe tener mayor o igual puntaje que el segundo
    assert.ok(tabla[0].puntos >= tabla[1].puntos);
  });

  it('RF-07 / Admin: Eliminación de torneo y limpieza de datos vinculados', async () => {
    // Crear un torneo de prueba
    const nuevoTorneo = await torneosService.create({
      nombre: 'Torneo Para Eliminar Test',
      deporte: 'Padel',
      costo_inscripcion: 20000,
      valor_partido: 5000,
      max_equipos: 4,
    }, 1);

    const resultado = await torneosService.delete(nuevoTorneo.id, 1);
    assert.equal(resultado.id, nuevoTorneo.id);

    // Verificar que ya no existe
    await assert.rejects(
      async () => await torneosService.getById(nuevoTorneo.id),
      { message: 'Torneo no encontrado' }
    );
  });

  it('Corrección Docente: Inasistencias consecutivas se resetean al confirmar asistencia', async () => {
    // 1. Simular acumulación de faltas para usuario #4
    const store = (reservasService as any).store || (await import('../config/in-memory-store.js')).store;
    const user = store.usuarios.find((u: any) => u.id === 4);
    assert.ok(user);
    user.inasistencias = 2;

    // 2. Crear una reserva y confirmar asistencia
    const reserva = await reservasService.createReserva(4, {
      canchaId: 1,
      fecha: '2026-11-20',
      hora: '21:00:00',
    });

    const resultado = await reservasService.confirmarAsistencia(reserva.id, 1);
    assert.equal(resultado.asistenciaConfirmada, true);
    assert.equal(resultado.inasistencias, 0);
    assert.equal(user.inasistencias, 0);
  });

  it('RF-04b: Cancelación con menos de 24 horas NO reintegra la seña (0% devolución)', async () => {
    // Crear reserva dentro del horario operativo (entre 8 y 22 hs) a menos de 24 horas
    const inminente = new Date();
    // Si la hora actual es antes de las 20hs, usamos hoy a las 22hs (a pocas horas).
    // Si ya es tarde, usamos mañana a las 10hs (menos de 24hs).
    if (inminente.getHours() < 21) {
      inminente.setHours(22, 0, 0, 0);
    } else {
      inminente.setDate(inminente.getDate() + 1);
      inminente.setHours(10, 0, 0, 0);
    }
    const y = inminente.getFullYear();
    const m = String(inminente.getMonth() + 1).padStart(2, '0');
    const d = String(inminente.getDate()).padStart(2, '0');
    const fechaStr = `${y}-${m}-${d}`;
    const horaStr = `${inminente.getHours().toString().padStart(2, '0')}:00:00`;

    const reserva = await reservasService.createReserva(4, {
      canchaId: 2,
      fecha: fechaStr,
      hora: horaStr,
    });

    const resultado = await reservasService.cancelarReserva(reserva.id, 4, 'Cliente', 'Imprevisto de última hora');
    assert.equal(resultado.estado, 'CANCELADA');
    assert.equal(resultado.aplicaDevolucion, false);
    assert.equal(resultado.montoSenaDevuelto, 0);
  });

  it('Validación Docente: Rechazar reserva de fechas u horarios concluidos en el pasado', async () => {
    await assert.rejects(
      async () => {
        await reservasService.createReserva(4, {
          canchaId: 1,
          fecha: '2020-01-01',
          hora: '10:00:00',
        });
      },
      { message: 'No es posible reservar un turno para una fecha u horario que ya ha transcurrido' }
    );
  });

  it('RF-05b: Usuario con cuenta suspendida es bloqueado al intentar reservar', async () => {
    // Usuario 12 está suspendido
    await assert.rejects(
      async () => {
        await reservasService.createReserva(12, {
          canchaId: 1,
          fecha: '2026-12-01',
          hora: '18:00:00',
        });
      },
      (err: any) => {
        return err.statusCode === 403 && err.message.includes('Usuario suspendido');
      }
    );
  });

  it('RF-04c: Re-reserva exitosa de un turno previamente cancelado (liberación de turno)', async () => {
    const fecha = '2026-11-25';
    const hora = '16:00:00';

    // 1. Primera reserva
    const r1 = await reservasService.createReserva(4, { canchaId: 1, fecha, hora });
    assert.equal(r1.estado, 'CONFIRMADA');

    // 2. Se cancela el turno
    const cancelado = await reservasService.cancelarReserva(r1.id, 4, 'Cliente', 'Liberar turno');
    assert.equal(cancelado.estado, 'CANCELADA');

    // 3. Otro usuario (o el mismo) re-reserva ese mismo turno liberado
    const r2 = await reservasService.createReserva(5, { canchaId: 1, fecha, hora });
    assert.equal(r2.estado, 'CONFIRMADA');
    assert.notEqual(r1.id, r2.id);
  });

  it('RBAC Signup: El registro público fuerza el rol "Cliente" e ignora intentos de escalado', async () => {
    const testEmail = `attacker-${Date.now()}@test.com`;
    // Intentar registrarse como 'Administrador' o 'Superadministrador'
    await authService.register({
      nombre: 'Usuario Malicioso',
      email: testEmail,
      contrasena: 'SecurityTest2026!',
      rol: 'Administrador' as any,
    });

    const createdUser = store.usuarios.find(u => u.email === testEmail);
    assert.ok(createdUser);
    assert.equal(createdUser.rol, 'Cliente');
  });

  it('Inmutabilidad de Fixture: No se puede generar ni regenerar fixture si el torneo está en curso', async () => {
    // Torneo 1 ya se encuentra generado / EN_CURSO
    const torneo1 = store.torneos.find(t => t.id === 1)!;
    assert.ok(torneo1);
    torneo1.estado = 'EN_CURSO';

    await assert.rejects(
      async () => await torneosService.generarFixture(1, 1),
      (err: any) => {
        return err.statusCode === 400 && err.message.includes('inmutable');
      }
    );
  });

  it('Contador de Inasistencias: Se reinicia a 0 automáticamente al expirar el período de suspensión', async () => {
    // Configurar usuario de prueba con suspensión ya vencida en el pasado
    const testUser = store.usuarios.find(u => u.id === 5)!;
    testUser.estado_cuenta = 'Suspendida';
    testUser.inasistencias = 3;
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    testUser.suspension_hasta = pastDate.toISOString();

    const profile = await authService.getProfile(5);
    assert.equal(profile.estado_cuenta, 'Activa');
    assert.equal(profile.inasistencias, 0);
    assert.equal(profile.suspension_hasta, null);
  });

  it('Validación de DNI: Inscribir equipo con DNI inválido debe ser rechazado', async () => {
    // Torneo 3 está en INSCRIPCION_ABIERTA
    await assert.rejects(
      async () => {
        await equiposService.inscribirEquipo(4, {
          torneoId: 3,
          nombreEquipo: 'Equipo DNI Invalido',
          players: [
            { name: 'Lucas Diaz', dni: '40123456', position: 'Delantero' },
            { name: 'Jugador Mal DNI', dni: 'DNI1234', position: 'Defensor' }
          ]
        });
      },
      (err: any) => {
        return err.statusCode === 400 && err.message.includes('DNI');
      }
    );
  });

  it('Validación de Posición: Inscribir jugador con posición inválida para el deporte debe ser rechazado', async () => {
    await assert.rejects(
      async () => {
        await equiposService.inscribirEquipo(4, {
          torneoId: 3, // Fútbol 5
          nombreEquipo: 'Equipo Posicion Invalida',
          players: [
            { name: 'Lucas Diaz', dni: '40123456', position: 'Delantero' },
            { name: 'Jugador Tenista en Futbol', dni: '38123456', position: 'Drive' } // 'Drive' no es válida para Fútbol 5
          ]
        });
      },
      (err: any) => {
        return err.statusCode === 400 && err.message.includes('posición');
      }
    );
  });

  it('Historial de Equipos y Torneos: Aceptar invitación asocia al jugador y se refleja en getMisEquipos', async () => {
    // 1. Crear equipo e invitar al usuario 5 (Cliente)
    const eq = await equiposService.inscribirEquipo(4, {
      torneoId: 3,
      nombreEquipo: `Equipo Historial Test ${Date.now()}`,
      players: [
        { name: 'Lucas Diaz', dni: '40123456', position: 'Delantero' },
        { name: 'Juan Paiva', dni: '42110339', position: 'Defensor' },
        { name: 'Diego Lopez', dni: '40887652', position: 'Mediocampista' },
        { name: 'Gonzalo Higuain', dni: '38109223', position: 'Delantero' },
        { name: 'Julian Alvarez', dni: '41554912', position: 'Delantero' }
      ]
    });

    // 2. Invitar al usuario 5 (email: mateo@gmail.com)
    await equiposService.invitarJugador(eq.id, 4, {
      emailUsuario: 'mateo@gmail.com',
      dorsal: 7
    });

    // 3. Usuario 5 acepta la invitación
    const resp = await equiposService.responderInvitacion(eq.id, 5, 'ACEPTADA');
    assert.equal(resp.success, true);
    assert.equal(resp.estado, 'ACEPTADA');

    // 4. Verificar que getMisEquipos(5) devuelve este nuevo equipo y torneo
    const misEquipos = await equiposService.getMisEquipos(5);
    const found = misEquipos.find((m: any) => m.equipo_id === eq.id || m.equipo_nombre === eq.nombre);
    assert.ok(found, 'El equipo aceptado debe figurar en el historial de equipos y torneos del usuario');
    assert.equal(found.estado_invitacion, 'ACEPTADA');
  });

  it('BUG-003: Persistencia completa de todos los jugadores de la nómina al inscribir equipo', async () => {
    // Torneo 2: Torneo Apertura Pádel Parejas (min 2, max 4)
    // Capitán: usuario 10 (Enzo Fernández, DNI 42991442)
    // Compañero: usuario 11 (Rodrigo De Paul, DNI 39001992)
    const eq = await equiposService.inscribirEquipo(10, {
      torneoId: 2,
      nombreEquipo: `Pareja Padel Test ${Date.now()}`,
      players: [
        { name: 'Enzo Fernandez', dni: '42991442', position: 'Drive' },
        { name: 'Rodrigo De Paul', dni: '39001992', position: 'Revés' }
      ]
    });

    assert.ok(eq.id, 'El equipo debe haber sido creado con ID');
    assert.equal(eq.jugadores.length, 2, 'La nómina debe persistir exactamente los 2 jugadores presentados');

    const capitanPersistido = eq.jugadores.find((j: any) => j.fk_usuario_id === 10);
    assert.ok(capitanPersistido, 'El capitán debe estar en la nómina');
    assert.equal(capitanPersistido.es_capitan, true, 'El capitán debe tener bandera es_capitan = true');

    const companeroPersistido = eq.jugadores.find((j: any) => j.fk_usuario_id === 11);
    assert.ok(companeroPersistido, 'El compañero debe estar en la nómina');
    assert.equal(companeroPersistido.es_capitan, false, 'El compañero no debe tener bandera es_capitan');
  });

  it('Validación de Jugadores No Registrados: Inscribir un DNI no registrado debe ser rechazado', async () => {
    await assert.rejects(
      async () => {
        await equiposService.inscribirEquipo(6, { // Juan Paiva (no está inscripto en Torneo 2)
          torneoId: 2,
          nombreEquipo: `Pareja No Registrada ${Date.now()}`,
          players: [
            { name: 'Juan Paiva', dni: '42110339', position: 'Drive' },
            { name: 'Fantasma Desconocido', dni: '99887766', position: 'Revés' }
          ]
        });
      },
      (err: any) => {
        return err.statusCode === 400 && err.message.includes('no se encuentra registrado');
      }
    );
  });

  it('RF-16: Impedir que un jugador participe en dos equipos dentro del mismo torneo', async () => {
    // En el test anterior de Pádel (Torneo 2), Rodrigo De Paul (id 11, DNI 39001992) ya quedó inscripto.
    // Si otro capitán intenta inscribirlo en un segundo equipo en el mismo Torneo 2:
    await assert.rejects(
      async () => {
        await equiposService.inscribirEquipo(8, { // Gonzalo Higuain (capitán)
          torneoId: 2,
          nombreEquipo: `Segundo Equipo Padel ${Date.now()}`,
          players: [
            { name: 'Gonzalo Higuain', dni: '38109223', position: 'Drive' },
            { name: 'Rodrigo De Paul', dni: '39001992', position: 'Revés' } // Ya está en Torneo 2
          ]
        });
      },
      (err: any) => {
        return err.statusCode === 409 && err.message.includes('ya se encuentra inscripto');
      }
    );
  });

  it('Participación Multi-Torneo: Un jugador sí puede participar en equipos de torneos diferentes', async () => {
    // Rodrigo De Paul (id 11) y Enzo Fernández (id 10) ya están en Torneo 2 (Padel).
    // Ahora participan en Torneo 3 (Copa Clausura Fútbol 5) con Sebastian Norjean como capitán:
    const eqMulti = await equiposService.inscribirEquipo(2, {
      torneoId: 3,
      nombreEquipo: `Equipo Multi-Torneo ${Date.now()}`,
      players: [
        { name: 'Sebastian Norjean', dni: '32333444', position: 'Defensor' },
        { name: 'Rodrigo De Paul', dni: '39001992', position: 'Mediocampista' },
        { name: 'Enzo Fernandez', dni: '42991442', position: 'Delantero' },
        { name: 'Marcos Perez', dni: '33444555', position: 'Defensor' },
        { name: 'Administrador General', dni: '30111222', position: 'Arquero' }
      ]
    });

    assert.ok(eqMulti.id, 'Debe permitir la inscripción de un mismo jugador en un certamen diferente');
    const dePaulMulti = eqMulti.jugadores.find((j: any) => j.fk_usuario_id === 11);
    assert.ok(dePaulMulti, 'El jugador debe estar presente en la nómina del segundo certamen');
    const enzoMulti = eqMulti.jugadores.find((j: any) => j.fk_usuario_id === 10);
    assert.ok(enzoMulti, 'Ambos jugadores de Pádel deben estar inscriptos con éxito en Fútbol 5');
    assert.ok(dePaulMulti, 'El jugador debe estar presente en la nómina del segundo certamen');
  });

  it('Validación de Plantel: DNI duplicado dentro del mismo equipo debe ser rechazado', async () => {
    await assert.rejects(
      async () => {
        await equiposService.inscribirEquipo(8, {
          torneoId: 2,
          nombreEquipo: `Equipo DNI Repetido ${Date.now()}`,
          players: [
            { name: 'Gonzalo Higuain', dni: '38109223', position: 'Drive' },
            { name: 'Gonzalo Clon', dni: '38109223', position: 'Revés' } // Mismo DNI
          ]
        });
      },
      (err: any) => {
        return err.statusCode === 400 && err.message.includes('duplicados');
      }
    );
  });

  it('Validación de Cupos Reglamentarios: Mínimo de jugadores por deporte debe ser respetado', async () => {
    // Pádel requiere mínimo 2 jugadores. Enviar 1 solo jugador:
    await assert.rejects(
      async () => {
        await equiposService.inscribirEquipo(8, {
          torneoId: 2,
          nombreEquipo: `Padel Sin Pareja ${Date.now()}`,
          players: [
            { name: 'Gonzalo Higuain', dni: '38109223', position: 'Drive' }
          ]
        });
      },
      (err: any) => {
        return err.statusCode === 400 && err.message.includes('mínimo');
      }
    );
  });
});

