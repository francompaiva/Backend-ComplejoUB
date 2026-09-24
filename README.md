# 🏟️ Complejo Deportivo UB — Backend API REST

API REST modular para la gestión integral del **Complejo Deportivo UB** (Trabajo Práctico N° 1 - Universidad de Belgrano).

---

## 🚀 Stack Tecnológico

* **Entorno:** [Node.js](https://nodejs.org/) (ES Modules)
* **Lenguaje:** [TypeScript 5](https://www.typescriptlang.org/)
* **Framework:** [Express 4](https://expressjs.com/)
* **Base de Datos:** MySQL / PostgreSQL
* **Autenticación y Seguridad:** JWT (JSON Web Tokens), Bcrypt, CORS
* **Contenedores:** Docker & Docker Compose

---

## 📁 Arquitectura Modular

```
src/
├── app.ts                 # Configuración principal de Express, middlewares y rutas
├── server.ts              # Inicio del servidor HTTP y conexión DB
├── config/                # Variables de entorno y pool de base de datos
├── middlewares/           # Autenticación JWT y control de roles (RBAC)
└── modules/
    ├── auth/              # Registro, login y tokens JWT
    ├── canchas/           # ABM de canchas, superficies y tarifas por deporte
    ├── reservas/          # Turnos de 1h, seña del 30%, política cancelación >24h y lista de espera
    ├── torneos/           # Creación de torneos y fixture Round-Robin automático
    ├── partidos/          # Planilla arbitral, actas, estados y tabla de posiciones
    ├── equipos/           # Registro de equipos y validación de nómina
    ├── sanciones/         # Registro de tarjetas amarillas/rojas y suspensiones por inasistencias
    └── reportes/          # Métricas de facturación, uso y log de auditoría
```

---

## 🗄️ Base de Datos (`/database`)

Incluye los scripts SQL relacionales listos para ejecutar:
* `schema.sql`: Creación de tablas (`usuario`, `cancha`, `reserva`, `torneo`, `equipo`, `partido`, `sancion`, `notificacion`, `audit_log`, `lista_espera`).
* `procedures_and_triggers.sql`: Procedimientos almacenados para actualización automática de la tabla de posiciones, control de 3 inasistencias consecutivas y notificación de lista de espera.
* `seeds.sql`: Datos iniciales de canchas, torneos, usuarios de prueba y partidos.

---

## 🛠️ Instalación y Ejecución Local

### 1. Variables de Entorno
Copia el archivo de ejemplo:
```bash
cp .env.example .env
```
Y ajusta las credenciales de base de datos y puerto (`PORT=3000`).

### 2. Base de datos con Docker Compose (Opcional)
```bash
docker-compose up -d
```

### 3. Instalar Dependencias y Correr Servidor
```bash
# Instalar dependencias
npm install

# Modo desarrollo con auto-reload (tsx watch)
npm run dev

# Compilar para producción
npm run build

# Iniciar en producción
npm start
```

La API responderá en `http://localhost:3000/api`.