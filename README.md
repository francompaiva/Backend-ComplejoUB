# 🏟️ Complejo Deportivo UB — Backend API REST

API REST modular y de alto rendimiento para la gestión integral del **Complejo Deportivo UB** (Trabajo Práctico N° 1 - Universidad de Belgrano).

El sistema administra el ciclo de vida completo de alquileres de canchas (turnos de 1 hora, señas del 30%, políticas de cancelación y suspensiones por inasistencias), organización de torneos bajo modalidad liga Round-Robin, nóminas de equipos con restricción de jugador único, planillas arbitrales, sanciones disciplinarias y reportes de gestión.

---

## 🚀 Stack Tecnológico

* **Entorno de Ejecución:** [Node.js](https://nodejs.org/) (v20+ / ES Modules)
* **Lenguaje:** [TypeScript 5](https://www.typescriptlang.org/)
* **Framework Web:** [Express 4](https://expressjs.com/)
* **Base de Datos:** MySQL 8.0+ relacional con motor InnoDB (vía `mysql2/promise` con Connection Pooling)
* **Persistencia Dual (Fallback):** Store en memoria reactivo para desarrollo ágil y evaluación sin dependencias obligatorias
* **Seguridad y Autenticación:** JWT (JSON Web Tokens), Bcrypt (hashing de contraseñas), CORS, RBAC (Role-Based Access Control)
* **Testing:** Node.js Native Test Runner ejecutado con `tsx` para TypeScript sin etapa de compilación intermedia
* **Contenedores:** Docker & Docker Compose

---

## 📁 Arquitectura Modular del Proyecto

El código fuente sigue el patrón modular por dominio: cada funcionalidad agrupa sus rutas, controladores y servicios de negocio de forma desacoplada.

```
Backend-ComplejoUB/
├── database/                          # Scripts SQL DDL, DML y lógica procedural
│   ├── schema.sql                     # Creación de BD y 11 tablas relacionales con restricciones
│   ├── procedures_and_triggers.sql    # Procedimientos almacenados y triggers de negocio
│   └── seeds.sql                      # Datos iniciales (usuarios, canchas, torneos y partidos)
├── src/
│   ├── server.ts                      # Configuración de Express, middlewares y arranque HTTP
│   ├── routes.ts                      # Router centralizado (montado bajo /api/v1)
│   ├── config/
│   │   ├── env.ts                     # Validación tipada de variables de entorno
│   │   ├── database.ts                # Pool de conexiones MySQL y detección de estado
│   │   └── in-memory-store.ts         # Base de datos en memoria para fallback y tests
│   ├── middlewares/
│   │   ├── auth.middleware.ts         # Verificación JWT y autorización por roles (RBAC)
│   │   └── error.middleware.ts        # Manejador centralizado de errores y clase AppError
│   ├── modules/
│   │   ├── auth/                      # Registro, login y perfil autenticado
│   │   ├── canchas/                   # ABM de canchas, tarifas y disponibilidad de turnos
│   │   ├── reservas/                  # Turnos de 1h, seña 30%, cancelaciones e inasistencias
│   │   ├── torneos/                   # Creación de torneos y fixture Round-Robin automático
│   │   ├── partidos/                  # Planillas arbitrales, actas y tabla de posiciones
│   │   ├── equipos/                   # Nómina de jugadores y regla de jugador único (RF-16)
│   │   ├── lista-espera/              # Cola reactiva de turnos solicitados
│   │   ├── sanciones/                 # Tarjetas amarillas, rojas y suspensiones
│   │   ├── notificaciones/            # Notificaciones internas del sistema
│   │   └── reportes/                  # Auditoría, facturación y estadísticas de ocupación
│   └── __tests__/
│       └── business-rules.test.ts     # Pruebas automatizadas de reglas de negocio (RF)
├── .env.example                       # Plantilla de variables de entorno
├── docker-compose.yml                 # Orquestación de contenedores (servicio MySQL 'db')
├── package.json                       # Scripts y dependencias del proyecto
└── tsconfig.json                      # Configuración del compilador TypeScript
```

---

## ⚡ Persistencia Híbrida Inteligente (Dual-Mode)

Una de las principales fortalezas arquitectónicas del proyecto para su evaluación:
1. **Modo MySQL 8 (Producción / Integración):** Si el motor MySQL está corriendo, el backend se conecta automáticamente mediante un pool de conexiones y delega integridad referencial, triggers y stored procedures al motor relacional.
2. **Modo En-Memoria (Demostración / Testing):** Si la base de datos no está disponible o se corre en un entorno sin MySQL instalado, el backend **no falla ni se detiene**; activa de manera transparente el almacén en memoria ([src/config/in-memory-store.ts](file:///c:/Users/seba/Backend-ComplejoUB/src/config/in-memory-store.ts)) con los datos precargados idénticos a las semillas oficiales.

---

## 🛠️ Instalación y Ejecución Paso a Paso

### 1. Clonar y Configurar Variables de Entorno

Crear el archivo `.env` a partir de la plantilla:

**En Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**En Windows (CMD):**
```cmd
copy .env.example .env
```

**En Linux / macOS:**
```bash
cp .env.example .env
```

Valores por defecto preconfigurados en `.env`:
```ini
PORT=4000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=complejo_deportivo
JWT_SECRET=super_secret_jwt_key_complejo_deportivo_ub_2026
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

---

### 2. Base de Datos MySQL (3 Opciones)

#### Opción A — Con Docker (Recomendada):
Levantar únicamente el contenedor de MySQL con la base de datos y scripts precargados:
```bash
docker compose up -d db
```

#### Opción B — MySQL Local ya instalado:
Importar los scripts en orden en tu motor MySQL local:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seeds.sql
mysql -u root -p < database/procedures_and_triggers.sql
```

#### Opción C — Sin Base de Datos (Evaluación Inmediata):
No requiere ejecutar ningún comando de base de datos. El servidor iniciará automáticamente en **modo en-memoria**.

---

### 3. Instalar Dependencias y Levantar la API

```bash
# 1. Instalar dependencias
npm install

# 2. Modo desarrollo con recarga en caliente (hot-reload)
npm run dev

# 3. Compilar a JavaScript para producción
npm run build

# 4. Iniciar en modo producción
npm start
```

* **URL Base de la API:** `http://localhost:4000/api/v1`
* **Health Check Endpoint:** `http://localhost:4000/api/v1/health`

---

## 🧪 Pruebas Automatizadas (Tests)

El proyecto cuenta con una suite de pruebas unitarias y de integración que validan el cumplimiento riguroso de las reglas de negocio de la cátedra:

```bash
npm test
```

### Reglas Verificadas en los Tests:
* **RF-03:** Cálculo exacto del 30% del costo total como seña obligatoria al reservar un turno de 1 hora.
* **RF-04:** Cancelación con más de 24 horas de anticipación reintegra la seña; con 24 horas o menos la seña se retiene.
* **RF-05:** Acumulación de 3 inasistencias en reservas suspende automáticamente la cuenta del usuario por 14 días.
* **RF-07:** Eliminación controlada de torneos por administradores con limpieza de nóminas y fixture.
* **RF-09:** Algoritmo Round-Robin para torneos: soporte para cantidad impar de equipos asignando de manera rotativa la fecha libre (`canchaId: null`, `visitanteId: null`).
* **RF-11:** Criterios oficiales de desempate en tabla de posiciones ordenando por: 1° Puntos, 2° Diferencia de Gol (DG) y 3° Goles a Favor (GF).

---

## 🔑 Credenciales de Prueba (Seeds)

Todas las cuentas de prueba tienen asignada la contraseña: **`password123`**

| Rol | Correo Electrónico | Descripción de Uso |
| :--- | :--- | :--- |
| **Administrador** | `admin@complejoub.com` | Gestión total de canchas, creación de torneos, asignación de árbitros y reportes |
| **Árbitro** | `arbitro@complejoub.com` | Visualización de partidos asignados, confección de planillas arbitrales y actas |
| **Cliente / Capitán** | `lucas@gmail.com` | Reserva de canchas individuales, capitán del equipo "Los Galácticos" en torneos |
| **Cliente** | `mateo@gmail.com` | Jugador con 1 inasistencia previa para pruebas |
| **Cliente Suspendido** | `sancionado@gmail.com` | Usuario con 3 inasistencias y estado de cuenta suspendido por 14 días |

---

## 📡 Principales Endpoints de la API (`/api/v1`)

### 🔐 Autenticación (`/auth`)
* `POST /auth/register` — Registro de nuevos clientes.
* `POST /auth/login` — Autenticación con credenciales; retorna token JWT y datos del usuario.
* `GET  /auth/me` — Datos del usuario autenticado en sesión (`Bearer Token`).

### ⚽ Canchas (`/canchas`)
* `GET  /canchas` — Catálogo de canchas activas (filtrable por deporte: `Futbol 5`, `Futbol 8`, `Futbol 11`, `Tenis`, `Padel`).
* `GET  /canchas/:id/disponibilidad?fecha=YYYY-MM-DD` — Turnos libres y ocupados entre las 08:00 y las 23:00 (valida bloqueo por torneos en fin de semana, **RF-06**).
* `POST /canchas` — Creación de nuevas canchas *(Solo Administrador)*.

### 📅 Reservas (`/reservas`)
* `POST /reservas` — Solicitud de turno individual (calcula automáticamente seña del 30%).
* `POST /reservas/:id/cancelar` — Cancelación de reserva; evalúa plazo > 24hs para reembolso de seña.
* `POST /reservas/:id/inasistencia` — Registro de inasistencia; aplica suspensión de 14 días al llegar a 3 faltas.
* `GET  /reservas/mis-reservas` — Historial de reservas del cliente autenticado.

### 🏆 Torneos y Fixture (`/torneos`)
* `GET  /torneos` — Lista de torneos con estado y aranceles.
* `POST /torneos` — Creación de nuevo torneo *(Solo Administrador)*.
* `POST /torneos/:id/generar-fixture` — Generación algorítmica del fixture Round-Robin completo programando partidos en fines de semana y fechas libres rotativas.
* `GET  /torneos/:id/tabla-posiciones` — Tabla de posiciones actualizada en tiempo real según marcadores.

### 📋 Partidos y Planilla Arbitral (`/partidos`)
* `GET  /partidos?torneoId=1` — Cronograma de partidos del torneo con filtros por fecha.
* `PUT  /partidos/:id/resultado` — Carga oficial del acta arbitral (goles local/visitante, observaciones) *(Árbitro / Administrador)*.
* `PUT  /partidos/:id/reprogramar` — Reprogramación de cancha, fecha u horario *(Solo Administrador)*.

### 👥 Equipos (`/equipos`)
* `POST /equipos` — Inscripción de equipo a torneo.
* `POST /equipos/:id/jugadores` — Incorporación de jugador validando la regla de jugador único por torneo (**RF-16**).

### 📊 Reportes y Auditoría (`/reportes`)
* `GET  /reportes/dashboard` — Resumen ejecutivo de ingresos por señas/turnos, tasa de inasistencias y ocupación de canchas *(Solo Administrador)*.
* `GET  /reportes/auditoria` — Trazabilidad de operaciones críticas en el sistema.

---

## 🛡️ Claves Técnicas para la Defensa del Trabajo Práctico

1. **¿Cómo se evitan solapamientos de turnos en las canchas?**  
   Tanto a nivel base de datos con la restricción `CONSTRAINT uq_partido_cancha_fecha_hora UNIQUE (fk_cancha_id, fecha, hora)` como a nivel de aplicación en los servicios de reservas y torneos, el sistema comprueba la disponibilidad horaria antes de confirmar cualquier turno.
2. **¿Cómo se resuelve el fixture con cantidad impar de equipos?**  
   El método `generarFixture` de [src/modules/torneos/torneos.service.ts](file:///c:/Users/seba/Backend-ComplejoUB/src/modules/torneos/torneos.service.ts) implementa el algoritmo Round-Robin clásico con un equipo ficticio ("dummy/bye"). En cada jornada, el equipo emparejado con dicho elemento obtiene **Fecha Libre**, generándose el registro con `canchaId: null` y `visitanteId: null` para no bloquear canchas físicas indebidamente.
3. **¿Cómo se mantiene actualizada la tabla de posiciones?**  
   En MySQL, los triggers `trg_actualizar_posiciones_after_insert` y `trg_actualizar_posiciones_after_update` ejecutan el procedimiento almacenado `sp_actualizar_tabla_posiciones`. En el servicio en memoria, la función recalcula dinámicamente partidos jugados, ganados, empatados, perdidos, goles y puntos ante cada modificación de acta.
4. **¿Cómo se aplica la regla de jugador único por torneo?**  
   Al asociar un jugador a un equipo, se consulta si su `id_usuario` ya figura en la nómina de cualquier otro equipo inscripto en el mismo `id_torneo`. Si ya pertenece a otro equipo, se rechaza la operación arrojando un error `400 Bad Request` (o error `45000` vía trigger en MySQL).