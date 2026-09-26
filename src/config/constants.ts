/**
 * Constantes Globales de Negocio - Complejo Deportivo UB
 * Convención: SCREAMING_SNAKE_CASE
 */

// Porcentaje de seña obligatorio para confirmar una reserva (RF-03: 30%)
export const PORCENTAJE_SENA_RESERVA = 0.3;

// Horas mínimas de antelación para cancelación con reintegro del 100% de la seña (RF-04: >24h)
export const HORAS_ANTICIPACION_CANCELACION_REINTEGRO = 24;

// Límite de inasistencias antes de suspender la cuenta del cliente (RF-05)
export const MAX_INASISTENCIAS_PERMITIDAS = 3;

// Duración de la suspensión por inasistencias reiteradas en días (RF-05: 2 semanas)
export const DIAS_SUSPENSION_INASISTENCIA = 14;

// Hora base de inicio para encuentros de torneos en fines de semana (RF-06, RF-09)
export const HORA_INICIO_PARTIDOS_TORNEO = 18;
