export interface UsuarioModel {
  id: number;
  nombre: string;
  email: string;
  contrasena_hash: string;
  rol: 'Cliente' | 'Administrador' | 'Arbitro';
  inasistencias: number;
  estado_cuenta: 'Activa' | 'Suspendida' | 'Inactiva';
  suspension_hasta: string | null;
  telefono?: string;
  created_at: string;
}

export interface CanchaModel {
  id: number;
  nombre: string;
  deporte: 'Futbol 5' | 'Futbol 8' | 'Futbol 11' | 'Tenis' | 'Padel';
  superficie: string;
  techada: boolean;
  iluminacion: boolean;
  precio_hora: number;
  activa: boolean;
}

export interface ReservaModel {
  id: number;
  fk_usuario_id: number;
  fk_cancha_id: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm:ss
  monto_total: number;
  monto_sena: number;
  sena_abonada: boolean;
  estado: 'CONFIRMADA' | 'CANCELADA' | 'INASISTENCIA' | 'FINALIZADA';
  devolucion_sena: boolean | null;
  asistencia_confirmada: boolean | null;
  notas_cancelacion?: string;
  created_at: string;
}

export interface TorneoModel {
  id: number;
  nombre: string;
  deporte: 'Futbol 5' | 'Futbol 8' | 'Futbol 11' | 'Tenis' | 'Padel';
  costo_inscripcion: number;
  valor_partido: number;
  max_equipos: number;
  min_jugadores_equipo: number;
  max_jugadores_equipo: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: 'INSCRIPCION_ABIERTA' | 'EN_CURSO' | 'FINALIZADO';
  reglamento?: string;
}

export interface EquipoModel {
  id: number;
  fk_torneo_id: number;
  fk_capitan_id: number;
  nombre: string;
  puntos: number;
  partidos_jugados: number;
  partidos_ganados: number;
  partidos_empatados: number;
  partidos_perdidos: number;
  goles_favor: number;
  goles_contra: number;
  diferencia_goles: number;
  inscripcion_pagada: boolean;
}

export interface EquipoJugadorModel {
  fk_equipo_id: number;
  fk_usuario_id: number;
  dorsal: number | null;
  es_capitan: boolean;
  estado_invitacion: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';
  fecha_alta: string;
  fecha_respuesta?: string | null;
}

export interface PartidoModel {
  id: number;
  fk_torneo_id: number;
  fk_cancha_id: number;
  fk_equipo_local_id: number;
  fk_equipo_visitante_id: number | null; // null si Fecha Libre
  fk_arbitro_id: number | null;
  numero_fecha: number;
  fecha: string;
  hora: string;
  estado: 'PROGRAMADO' | 'DISPUTADO' | 'SUSPENDIDO' | 'REPROGRAMADO';
  goles_local: number | null;
  goles_visitante: number | null;
  observaciones: string | null;
}

export interface SancionModel {
  id: number;
  fk_usuario_id: number;
  fk_partido_id: number | null;
  tipo_sancion: string;
  descripcion: string;
  fecha_sancion: string;
  fk_creado_por_id: number;
}

export interface ListaEsperaModel {
  id: number;
  fk_usuario_id: number;
  fk_cancha_id: number;
  fecha: string;
  hora: string;
  estado: 'PENDIENTE' | 'NOTIFICADO' | 'CANCELADO' | 'ASIGNADO';
}

export interface NotificacionModel {
  id: number;
  fk_usuario_id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  created_at: string;
}

export interface AuditLogModel {
  id: number;
  fk_usuario_id: number;
  accion: string;
  entidad_afectada: string;
  entidad_id: number | null;
  detalles: string | null;
  ip_address: string | null;
  created_at: string;
}

export class InMemoryStore {
  usuarios: UsuarioModel[] = [
    {
      id: 1,
      nombre: 'Administrador General',
      email: 'admin@complejoub.com',
      contrasena_hash: '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a',
      rol: 'Administrador',
      inasistencias: 0,
      estado_cuenta: 'Activa',
      suspension_hasta: null,
      telefono: '+54 11 4567-8901',
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      nombre: 'Sebastian Norjean (Árbitro)',
      email: 'arbitro@complejoub.com',
      contrasena_hash: '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a',
      rol: 'Arbitro',
      inasistencias: 0,
      estado_cuenta: 'Activa',
      suspension_hasta: null,
      telefono: '+54 11 5555-1122',
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      nombre: 'Marcos Perez del Cerro',
      email: 'mperez@complejoub.com',
      contrasena_hash: '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a',
      rol: 'Arbitro',
      inasistencias: 0,
      estado_cuenta: 'Activa',
      suspension_hasta: null,
      telefono: '+54 11 5555-3344',
      created_at: new Date().toISOString(),
    },
    {
      id: 4,
      nombre: 'Lucas Díaz (Cliente / Capitán)',
      email: 'lucas@gmail.com',
      contrasena_hash: '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a',
      rol: 'Cliente',
      inasistencias: 0,
      estado_cuenta: 'Activa',
      suspension_hasta: null,
      telefono: '+54 11 9876-5432',
      created_at: new Date().toISOString(),
    },
    {
      id: 5,
      nombre: 'Mateo Fernández',
      email: 'mateo@gmail.com',
      contrasena_hash: '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a',
      rol: 'Cliente',
      inasistencias: 1,
      estado_cuenta: 'Activa',
      suspension_hasta: null,
      telefono: '+54 11 9876-5433',
      created_at: new Date().toISOString(),
    },
    {
      id: 6,
      nombre: 'Juan Paiva',
      email: 'juan@gmail.com',
      contrasena_hash: '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a',
      rol: 'Cliente',
      inasistencias: 0,
      estado_cuenta: 'Activa',
      suspension_hasta: null,
      telefono: '+54 11 9876-5434',
      created_at: new Date().toISOString(),
    },
    {
      id: 7,
      nombre: 'Diego López',
      email: 'diego@gmail.com',
      contrasena_hash: '$2b$10$wT8m9LpB19nQ1dK7Rqm8I.xY7yq6kZp.cT0yRk5xM8x7J5Yn6zK9a',
      rol: 'Cliente',
      inasistencias: 0,
      estado_cuenta: 'Activa',
      suspension_hasta: null,
      telefono: '+54 11 9876-5435',
      created_at: new Date().toISOString(),
    },
  ];

  canchas: CanchaModel[] = [
    { id: 1, nombre: 'Cancha 1 (Fútbol 5)', deporte: 'Futbol 5', superficie: 'Césped Sintético Pro', techada: true, iluminacion: true, precio_hora: 18000, activa: true },
    { id: 2, nombre: 'Cancha 2 (Fútbol 5)', deporte: 'Futbol 5', superficie: 'Césped Sintético', techada: false, iluminacion: true, precio_hora: 16000, activa: true },
    { id: 3, nombre: 'Cancha 3 (Fútbol 8)', deporte: 'Futbol 8', superficie: 'Césped Sintético Premium', techada: false, iluminacion: true, precio_hora: 25000, activa: true },
    { id: 4, nombre: 'Cancha 4 (Fútbol 11)', deporte: 'Futbol 11', superficie: 'Césped Natural AFA', techada: false, iluminacion: true, precio_hora: 38000, activa: true },
    { id: 5, nombre: 'Cancha Pádel A', deporte: 'Padel', superficie: 'Cristal Panorámico WPT', techada: false, iluminacion: true, precio_hora: 14000, activa: true },
    { id: 6, nombre: 'Cancha Pádel B (Techada)', deporte: 'Padel', superficie: 'Cristal Panorámico WPT', techada: true, iluminacion: true, precio_hora: 16000, activa: true },
    { id: 7, nombre: 'Cancha Tenis 1', deporte: 'Tenis', superficie: 'Polvo de Ladrillo', techada: false, iluminacion: true, precio_hora: 12000, activa: true },
    { id: 8, nombre: 'Cancha Tenis 2', deporte: 'Tenis', superficie: 'Rápida / Cemento', techada: false, iluminacion: true, precio_hora: 11000, activa: true },
  ];

  reservas: ReservaModel[] = [
    { id: 1, fk_usuario_id: 4, fk_cancha_id: 1, fecha: new Date().toISOString().split('T')[0], hora: '19:00:00', monto_total: 18000, monto_sena: 5400, sena_abonada: true, estado: 'CONFIRMADA', devolucion_sena: null, asistencia_confirmada: null, created_at: new Date().toISOString() },
    { id: 2, fk_usuario_id: 5, fk_cancha_id: 1, fecha: new Date().toISOString().split('T')[0], hora: '20:00:00', monto_total: 18000, monto_sena: 5400, sena_abonada: true, estado: 'CONFIRMADA', devolucion_sena: null, asistencia_confirmada: null, created_at: new Date().toISOString() },
    { id: 3, fk_usuario_id: 6, fk_cancha_id: 2, fecha: new Date().toISOString().split('T')[0], hora: '21:00:00', monto_total: 16000, monto_sena: 4800, sena_abonada: true, estado: 'CONFIRMADA', devolucion_sena: null, asistencia_confirmada: null, created_at: new Date().toISOString() },
    { id: 4, fk_usuario_id: 4, fk_cancha_id: 5, fecha: new Date().toISOString().split('T')[0], hora: '18:00:00', monto_total: 14000, monto_sena: 4200, sena_abonada: true, estado: 'CONFIRMADA', devolucion_sena: null, asistencia_confirmada: null, created_at: new Date().toISOString() },
  ];

  torneos: TorneoModel[] = [
    {
      id: 1,
      nombre: 'Copa Verano - Fútbol 5',
      deporte: 'Futbol 5',
      costo_inscripcion: 50000,
      valor_partido: 8000,
      max_equipos: 6,
      min_jugadores_equipo: 5,
      max_jugadores_equipo: 10,
      fecha_inicio: '2026-10-01',
      fecha_fin: '2026-11-15',
      estado: 'EN_CURSO',
      reglamento: 'Modalidad liga todos contra todos. Puntos: 3 victoria, 1 empate, 0 derrota.',
    },
    {
      id: 2,
      nombre: 'Torneo Apertura Pádel Parejas',
      deporte: 'Padel',
      costo_inscripcion: 30000,
      valor_partido: 6000,
      max_equipos: 8,
      min_jugadores_equipo: 2,
      max_jugadores_equipo: 4,
      fecha_inicio: '2026-11-01',
      fecha_fin: '2026-12-10',
      estado: 'INSCRIPCION_ABIERTA',
      reglamento: 'Partidos al mejor de 3 sets.',
    },
  ];

  equipos: EquipoModel[] = [
    { id: 1, fk_torneo_id: 1, fk_capitan_id: 4, nombre: 'Los Galácticos FC', puntos: 9, partidos_jugados: 3, partidos_ganados: 3, partidos_empatados: 0, partidos_perdidos: 0, goles_favor: 14, goles_contra: 4, diferencia_goles: 10, inscripcion_pagada: true },
    { id: 2, fk_torneo_id: 1, fk_capitan_id: 5, nombre: 'La Maquinita', puntos: 6, partidos_jugados: 3, partidos_ganados: 2, partidos_empatados: 0, partidos_perdidos: 1, goles_favor: 11, goles_contra: 7, diferencia_goles: 4, inscripcion_pagada: true },
    { id: 3, fk_torneo_id: 1, fk_capitan_id: 6, nombre: 'Deportivo Rayo', puntos: 3, partidos_jugados: 3, partidos_ganados: 1, partidos_empatados: 0, partidos_perdidos: 2, goles_favor: 8, goles_contra: 10, diferencia_goles: -2, inscripcion_pagada: true },
    { id: 4, fk_torneo_id: 1, fk_capitan_id: 7, nombre: 'Atlético Belgrano', puntos: 0, partidos_jugados: 3, partidos_ganados: 0, partidos_empatados: 0, partidos_perdidos: 3, goles_favor: 5, goles_contra: 17, diferencia_goles: -12, inscripcion_pagada: true },
  ];

  equipoJugadores: EquipoJugadorModel[] = [
    { fk_equipo_id: 1, fk_usuario_id: 4, dorsal: 10, es_capitan: true, estado_invitacion: 'ACEPTADA', fecha_alta: new Date().toISOString() },
    { fk_equipo_id: 2, fk_usuario_id: 5, dorsal: 10, es_capitan: true, estado_invitacion: 'ACEPTADA', fecha_alta: new Date().toISOString() },
    { fk_equipo_id: 3, fk_usuario_id: 6, dorsal: 1, es_capitan: true, estado_invitacion: 'ACEPTADA', fecha_alta: new Date().toISOString() },
    { fk_equipo_id: 4, fk_usuario_id: 7, dorsal: 10, es_capitan: true, estado_invitacion: 'ACEPTADA', fecha_alta: new Date().toISOString() },
  ];

  partidos: PartidoModel[] = [
    { id: 1, fk_torneo_id: 1, fk_cancha_id: 1, fk_equipo_local_id: 1, fk_equipo_visitante_id: 2, fk_arbitro_id: 2, numero_fecha: 1, fecha: '2026-10-03', hora: '19:00:00', estado: 'DISPUTADO', goles_local: 4, goles_visitante: 2, observaciones: 'Sin incidentes.' },
    { id: 2, fk_torneo_id: 1, fk_cancha_id: 2, fk_equipo_local_id: 3, fk_equipo_visitante_id: 4, fk_arbitro_id: 3, numero_fecha: 1, fecha: '2026-10-03', hora: '20:00:00', estado: 'DISPUTADO', goles_local: 5, goles_visitante: 3, observaciones: 'Buen partido.' },
    { id: 3, fk_torneo_id: 1, fk_cancha_id: 1, fk_equipo_local_id: 1, fk_equipo_visitante_id: 3, fk_arbitro_id: 2, numero_fecha: 2, fecha: '2026-10-10', hora: '19:00:00', estado: 'DISPUTADO', goles_local: 6, goles_visitante: 1, observaciones: 'Goleada clara.' },
    { id: 4, fk_torneo_id: 1, fk_cancha_id: 2, fk_equipo_local_id: 2, fk_equipo_visitante_id: 4, fk_arbitro_id: 3, numero_fecha: 2, fecha: '2026-10-10', hora: '20:00:00', estado: 'DISPUTADO', goles_local: 5, goles_visitante: 1, observaciones: 'Victoria contundente.' },
    { id: 5, fk_torneo_id: 1, fk_cancha_id: 1, fk_equipo_local_id: 1, fk_equipo_visitante_id: 4, fk_arbitro_id: 2, numero_fecha: 3, fecha: '2026-10-17', hora: '19:00:00', estado: 'DISPUTADO', goles_local: 4, goles_visitante: 1, observaciones: 'Buen trámite.' },
    { id: 6, fk_torneo_id: 1, fk_cancha_id: 2, fk_equipo_local_id: 2, fk_equipo_visitante_id: 3, fk_arbitro_id: 3, numero_fecha: 3, fecha: '2026-10-17', hora: '20:00:00', estado: 'DISPUTADO', goles_local: 4, goles_visitante: 2, observaciones: 'Partido parejo.' },
    { id: 7, fk_torneo_id: 1, fk_cancha_id: 1, fk_equipo_local_id: 2, fk_equipo_visitante_id: 1, fk_arbitro_id: 2, numero_fecha: 4, fecha: '2026-10-24', hora: '19:00:00', estado: 'PROGRAMADO', goles_local: null, goles_visitante: null, observaciones: 'Partido por la punta.' },
    { id: 8, fk_torneo_id: 1, fk_cancha_id: 2, fk_equipo_local_id: 4, fk_equipo_visitante_id: 3, fk_arbitro_id: 3, numero_fecha: 4, fecha: '2026-10-24', hora: '20:00:00', estado: 'PROGRAMADO', goles_local: null, goles_visitante: null, observaciones: null },
  ];

  sanciones: SancionModel[] = [
    { id: 1, fk_usuario_id: 7, fk_partido_id: 2, tipo_sancion: 'Tarjeta Amarilla', descripcion: 'Falta reiterada en mitad de cancha durante la Fecha 1.', fecha_sancion: '2026-10-03 20:35:00', fk_creado_por_id: 3 },
    { id: 2, fk_usuario_id: 6, fk_partido_id: 1, tipo_sancion: 'Tarjeta Amarilla', descripcion: 'Conducta antideportiva por demorar el juego.', fecha_sancion: '2026-10-03 19:40:00', fk_creado_por_id: 2 },
  ];

  listasEspera: ListaEsperaModel[] = [
    { id: 1, fk_usuario_id: 5, fk_cancha_id: 1, fecha: new Date().toISOString().split('T')[0], hora: '19:00:00', estado: 'PENDIENTE' },
  ];

  notificaciones: NotificacionModel[] = [
    { id: 1, fk_usuario_id: 4, titulo: 'Reserva Confirmada', mensaje: 'Tu turno para Cancha 1 a las 19:00 hs fue confirmado. Seña abonada 30%.', tipo: 'ReservaConfirmada', leida: false, created_at: new Date().toISOString() },
    { id: 2, fk_usuario_id: 2, titulo: 'Designación Arbitral', mensaje: 'Has sido designado para dirigir el partido Fecha 4 el Sábado 24 Oct.', tipo: 'DesignacionArbitral', leida: false, created_at: new Date().toISOString() },
  ];

  auditLogs: AuditLogModel[] = [
    { id: 1, fk_usuario_id: 1, accion: 'CREAR_TORNEO', entidad_afectada: 'torneo', entidad_id: 1, detalles: '{"nombre":"Copa Verano - Fútbol 5"}', ip_address: '127.0.0.1', created_at: new Date().toISOString() },
    { id: 2, fk_usuario_id: 1, accion: 'GENERAR_FIXTURE', entidad_afectada: 'partido', entidad_id: 1, detalles: '{"torneo_id":1,"fechas":4}', ip_address: '127.0.0.1', created_at: new Date().toISOString() },
  ];
}

export const store = new InMemoryStore();
