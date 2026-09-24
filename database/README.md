# Módulo Base de Datos - Complejo Deportivo UB

Base de datos relacional para el sistema de gestión de reservas de canchas y torneos del Complejo Deportivo UB (Universidad de Belgrano), basada en la especificación técnica de la cátedra de Proyecto de Construcción de Software.

## Estructura del Módulo

- `schema.sql`: Script DDL para MySQL 8.0+ que crea la base de datos `complejo_deportivo_ub`, las 11 tablas relacionales, claves primarias numéricas BIGINT autoincrementales, claves foráneas con restricciones de integridad referencial, índices de rendimiento y constraints (`CHECK` y `UNIQUE`).
- `seeds.sql`: Datos maestros y de prueba listos para usar (usuarios con credenciales de prueba, canchas con precios y tipos, torneos en curso, equipos, nóminas, partidos programados y jugados con resultados, sanciones, notificaciones y logs de auditoría).
- `procedures_and_triggers.sql`: Procedimientos almacenados para cálculo y actualización automática de la tabla de posiciones (`sp_actualizar_tabla_posiciones`), penalización por 3 inasistencias consecutivas con suspensión por 14 días (`sp_registrar_inasistencia`), y cancelación con regla de reintegro de seña por anticipación > 24hs (`sp_cancelar_reserva`).

## Diagrama Entidad-Relación y Tablas

1. **`usuario`**: Cuentas, credenciales seguras (bcrypt hash), roles (`Cliente`, `Administrador`, `Arbitro`), contador de inasistencias y control de suspensión.
2. **`cancha`**: Terrenos de juego (`Futbol 5`, `Futbol 8`, `Futbol 11`, `Tenis`, `Padel`), precio fijo por hora, superficie y disponibilidad.
3. **`reserva`**: Turnos individuales de 1 hora, estado de seña (30% obligatorio), estado (`CONFIRMADA`, `CANCELADA`, `INASISTENCIA`, `FINALIZADA`) y regla de devolución.
4. **`lista_espera`**: Turnos ocupados solicitados por clientes para notificación reactiva ante liberaciones.
5. **`torneo`**: Competencias modalidad liga (todos contra todos), cupo de equipos, arancel de inscripción y valor por partido.
6. **`equipo`**: Equipos inscriptos con capitán y tabla de posiciones calculada (`puntos`, `PJ`, `PG`, `PE`, `PP`, `GF`, `GC`, `DG`).
7. **`equipo_jugador`**: Nómina de integrantes por equipo con estados de invitación (`PENDIENTE`, `ACEPTADA`, `RECHAZADA`), validando la restricción de un solo equipo por torneo.
8. **`partido`**: Fixture del torneo, asignación de cancha, fecha, horario, árbitro, estado (`PROGRAMADO`, `DISPUTADO`, `SUSPENDIDO`, `REPROGRAMADO`) y marcadores.
9. **`sancion`**: Registro disciplinario de tarjetas o inasistencias graves.
10. **`notificacion`**: Mensajería interna sobre confirmaciones, torneos y sanciones.
11. **`audit_log`**: Trazabilidad y auditoría de acciones administrativas críticas.

## Cómo ejecutar

### Con Docker Compose (Recomendado)
Desde la raíz del proyecto:
```bash
docker compose up -d db
```

### Directo en MySQL
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seeds.sql
mysql -u root -p < database/procedures_and_triggers.sql
```
