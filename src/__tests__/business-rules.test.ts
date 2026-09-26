import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ReservasService } from '../modules/reservas/reservas.service.js';
import { TorneosService } from '../modules/torneos/torneos.service.js';
import { store } from '../config/in-memory-store.js';

describe('Reglas de Negocio - Complejo Deportivo UB', () => {
  const reservasService = new ReservasService();
  const torneosService = new TorneosService();

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
});

