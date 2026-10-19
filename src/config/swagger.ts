export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Complejo Deportivo UB - API REST Oficial',
    version: '1.0.0',
    description: `
Documentación técnica e interactiva de la API REST del sistema de gestión para el **Complejo Deportivo UB**.

### Roles del Sistema y Control de Acceso (RBAC):
- **Cliente**: Registro público, reserva de turnos, capitanía/inscripción de equipos en torneos, visualización de fixtures y tablas de posiciones.
- **Árbitro**: Visualización de encuentros asignados, confección de planillas digitales de partido, registro de resultados oficiales y sanciones disciplinarias. *(Nota: Por reglamento deportivo, tiene bloqueada la inscripción y participación como jugador en torneos).*
- **Administrador**: Gestión operativa de canchas, supervisión general de reservas, confirmación de asistencias/inasistencias, creación y calendarización de torneos y fixtures, designación de árbitros y acceso al dashboard general.
- **Superadministrador**: Máxima jerarquía institucional. Acceso total a reportes de auditoría y gestión exclusiva del personal oficial (alta directa de administradores/árbitros con DNI, promociones y revocación de privilegios).

### Autenticación:
Para probar los endpoints protegidos, inicie sesión con \`POST /api/v1/auth/login\`, copie el token JWT obtenido y colóquelo en el botón **Authorize** superior en el formato: \`Bearer <token>\`.
    `,
    contact: {
      name: 'Cátedra Construcción de Software - Universidad de Belgrano',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Servidor API v1 (Producción / Local)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingrese el token JWT obtenido al iniciar sesión (ej: eyJhbGciOiJIUzI1Ni...)',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Descripción explicativa del error' },
              statusCode: { type: 'integer', example: 400 },
            },
          },
        },
      },
      RegisterDTO: {
        type: 'object',
        required: ['nombre', 'email', 'contrasena', 'dni'],
        properties: {
          nombre: { type: 'string', example: 'Lucas Díaz' },
          email: { type: 'string', format: 'email', example: 'lucas.diaz@ejemplo.com' },
          contrasena: { type: 'string', format: 'password', minLength: 6, example: 'SeguraPass_2026!' },
          dni: { type: 'string', pattern: '^\\d{7,8}$', example: '38999111', description: 'DNI numérico obligatorio de 7 u 8 dígitos' },
          telefono: { type: 'string', example: '+54 11 4567-8901' },
        },
      },
      VerificarCodigoDTO: {
        type: 'object',
        required: ['email', 'codigo'],
        properties: {
          email: { type: 'string', format: 'email', example: 'lucas.diaz@ejemplo.com' },
          codigo: { type: 'string', minLength: 6, maxLength: 6, example: '482910', description: 'Código OTP de 6 dígitos numéricos' },
        },
      },
      ReenviarCodigoDTO: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', example: 'lucas.diaz@ejemplo.com' },
        },
      },
      ActualizarDniDTO: {
        type: 'object',
        required: ['dni'],
        properties: {
          dni: { type: 'string', pattern: '^\\d{7,8}$', example: '38999111', description: 'Nuevo DNI de 7 u 8 dígitos' },
        },
      },
      LoginDTO: {
        type: 'object',
        required: ['email', 'contrasena'],
        properties: {
          email: { type: 'string', format: 'email', example: 'usuario@ejemplo.com' },
          contrasena: { type: 'string', format: 'password', example: 'Password123!' },
        },
      },
      CreateCanchaDTO: {
        type: 'object',
        required: ['nombre', 'deporte', 'precioHora'],
        properties: {
          nombre: { type: 'string', example: 'Cancha 5 - Padel Techada' },
          deporte: { type: 'string', enum: ['Futbol 5', 'Futbol 8', 'Futbol 11', 'Tenis', 'Padel'], example: 'Padel' },
          precioHora: { type: 'number', example: 12000 },
          techada: { type: 'boolean', example: true },
          activa: { type: 'boolean', example: true },
        },
      },
      CreateReservaDTO: {
        type: 'object',
        required: ['canchaId', 'fecha', 'hora'],
        properties: {
          canchaId: { type: 'integer', example: 1 },
          fecha: { type: 'string', format: 'date', example: '2026-10-25' },
          hora: { type: 'string', example: '18:00', description: 'Hora en punto formato HH:mm' },
          metodoPago: { type: 'string', enum: ['MERCADO_PAGO', 'EFECTIVO', 'TRANSFERENCIA'], default: 'MERCADO_PAGO' },
        },
      },
      CreateTorneoDTO: {
        type: 'object',
        required: ['nombre', 'deporte', 'costoInscripcion', 'valorPartido', 'maxEquipos', 'minJugadores', 'maxJugadores'],
        properties: {
          nombre: { type: 'string', example: 'Torneo Clausura UB 2026' },
          deporte: { type: 'string', enum: ['Futbol 5', 'Futbol 8', 'Futbol 11', 'Tenis', 'Padel'], example: 'Futbol 5' },
          costoInscripcion: { type: 'number', example: 35000 },
          valorPartido: { type: 'number', example: 6000 },
          maxEquipos: { type: 'integer', example: 8 },
          minJugadores: { type: 'integer', example: 5 },
          maxJugadores: { type: 'integer', example: 12 },
          fechaInicio: { type: 'string', format: 'date', example: '2026-11-01' },
          fechaFin: { type: 'string', format: 'date', example: '2026-12-20' },
          reglamento: { type: 'string', example: 'Reglamento general del campeonato.' },
        },
      },
      PlayerInscripcionDTO: {
        type: 'object',
        required: ['name', 'dni', 'position'],
        properties: {
          name: { type: 'string', example: 'Enzo Fernández' },
          dni: { type: 'string', example: '42991442', description: 'DNI de jugador registrado previamente en el sistema' },
          position: { type: 'string', example: 'Mediocampista' },
          dorsal: { type: 'integer', example: 8 },
        },
      },
      InscribirEquipoDTO: {
        type: 'object',
        required: ['torneoId', 'nombreEquipo', 'players'],
        properties: {
          torneoId: { type: 'integer', example: 1 },
          nombreEquipo: { type: 'string', example: 'Los Leones FC' },
          players: {
            type: 'array',
            items: { $ref: '#/components/schemas/PlayerInscripcionDTO' },
          },
        },
      },
      InvitarJugadorDTO: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', example: 'jugador@ejemplo.com' },
          dni: { type: 'string', example: '38999111' },
          dorsal: { type: 'integer', example: 7 },
        },
      },
      ResponderInvitacionDTO: {
        type: 'object',
        required: ['respuesta'],
        properties: {
          respuesta: { type: 'string', enum: ['ACEPTADA', 'RECHAZADA'], example: 'ACEPTADA' },
        },
      },
      CargarResultadoDTO: {
        type: 'object',
        required: ['golesLocal', 'golesVisitante'],
        properties: {
          golesLocal: { type: 'integer', minimum: 0, example: 3 },
          golesVisitante: { type: 'integer', minimum: 0, example: 2 },
          observaciones: { type: 'string', example: 'Partido disputado con normalidad. Sin amonestados graves.' },
        },
      },
      AsignarArbitroDTO: {
        type: 'object',
        required: ['arbitroId'],
        properties: {
          arbitroId: { type: 'integer', example: 3, description: 'ID de usuario con rol Arbitro' },
        },
      },
      CambiarEstadoPartidoDTO: {
        type: 'object',
        required: ['estado'],
        properties: {
          estado: { type: 'string', enum: ['PROGRAMADO', 'DISPUTADO', 'SUSPENDIDO', 'REPROGRAMADO'], example: 'DISPUTADO' },
        },
      },
      ReprogramarPartidoDTO: {
        type: 'object',
        required: ['fecha', 'hora'],
        properties: {
          canchaId: { type: 'integer', example: 2 },
          fecha: { type: 'string', format: 'date', example: '2026-11-05' },
          hora: { type: 'string', example: '20:00' },
        },
      },
      CrearAdminDTO: {
        type: 'object',
        required: ['nombre', 'email', 'contrasena', 'dni', 'rol'],
        properties: {
          nombre: { type: 'string', example: 'Marcos Pérez (Árbitro)' },
          email: { type: 'string', format: 'email', example: 'marcos.ref@complejoub.com' },
          contrasena: { type: 'string', format: 'password', minLength: 6, example: 'ArbitroPass_2026!' },
          dni: { type: 'string', pattern: '^\\d{7,8}$', example: '33444555', description: 'DNI numérico obligatorio de 7 u 8 dígitos' },
          rol: { type: 'string', enum: ['Administrador', 'Arbitro'], example: 'Arbitro' },
          telefono: { type: 'string', example: '+54 11 9988-7766' },
        },
      },
      PromoverUsuarioDTO: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', example: 'usuario.cliente@ejemplo.com' },
          targetRole: { type: 'string', enum: ['Administrador', 'Arbitro'], default: 'Administrador' },
        },
      },
      CreateSancionDTO: {
        type: 'object',
        required: ['usuarioId', 'tipoSancion', 'descripcion'],
        properties: {
          usuarioId: { type: 'integer', example: 10 },
          partidoId: { type: 'integer', example: 4 },
          tipoSancion: { type: 'string', enum: ['Amarilla', 'Roja', 'Suspension'], example: 'Roja' },
          descripcion: { type: 'string', example: 'Conducta antideportiva en el minuto 35 del encuentro.' },
        },
      },
      UnirseListaEsperaDTO: {
        type: 'object',
        required: ['canchaId', 'fecha', 'hora'],
        properties: {
          canchaId: { type: 'integer', example: 1 },
          fecha: { type: 'string', format: 'date', example: '2026-10-30' },
          hora: { type: 'string', example: '19:00' },
        },
      },
    },
  },
  paths: {
    // ==========================================
    // GENERAL & HEALTH
    // ==========================================
    '/health': {
      get: {
        summary: 'Estado de salud del servidor y conexión a MySQL',
        description: 'Endpoint público para monitoreo de infraestructura (Render/Railway). Informa estado de conectividad a la base de datos.',
        tags: ['General'],
        responses: {
          200: {
            description: 'Servicio operativo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    database: { type: 'string', example: 'connected' },
                    timestamp: { type: 'string', example: '2026-10-19T02:00:00.000Z' },
                    service: { type: 'string', example: 'Complejo Deportivo UB - Backend REST API' },
                    version: { type: 'string', example: '1.0.0' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ==========================================
    // 1. AUTENTICACIÓN & PERFIL
    // ==========================================
    '/auth/register': {
      post: {
        summary: 'Registro público de nuevos usuarios con DNI obligatorio',
        description: `
Registra una nueva cuenta forzando el rol seguro **Cliente**.
- **Reglas de negocio:**
  1. El DNI es obligatorio y debe contener exactamente 7 u 8 dígitos numéricos.
  2. Valida unicidad estricta tanto del correo electrónico como del DNI (409 Conflict si ya están registrados).
  3. Genera un código de activación OTP de 6 dígitos con expiración a 15 minutos.
  4. La cuenta permanece inactiva (\`email_verificado = false\`) hasta ingresar el código.
        `,
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterDTO' },
            },
          },
        },
        responses: {
          201: { description: 'Registro iniciado exitosamente. Código OTP enviado/generado.' },
          400: { description: 'Datos inválidos o formato de DNI incorrecto.' },
          409: { description: 'El correo electrónico o el DNI ya pertenecen a otro usuario registrado.' },
        },
      },
    },
    '/auth/verificar-codigo': {
      post: {
        summary: 'Verificar cuenta mediante código OTP de 6 dígitos',
        description: `
Activa la cuenta del usuario validando el código de 6 dígitos enviado por correo.
- **Seguridad:** Aplica límite estricto de máximo 5 intentos fallidos (HTTP 429).
- Admite código maestro universal en entornos dev/testing (\`OTP_MASTER_CODE\`).
- Al validarse, la cuenta queda verificada (\`email_verificado = true\`) y entrega el token JWT para ingreso directo.
        `,
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerificarCodigoDTO' },
            },
          },
        },
        responses: {
          200: { description: 'Cuenta activada correctamente con JWT de sesión devuelto.' },
          400: { description: 'Código inválido o vencido.' },
          404: { description: 'Usuario no encontrado.' },
          429: { description: 'Límite máximo de 5 intentos fallidos superado. Debe solicitar un nuevo código.' },
        },
      },
    },
    '/auth/reenviar-codigo': {
      post: {
        summary: 'Reenviar código de activación OTP con rate limit de 60 segundos',
        description: `
Genera un nuevo código de activación de 6 dígitos para cuentas pendientes de verificación.
- **Protección contra abuso:** Aplica rate limiting estricto de 60 segundos entre solicitudes consecutivas (HTTP 429).
- Resetea el contador de intentos fallidos para el nuevo código.
        `,
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReenviarCodigoDTO' },
            },
          },
        },
        responses: {
          200: { description: 'Nuevo código despachado exitosamente.' },
          400: { description: 'Solicitud inválida.' },
          404: { description: 'Usuario no encontrado.' },
          409: { description: 'La cuenta ya se encuentra verificada y activa.' },
          429: { description: 'Debe esperar 60 segundos antes de solicitar otro reenvío.' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Inicio de sesión y obtención de token JWT Bearer',
        description: 'Autentica credenciales (email y contraseña hash bcrypt). Devuelve token JWT con información de rol y estado.',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginDTO' },
            },
          },
        },
        responses: {
          200: {
            description: 'Autenticación exitosa',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer', example: 1 },
                            nombre: { type: 'string', example: 'Juan Pérez' },
                            email: { type: 'string', example: 'juan@ejemplo.com' },
                            dni: { type: 'string', example: '38999111' },
                            rol: { type: 'string', example: 'Cliente' },
                            inasistencias: { type: 'integer', example: 0 },
                            estado_cuenta: { type: 'string', example: 'Activa' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Credenciales inválidas.' },
          403: { description: 'Cuenta pendiente de activación o suspendida.' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Obtener perfil y datos del usuario autenticado',
        description: 'Recupera información del usuario actual a partir del token JWT Bearer.',
        tags: ['Autenticación'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Perfil de usuario obtenido.' },
          401: { description: 'No autenticado o token vencido.' },
        },
      },
    },
    '/auth/dni': {
      put: {
        summary: 'Actualizar o registrar DNI del usuario autenticado',
        description: `
Permite asentar o corregir el DNI propio.
- **Validaciones:** Requiere 7 u 8 dígitos numéricos.
- **Unicidad:** Rechaza la operación si el DNI ya pertenece a otro usuario registrado (HTTP 409).
        `,
        tags: ['Autenticación'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ActualizarDniDTO' },
            },
          },
        },
        responses: {
          200: { description: 'DNI actualizado exitosamente.' },
          400: { description: 'Formato de DNI inválido.' },
          401: { description: 'No autenticado.' },
          409: { description: 'El DNI ingresado ya se encuentra registrado por otro usuario.' },
        },
      },
    },

    // ==========================================
    // 2. CANCHAS & DISPONIBILIDAD
    // ==========================================
    '/canchas': {
      get: {
        summary: 'Listar canchas deportivas del complejo',
        description: 'Consulta pública de canchas con filtros opcionales por deporte y estado activo.',
        tags: ['Canchas'],
        parameters: [
          { name: 'deporte', in: 'query', schema: { type: 'string' }, description: 'Filtrar por deporte (ej: Futbol 5, Padel)' },
          { name: 'activa', in: 'query', schema: { type: 'boolean' }, description: 'Filtrar solo canchas habilitadas' },
        ],
        responses: {
          200: { description: 'Listado de canchas obtenido.' },
        },
      },
      post: {
        summary: 'Crear nueva cancha deportiva (Administrador / Superadministrador)',
        description: 'Da de alta una cancha en el complejo con su deporte, precio por hora y características.',
        tags: ['Canchas'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCanchaDTO' },
            },
          },
        },
        responses: {
          201: { description: 'Cancha creada exitosamente.' },
          400: { description: 'Datos incompletos o inválidos.' },
          403: { description: 'Requiere rol Administrador o Superadministrador.' },
        },
      },
    },
    '/canchas/{id}': {
      get: {
        summary: 'Consultar detalle de una cancha por ID',
        tags: ['Canchas'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Detalle de la cancha.' },
          404: { description: 'Cancha no encontrada.' },
        },
      },
      put: {
        summary: 'Actualizar configuración de una cancha (Administrador / Superadministrador)',
        tags: ['Canchas'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCanchaDTO' },
            },
          },
        },
        responses: {
          200: { description: 'Cancha modificada exitosamente.' },
          403: { description: 'Requiere rol Administrador.' },
          404: { description: 'Cancha no encontrada.' },
        },
      },
      delete: {
        summary: 'Eliminar o dar de baja una cancha (Administrador / Superadministrador)',
        tags: ['Canchas'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Cancha dada de baja.' },
          403: { description: 'Requiere rol Administrador.' },
          404: { description: 'Cancha no encontrada.' },
        },
      },
    },
    '/canchas/{id}/disponibilidad': {
      get: {
        summary: 'Consultar turnos disponibles para una fecha específica',
        description: `
Calcula los horarios disponibles en intervalos de 1 hora (08:00 a 23:00).
- Excluye turnos con reservas confirmadas activas.
- Permite reutilizar turnos cuyas reservas previas hayan sido canceladas.
- Contempla bloqueos automáticos por partidos de torneos oficiales.
        `,
        tags: ['Canchas'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'fecha', in: 'query', required: true, schema: { type: 'string', format: 'date' }, example: '2026-10-25' },
        ],
        responses: {
          200: { description: 'Lista de horarios con estado de disponibilidad.' },
          404: { description: 'Cancha no encontrada.' },
        },
      },
    },

    // ==========================================
    // 3. RESERVAS & ASISTENCIAS
    // ==========================================
    '/reservas': {
      get: {
        summary: 'Listar todas las reservas del complejo (Administrador / Superadministrador)',
        description: 'Supervisión integral de reservas con filtros por fecha, cancha y estado.',
        tags: ['Reservas'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'fecha', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'canchaId', in: 'query', schema: { type: 'integer' } },
          { name: 'estado', in: 'query', schema: { type: 'string', enum: ['CONFIRMADA', 'CANCELADA', 'FINALIZADA', 'INASISTENCIA'] } },
        ],
        responses: {
          200: { description: 'Listado completo de reservas.' },
          403: { description: 'Requiere rol Administrador o Superadministrador.' },
        },
      },
      post: {
        summary: 'Crear nueva reserva de turno con seña reglamentaria (Cliente / Administrador)',
        description: `
Reserva un turno de cancha con cobro de seña.
- **Protección contra duplicados (BUG-004):** Manejo transaccional bajo alta concurrencia que previene reservas solapadas en la misma cancha, fecha y hora (HTTP 409 Conflict).
- **Control de sanciones:** Si el usuario tiene 3 o más inasistencias acumuladas y sanción activa, el sistema bloquea la reserva (HTTP 403).
        `,
        tags: ['Reservas'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateReservaDTO' },
            },
          },
        },
        responses: {
          201: { description: 'Reserva creada y turno asegurado.' },
          400: { description: 'Horario o fecha no disponibles.' },
          403: { description: 'Usuario suspendido por acumulación de inasistencias.' },
          409: { description: 'El turno ya fue reservado por otro usuario de forma concurrente.' },
        },
      },
    },
    '/reservas/mis-reservas': {
      get: {
        summary: 'Listar historial de reservas del usuario autenticado',
        description: 'Devuelve todas las reservas creadas por el usuario con estado de seña y monto total.',
        tags: ['Reservas'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Historial personal de reservas.' },
          401: { description: 'No autenticado.' },
        },
      },
    },
    '/reservas/{id}/cancelacion-info': {
      get: {
        summary: 'Consultar condiciones de cancelación y reintegro de seña',
        description: 'Calcula con antelación si la cancelación aplica para reintegro de seña según la regla de 24 horas previas.',
        tags: ['Reservas'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Información y porcentaje de reembolso aplicable.' },
          404: { description: 'Reserva no encontrada.' },
        },
      },
    },
    '/reservas/{id}/cancelar': {
      post: {
        summary: 'Cancelar reserva con regla de reembolso de seña (>24hs)',
        description: `
Cancela un turno previamente reservado.
- Si se realiza con más de 24 horas de antelación al turno, el sistema reembolsa la seña abonada.
- Si se cancela con menos de 24 horas, la seña no se reintegra.
- El turno queda liberado inmediatamente para que otro cliente pueda reservarlo.
        `,
        tags: ['Reservas'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  motivo: { type: 'string', example: 'Imposibilidad de asistencia por viaje.' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Reserva cancelada y turno liberado.' },
          400: { description: 'La reserva ya se encontraba cancelada o finalizada.' },
          403: { description: 'No autorizado a cancelar una reserva ajena.' },
          404: { description: 'Reserva no encontrada.' },
        },
      },
    },
    '/reservas/{id}/asistencia': {
      put: {
        summary: 'Confirmar asistencia efectiva al turno (Administrador / Superadministrador)',
        description: `
Registra que el cliente asistió al complejo a disputar el turno.
- Marca la reserva en estado **FINALIZADA**.
- **Regla de negocio:** Reinicia el contador de inasistencias del usuario a **0** de forma automática y persistente.
        `,
        tags: ['Reservas'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Asistencia confirmada. Contador de inasistencias reseteado a 0.' },
          403: { description: 'Requiere rol Administrador.' },
          404: { description: 'Reserva no encontrada.' },
        },
      },
    },
    '/reservas/{id}/inasistencia': {
      put: {
        summary: 'Registrar inasistencia del cliente (Administrador / Superadministrador)',
        description: `
Registra que el cliente no concurrió al turno reservado.
- Marca la reserva en estado **INASISTENCIA**.
- Incrementa en 1 el contador de inasistencias no justificadas.
- Si el usuario alcanza 3 inasistencias, el sistema suspende su cuenta automáticamente por 14 días (bloqueando nuevas reservas).
        `,
        tags: ['Reservas'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Inasistencia asentada y suspensión aplicada si acumuló 3 faltas.' },
          403: { description: 'Requiere rol Administrador.' },
          404: { description: 'Reserva no encontrada.' },
        },
      },
    },

    // ==========================================
    // 4. TORNEOS & FIXTURES
    // ==========================================
    '/torneos': {
      get: {
        summary: 'Listar todos los torneos organizados en el complejo',
        description: 'Consulta pública de certámenes con estado (Inscripción abierta, En curso, Finalizado, Cancelado).',
        tags: ['Torneos'],
        responses: {
          200: { description: 'Listado general de torneos.' },
        },
      },
      post: {
        summary: 'Crear nuevo certamen deportivo (Administrador / Superadministrador)',
        description: 'Configura un campeonato definiendo deporte, cupos mínimos/máximos de jugadores y aranceles.',
        tags: ['Torneos'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTorneoDTO' },
            },
          },
        },
        responses: {
          201: { description: 'Torneo creado con inscripciones abiertas.' },
          400: { description: 'Parámetros reglamentarios inválidos.' },
          403: { description: 'Requiere rol Administrador o Superadministrador.' },
        },
      },
    },
    '/torneos/{id}': {
      get: {
        summary: 'Consultar detalle de un torneo por ID',
        tags: ['Torneos'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Detalle del torneo con reglas y cupos.' },
          404: { description: 'Torneo no encontrado.' },
        },
      },
      delete: {
        summary: 'Eliminar torneo con protección contra pérdida de historial (BUG-011)',
        description: `
Eliminación controlada de un torneo.
- **Protección estricta (BUG-011):** Bloquea la eliminación si el torneo ya cuenta con partidos disputados, en curso o historial deportivo persistido (HTTP 400).
- Solo permite eliminar torneos en fase de inscripción sin partidos jugados.
        `,
        tags: ['Torneos'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Torneo eliminado correctamente.' },
          400: { description: 'Bloqueado: no se puede eliminar un torneo con partidos o historial deportivo.' },
          403: { description: 'Requiere rol Administrador.' },
          404: { description: 'Torneo no encontrado.' },
        },
      },
    },
    '/torneos/{id}/posiciones': {
      get: {
        summary: 'Obtener tabla de posiciones calculada del torneo',
        description: 'Devuelve la tabla oficial ordenada por puntos, diferencia de gol y goles a favor (PJ, PG, PE, PP, GF, GC, Pts).',
        tags: ['Torneos'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Tabla de posiciones actualizada.' },
          404: { description: 'Torneo no encontrado.' },
        },
      },
    },
    '/torneos/{id}/fixture': {
      get: {
        summary: 'Consultar fixture y calendario de fechas del torneo',
        description: 'Listado de partidos organizados por número de fecha, con horarios, canchas y árbitro asignado.',
        tags: ['Torneos'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Fixture completo de partidos.' },
          404: { description: 'Torneo no encontrado.' },
        },
      },
    },
    '/torneos/{id}/generar-fixture': {
      post: {
        summary: 'Generar fixture Round-Robin automático (Administrador / Superadministrador)',
        description: `
Genera el calendario completo todos contra todos (con fecha libre si la cantidad de equipos es impar).
- **Inmutabilidad:** Si el torneo ya inició o tiene partidos disputados, rechaza la regeneración para preservar la integridad deportiva.
        `,
        tags: ['Torneos'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Fixture generado exitosamente.' },
          400: { description: 'El torneo no tiene suficientes equipos o ya está en curso.' },
          403: { description: 'Requiere rol Administrador.' },
        },
      },
    },
    '/torneos/{id}/cancelar': {
      put: {
        summary: 'Cancelar oficialmente un torneo (Administrador / Superadministrador)',
        tags: ['Torneos'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Torneo marcado como Cancelado.' },
          403: { description: 'Requiere rol Administrador.' },
        },
      },
    },

    // ==========================================
    // 5. EQUIPOS & JUGADORES
    // ==========================================
    '/equipos': {
      get: {
        summary: 'Listar equipos inscriptos con su nómina completa',
        description: 'Permite filtrar por torneo (\`torneoId\`). Devuelve cada equipo con su capitán y listado de jugadores.',
        tags: ['Equipos y Jugadores'],
        parameters: [
          { name: 'torneoId', in: 'query', schema: { type: 'integer' }, description: 'ID del torneo' },
        ],
        responses: {
          200: { description: 'Listado de equipos y jugadores.' },
        },
      },
      post: {
        summary: 'Inscripción de equipo por el Capitán en un torneo',
        description: `
Registra un equipo y asocia a todos los integrantes de su nómina.
- **Restricción de rol Árbitro:** Un usuario con rol \`Arbitro\` tiene terminantemente prohibido inscribir un equipo o figurar como jugador (HTTP 403 Forbidden).
- **Búsqueda por DNI:** Cada jugador debe estar registrado previamente en el padrón con su DNI.
- **RF-16 (Regla de unicidad por torneo):** Un jugador no puede integrar más de un equipo dentro del mismo certamen (HTTP 409). Sí puede participar en certámenes distintos.
- **Cupos y posiciones:** Valida que la cantidad de jugadores cumpla el mínimo reglamentario del deporte y que las posiciones sean acordes (Arquero, Defensor, etc.).
        `,
        tags: ['Equipos y Jugadores'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/InscribirEquipoDTO' },
            },
          },
        },
        responses: {
          201: { description: 'Equipo inscripto y nómina persistida con éxito.' },
          400: { description: 'Cupos insuficientes, posiciones inválidas o inscripciones cerradas.' },
          403: { description: 'El capitán o algún jugador tiene rol Árbitro o cuenta suspendida.' },
          404: { description: 'Torneo no encontrado o DNI de jugador no registrado en el sistema.' },
          409: { description: 'El capitán o un jugador ya participa en otro equipo dentro de este mismo torneo.' },
        },
      },
    },
    '/equipos/{id}': {
      get: {
        summary: 'Obtener información detallada de un equipo y su plantel',
        tags: ['Equipos y Jugadores'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Detalle del equipo y nómina de jugadores.' },
          404: { description: 'Equipo no encontrado.' },
        },
      },
    },
    '/equipos/buscar-jugador/{dni}': {
      get: {
        summary: 'Buscar jugador registrado por DNI para conformación de equipos',
        description: `
Recupera los datos públicos de un usuario registrado a partir de su DNI.
- Utilizado por el formulario de inscripción de torneos para confirmar nombre y existencia del jugador.
        `,
        tags: ['Equipos y Jugadores'],
        parameters: [
          { name: 'dni', in: 'path', required: true, schema: { type: 'string' }, example: '42991442', description: 'DNI a consultar' },
        ],
        responses: {
          200: {
            description: 'Jugador encontrado en el padrón',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer', example: 10 },
                        nombre: { type: 'string', example: 'Enzo Fernández' },
                        email: { type: 'string', example: 'enzo.f@ejemplo.com' },
                        dni: { type: 'string', example: '42991442' },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: 'No existe ningún usuario registrado con el DNI especificado.' },
        },
      },
    },
    '/equipos/mis-equipos': {
      get: {
        summary: 'Historial de equipos y torneos del usuario autenticado',
        description: 'Devuelve todos los equipos en los que el usuario participa como capitán o como jugador confirmado.',
        tags: ['Equipos y Jugadores'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Historial deportivo personal obtenido.' },
          401: { description: 'No autenticado.' },
        },
      },
    },
    '/equipos/mis-invitaciones': {
      get: {
        summary: 'Listar invitaciones a equipos pendientes de respuesta',
        description: 'Devuelve las invitaciones que otros capitanes le han enviado al usuario autenticado.',
        tags: ['Equipos y Jugadores'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de invitaciones pendientes.' },
          401: { description: 'No autenticado.' },
        },
      },
    },
    '/equipos/{id}/invitar': {
      post: {
        summary: 'Enviar invitación a un jugador para sumarse al equipo (Capitán)',
        description: 'Envía invitación por email o DNI. Bloqueado si el destinatario es Árbitro o ya está en otro equipo del torneo.',
        tags: ['Equipos y Jugadores'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/InvitarJugadorDTO' },
            },
          },
        },
        responses: {
          200: { description: 'Invitación enviada.' },
          400: { description: 'El jugador ya pertenece al equipo o ya fue invitado.' },
          403: { description: 'Solo el capitán puede invitar o el invitado tiene rol Árbitro.' },
          404: { description: 'Equipo o usuario no encontrado.' },
        },
      },
    },
    '/equipos/{id}/responder-invitacion': {
      put: {
        summary: 'Aceptar o rechazar invitación a un equipo (Jugador invitado)',
        description: 'Al aceptar, el jugador queda incorporado formalmente al plantel y se refleja en su historial deportivo.',
        tags: ['Equipos y Jugadores'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResponderInvitacionDTO' },
            },
          },
        },
        responses: {
          200: { description: 'Respuesta registrada exitosamente.' },
          403: { description: 'No tiene una invitación pendiente para este equipo.' },
          404: { description: 'Equipo no encontrado.' },
        },
      },
    },

    // ==========================================
    // 6. PARTIDOS & PLANILLA ARBITRAL
    // ==========================================
    '/partidos': {
      get: {
        summary: 'Listar encuentros deportivos del complejo',
        description: 'Filtra por torneo, árbitro asignado, fecha o número de jornada.',
        tags: ['Partidos y Planilla Arbitral'],
        parameters: [
          { name: 'torneoId', in: 'query', schema: { type: 'integer' } },
          { name: 'arbitroId', in: 'query', schema: { type: 'integer' } },
          { name: 'fecha', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'numeroFecha', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Listado de partidos.' },
        },
      },
    },
    '/partidos/{id}': {
      get: {
        summary: 'Detalle de un partido por ID',
        tags: ['Partidos y Planilla Arbitral'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Detalle del encuentro.' },
          404: { description: 'Partido no encontrado.' },
        },
      },
    },
    '/partidos/arbitro/mis-partidos': {
      get: {
        summary: 'Partidos asignados al árbitro autenticado (Árbitro / Administrador)',
        description: 'Permite al árbitro visualizar su agenda de encuentros pendientes de dirigir y cargar actas digitales.',
        tags: ['Partidos y Planilla Arbitral'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de partidos asignados para arbitraje.' },
          403: { description: 'Requiere rol Árbitro o Administrador.' },
        },
      },
    },
    '/partidos/{id}/resultado': {
      put: {
        summary: 'Registrar resultado oficial y cerrar acta de partido (Árbitro / Administrador)',
        description: `
Carga los goles del equipo local y visitante.
- Marca el partido en estado **DISPUTADO**.
- Recalcula de forma automática y atómica la tabla de posiciones del torneo (partidos jugados, ganados, empatados, perdidos, goles y puntos).
        `,
        tags: ['Partidos y Planilla Arbitral'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CargarResultadoDTO' },
            },
          },
        },
        responses: {
          200: { description: 'Resultado registrado y tabla de posiciones recalculada.' },
          400: { description: 'Marcador inválido.' },
          403: { description: 'Solo el árbitro asignado o un Administrador pueden cargar el resultado.' },
          404: { description: 'Partido no encontrado.' },
        },
      },
    },
    '/partidos/{id}/asignar-arbitro': {
      put: {
        summary: 'Designar árbitro oficial para un partido (Administrador / Superadministrador)',
        tags: ['Partidos y Planilla Arbitral'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AsignarArbitroDTO' },
            },
          },
        },
        responses: {
          200: { description: 'Árbitro asignado correctamente.' },
          400: { description: 'El usuario especificado no posee rol Árbitro.' },
          403: { description: 'Requiere rol Administrador.' },
        },
      },
    },
    '/partidos/{id}/estado': {
      put: {
        summary: 'Modificar estado de un partido (Administrador / Superadministrador)',
        tags: ['Partidos y Planilla Arbitral'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CambiarEstadoPartidoDTO' },
            },
          },
        },
        responses: {
          200: { description: 'Estado actualizado.' },
          403: { description: 'Requiere rol Administrador.' },
        },
      },
    },
    '/partidos/{id}/reprogramar': {
      put: {
        summary: 'Reprogramar cancha, fecha u horario de un partido (Administrador)',
        description: 'Reasigna el encuentro validando que la cancha de destino no tenga interferencias horarias.',
        tags: ['Partidos y Planilla Arbitral'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReprogramarPartidoDTO' },
            },
          },
        },
        responses: {
          200: { description: 'Partido reprogramado exitosamente.' },
          400: { description: 'Conflicto de horario en la cancha seleccionada.' },
          403: { description: 'Requiere rol Administrador.' },
        },
      },
    },

    // ==========================================
    // 7. GESTIÓN DE AUTORIDADES & PERSONAL OFICIAL
    // ==========================================
    '/admin/administradores': {
      get: {
        summary: 'Listar autoridades y personal oficial del complejo (Administrador / Superadministrador)',
        description: 'Devuelve exclusivamente a usuarios con roles Superadministrador, Administrador y Árbitro con su DNI y estado.',
        tags: ['Administración y Autoridades'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Nómina de personal oficial.' },
          403: { description: 'Acceso restringido a Administradores y Superadministradores.' },
        },
      },
    },
    '/admin/crear-admin': {
      post: {
        summary: 'Alta directa de Administrador o Árbitro con DNI (Exclusivo Superadministrador)',
        description: `
Crea un usuario con rol **Administrador** o **Árbitro** de forma directa e inmediata.
- **Jerarquía:** Exclusivo del **Superadministrador** (HTTP 403 Forbidden para administradores estándar).
- **Validación de DNI:** Requiere DNI obligatorio de 7 u 8 dígitos y valida unicidad estricta (HTTP 409).
- **Acceso:** La cuenta se crea con \`email_verificado = true\` para permitir acceso operativo inmediato.
        `,
        tags: ['Administración y Autoridades'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CrearAdminDTO' },
            },
          },
        },
        responses: {
          201: { description: 'Autoridad creada exitosamente.' },
          400: { description: 'Datos incompletos o formato de DNI inválido.' },
          403: { description: 'Acceso denegado: solo el Superadministrador puede crear autoridades.' },
          409: { description: 'El correo electrónico o el DNI ya pertenecen a otro usuario registrado.' },
        },
      },
    },
    '/admin/promover': {
      post: {
        summary: 'Promover usuario existente a Administrador o Árbitro (Exclusivo Superadministrador)',
        description: 'Asciende a un usuario registrado previamente por email. Exclusivo para el Superadministrador.',
        tags: ['Administración y Autoridades'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PromoverUsuarioDTO' },
            },
          },
        },
        responses: {
          200: { description: 'Usuario promovido con éxito.' },
          400: { description: 'No se puede modificar la jerarquía del Superadministrador.' },
          403: { description: 'Acceso denegado: solo el Superadministrador puede promover roles.' },
          404: { description: 'No existe usuario registrado con ese correo.' },
        },
      },
    },
    '/admin/revocar/{id}': {
      delete: {
        summary: 'Revocar privilegios de Administrador o Árbitro (Exclusivo Superadministrador)',
        description: 'Desciende a una autoridad devolviéndola al rol base de Cliente. No se puede revocar al Superadministrador.',
        tags: ['Administración y Autoridades'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Privilegios revocados exitosamente (usuario descendido a Cliente).' },
          400: { description: 'No es posible revocar privilegios del Superadministrador.' },
          403: { description: 'Acceso denegado: solo el Superadministrador puede revocar privilegios.' },
          404: { description: 'Usuario no encontrado.' },
        },
      },
    },

    // ==========================================
    // 8. SANCIONES DISCIPLINARIAS
    // ==========================================
    '/sanciones': {
      get: {
        summary: 'Listar sanciones disciplinarias registradas',
        description: 'Consulta de amonestaciones (tarjetas amarillas, rojas y suspensiones) con filtros por usuario o partido.',
        tags: ['Sanciones Disciplinarias'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'usuarioId', in: 'query', schema: { type: 'integer' } },
          { name: 'partidoId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Listado de sanciones.' },
        },
      },
      post: {
        summary: 'Registrar sanción disciplinaria a un jugador (Árbitro / Administrador)',
        description: 'Asienta una tarjeta o suspensión asociada a un encuentro deportivo y un jugador.',
        tags: ['Sanciones Disciplinarias'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateSancionDTO' },
            },
          },
        },
        responses: {
          201: { description: 'Sanción registrada exitosamente.' },
          403: { description: 'Requiere rol Árbitro o Administrador.' },
          404: { description: 'Usuario o partido no encontrado.' },
        },
      },
    },

    // ==========================================
    // 9. LISTA DE ESPERA
    // ==========================================
    '/lista-espera': {
      post: {
        summary: 'Inscribirse en lista de espera para turnos agotados (Cliente / Cualquier rol)',
        description: 'Permite al usuario anotarse en espera para ser notificado si se libera un turno de cancha en fecha y hora deseadas.',
        tags: ['Lista de Espera'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UnirseListaEsperaDTO' },
            },
          },
        },
        responses: {
          201: { description: 'Inscripto en lista de espera exitosamente.' },
          400: { description: 'El usuario ya se encuentra en espera para ese horario.' },
        },
      },
    },
    '/lista-espera/mis-esperas': {
      get: {
        summary: 'Consultar solicitudes en lista de espera del usuario autenticado',
        tags: ['Lista de Espera'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de turnos en espera.' },
        },
      },
    },
    '/lista-espera/{id}': {
      delete: {
        summary: 'Cancelar una solicitud en lista de espera',
        tags: ['Lista de Espera'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Solicitud cancelada.' },
          404: { description: 'Solicitud no encontrada.' },
        },
      },
    },

    // ==========================================
    // 10. NOTIFICACIONES
    // ==========================================
    '/notificaciones': {
      get: {
        summary: 'Listar notificaciones del usuario autenticado',
        description: 'Recupera avisos de invitaciones a equipos, confirmaciones de turnos, suspensiones y recordatorios.',
        tags: ['Notificaciones'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Notificaciones obtenidas.' },
        },
      },
    },
    '/notificaciones/{id}/leida': {
      put: {
        summary: 'Marcar una notificación individual como leída',
        tags: ['Notificaciones'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Notificación marcada como leída.' },
        },
      },
    },
    '/notificaciones/marcar-todas': {
      put: {
        summary: 'Marcar todas las notificaciones pendientes como leídas',
        tags: ['Notificaciones'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Todas las notificaciones fueron marcadas como leídas.' },
        },
      },
    },

    // ==========================================
    // 11. REPORTES & AUDITORÍA
    // ==========================================
    '/reportes/dashboard': {
      get: {
        summary: 'Métricas consolidadas de gestión deportiva (Administrador / Superadministrador)',
        description: 'Métricas en tiempo real: ocupación diaria de canchas, recaudación por señas, torneos activos e inasistencias.',
        tags: ['Reportes y Auditoría'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Métricas del complejo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        reservasHoy: { type: 'integer', example: 14 },
                        ingresosSenas: { type: 'number', example: 75000 },
                        volumenTotal: { type: 'number', example: 250000 },
                        torneosActivos: { type: 'integer', example: 2 },
                        inasistenciasTotales: { type: 'integer', example: 1 },
                        tasaOcupacionHoy: { type: 'string', example: '68%' },
                        totalCanchasActivas: { type: 'integer', example: 8 },
                      },
                    },
                  },
                },
              },
            },
          },
          403: { description: 'Requiere rol Administrador o Superadministrador.' },
        },
      },
    },
    '/reportes/auditoria': {
      get: {
        summary: 'Consultar log de auditoría y trazabilidad de eventos (Administrador / Superadministrador)',
        description: 'Registro cronológico inmutable de acciones críticas (promociones de roles, revocaciones, cancelaciones, altas de autoridades).',
        tags: ['Reportes y Auditoría'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'limite', in: 'query', schema: { type: 'integer', default: 50 }, description: 'Cantidad máxima de eventos a recuperar' },
        ],
        responses: {
          200: { description: 'Registro de auditoría obtenido.' },
          403: { description: 'Requiere rol Administrador o Superadministrador.' },
        },
      },
    },
  },
};
