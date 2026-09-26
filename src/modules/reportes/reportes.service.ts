import { isDbConnected, getPool } from '../../config/database.js';
import { store } from '../../config/in-memory-store.js';

export class ReportesService {
  /**
   * RF-25: Reportes administrativos y métricas del complejo
   */
  async getDashboardMetrics() {
    const today = new Date().toISOString().split('T')[0];

    if (isDbConnected()) {
      const pool = getPool()!;

      // 1. Reservas de hoy
      const [resHoy]: any = await pool.query(
        'SELECT COUNT(*) as total, SUM(CASE WHEN estado = "CONFIRMADA" THEN 1 ELSE 0 END) as confirmadas FROM reserva WHERE fecha = ?',
        [today]
      );

      // 2. Ingresos acumulados (señas cobradas de reservas confirmadas)
      const [ingresos]: any = await pool.query(
        'SELECT SUM(monto_sena) as total_senas, SUM(monto_total) as volumen_total FROM reserva WHERE sena_abonada = true AND estado != "CANCELADA"'
      );

      // 3. Torneos activos y equipos
      const [torneos]: any = await pool.query(
        'SELECT COUNT(*) as activos FROM torneo WHERE estado = "EN_CURSO" OR estado = "INSCRIPCION_ABIERTA"'
      );

      // 4. Inasistencias totales
      const [inasistencias]: any = await pool.query(
        'SELECT COUNT(*) as total FROM reserva WHERE estado = "INASISTENCIA"'
      );

      // 5. Total de canchas y tasa de ocupación aproximada para hoy
      const [canchas]: any = await pool.query('SELECT COUNT(*) as total FROM cancha WHERE activa = true');
      const totalCanchas = canchas[0].total || 8;
      // 16 horas operativas por cancha (08:00 a 00:00) = total slots diarios
      const slotsPosibles = totalCanchas * 16;
      const confirmadasHoy = resHoy[0].confirmadas || 0;
      const tasaOcupacion = Math.round((confirmadasHoy / Math.max(1, slotsPosibles)) * 100);

      return {
        reservasHoy: confirmadasHoy,
        ingresosSenas: Number(ingresos[0].total_senas || 0),
        volumenTotal: Number(ingresos[0].volumen_total || 0),
        torneosActivos: torneos[0].activos || 0,
        inasistenciasTotales: inasistencias[0].total || 0,
        tasaOcupacionHoy: `${tasaOcupacion}%`,
        totalCanchasActivas: totalCanchas,
      };
    } else {
      const confirmadasHoy = store.reservas.filter(r => r.fecha === today && r.estado === 'CONFIRMADA').length;
      const ingresosSenas = store.reservas
        .filter(r => r.sena_abonada && r.estado !== 'CANCELADA')
        .reduce((acc, curr) => acc + curr.monto_sena, 0);
      const torneosActivos = store.torneos.filter(t => t.estado === 'EN_CURSO' || t.estado === 'INSCRIPCION_ABIERTA').length;
      const inasistencias = store.reservas.filter(r => r.estado === 'INASISTENCIA').length;
      const totalCanchas = store.canchas.filter(c => c.activa).length;
      const slotsPosibles = totalCanchas * 16;
      const tasaOcupacion = Math.round((confirmadasHoy / Math.max(1, slotsPosibles)) * 100);

      return {
        reservasHoy: confirmadasHoy,
        ingresosSenas,
        volumenTotal: ingresosSenas * 3.33,
        torneosActivos,
        inasistenciasTotales: inasistencias,
        tasaOcupacionHoy: `${tasaOcupacion}%`,
        totalCanchasActivas: totalCanchas,
      };
    }
  }

  /**
   * RF-26: Registro y consulta de auditoría
   */
  async getAuditLogs(limite = 50) {
    if (isDbConnected()) {
      const pool = getPool()!;
      const [rows] = await pool.query(
        `SELECT a.*, u.nombre as admin_nombre, u.email as admin_email
         FROM audit_log a
         JOIN usuario u ON a.fk_usuario_id = u.id
         ORDER BY a.created_at DESC
         LIMIT ?`,
        [limite]
      );
      return rows;
    } else {
      return store.auditLogs
        .map(a => {
          const u = store.usuarios.find(user => user.id === a.fk_usuario_id);
          return {
            ...a,
            admin_nombre: u?.nombre || 'Admin',
            admin_email: u?.email || '',
          };
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limite);
    }
  }
}

export const reportesService = new ReportesService();
