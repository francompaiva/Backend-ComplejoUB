export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Complejo Deportivo UB - API REST',
    version: '1.0.0',
    description:
      'Documentación interactiva de la API REST para el sistema de gestión del Complejo Deportivo UB. Cubre autenticación, reserva de canchas, gestión de torneos, fixtures, sanciones y administración de roles.',
    contact: {
      name: 'Equipo de Desarrollo Complejo UB',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Servidor API v1',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingrese el token JWT obtenido en el inicio de sesión',
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
              message: { type: 'string', example: 'Descripción detallada del error' },
              statusCode: { type: 'integer', example: 400 },
            },
          },
        },
      },
      RegisterDTO: {
        type: 'object',
        required: ['nombre', 'email', 'contrasena'],
        properties: {
          nombre: { type: 'string', example: 'Juan Pérez' },
          email: { type: 'string', format: 'email', example: 'usuario@ejemplo.com' },
          contrasena: { type: 'string', format: 'password', minLength: 6, example: 'Password123' },
          telefono: { type: 'string', example: '1122334455' },
        },
      },
      LoginDTO: {
        type: 'object',
        required: ['email', 'contrasena'],
        properties: {
          email: { type: 'string', format: 'email', example: 'usuario@ejemplo.com' },
          contrasena: { type: 'string', format: 'password', example: 'Password123' },
        },
      },
      CreateReservaDTO: {
        type: 'object',
        required: ['canchaId', 'fecha', 'hora'],
        properties: {
          canchaId: { type: 'integer', example: 1 },
          fecha: { type: 'string', format: 'date', example: '2026-10-25' },
          hora: { type: 'string', example: '18:00' },
          metodoPago: { type: 'string', enum: ['MERCADO_PAGO', 'EFECTIVO', 'TRANSFERENCIA'], example: 'MERCADO_PAGO' },
        },
      },
      CreateTorneoDTO: {
        type: 'object',
        required: ['nombre', 'deporte', 'costoInscripcion', 'valorPartido', 'maxEquipos', 'minJugadores', 'maxJugadores'],
        properties: {
          nombre: { type: 'string', example: 'Torneo Apertura 2026' },
          deporte: { type: 'string', enum: ['Futbol 5', 'Futbol 8', 'Futbol 11', 'Tenis', 'Padel'], example: 'Futbol 5' },
          costoInscripcion: { type: 'number', example: 15000 },
          valorPartido: { type: 'number', example: 2500 },
          maxEquipos: { type: 'integer', example: 8 },
          minJugadores: { type: 'integer', example: 5 },
          maxJugadores: { type: 'integer', example: 10 },
          fechaInicio: { type: 'string', format: 'date', example: '2026-11-01' },
          fechaFin: { type: 'string', format: 'date', example: '2026-12-15' },
          reglamento: { type: 'string', example: 'Reglamento oficial del torneo...' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Verificar salud y conectividad del servicio',
        tags: ['General'],
        responses: {
          200: {
            description: 'Servicio en funcionamiento',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    database: { type: 'string', example: 'connected' },
                    timestamp: { type: 'string' },
                    version: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Registrar nuevo usuario (rol forzado a Cliente)',
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
          201: { description: 'Registro iniciado, código de verificación enviado por email' },
          400: { $ref: '#/components/responses/BadRequest' },
          409: { description: 'El correo electrónico ya se encuentra registrado' },
        },
      },
    },
    '/auth/verificar-codigo': {
      post: {
        summary: 'Verificar cuenta mediante código OTP de 6 dígitos',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'codigo'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  codigo: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cuenta activada correctamente' },
          400: { description: 'Código inválido o expirado' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Iniciar sesión y obtener JWT Bearer token',
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
                        user: { type: 'object' },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Credenciales inválidas' },
          403: { description: 'Cuenta pendiente de activación' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Obtener información y perfil del usuario autenticado',
        tags: ['Autenticación'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Perfil de usuario obtenido' },
          401: { description: 'No autenticado o token vencido' },
        },
      },
    },
    '/canchas': {
      get: {
        summary: 'Listar todas las canchas deportivas disponibles',
        tags: ['Canchas'],
        parameters: [
          { name: 'deporte', in: 'query', schema: { type: 'string' }, description: 'Filtrar por deporte' },
          { name: 'activa', in: 'query', schema: { type: 'boolean' }, description: 'Filtrar por estado activo' },
        ],
        responses: {
          200: { description: 'Lista de canchas obtenida exitosamente' },
        },
      },
    },
    '/canchas/{id}/disponibilidad': {
      get: {
        summary: 'Consultar turnos disponibles de una cancha para una fecha',
        tags: ['Canchas'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'fecha', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Horarios disponibles y bloqueos de torneos de fin de semana' },
        },
      },
    },
    '/reservas': {
      get: {
        summary: 'Listar reservas (del usuario actual o todas si es Administrador)',
        tags: ['Reservas'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Reservas obtenidas' },
        },
      },
      post: {
        summary: 'Crear una nueva reserva de turno con seña',
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
          201: { description: 'Reserva creada exitosamente' },
          400: { description: 'Horario no disponible o fecha inválida' },
          403: { description: 'Usuario suspendido por acumulación de inasistencias' },
        },
      },
    },
    '/reservas/{id}/cancelar': {
      put: {
        summary: 'Cancelar una reserva existente con regla de reembolso de seña',
        tags: ['Reservas'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  motivo: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Reserva cancelada y turno liberado' },
        },
      },
    },
    '/reservas/{id}/asistencia': {
      put: {
        summary: 'Confirmar asistencia efectiva a un turno (resetea contador de inasistencias a 0)',
        tags: ['Reservas'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Asistencia confirmada e inasistencias reiniciadas a 0' },
        },
      },
    },
    '/reservas/{id}/inasistencia': {
      put: {
        summary: 'Registrar inasistencia del cliente (aplica suspensión de 14 días si acumula 3)',
        tags: ['Reservas'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Inasistencia registrada' },
        },
      },
    },
    '/torneos': {
      get: {
        summary: 'Listar torneos organizados en el complejo',
        tags: ['Torneos'],
        responses: {
          200: { description: 'Listado de torneos' },
        },
      },
      post: {
        summary: 'Crear nuevo torneo (Exclusivo Administrador)',
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
          201: { description: 'Torneo creado exitosamente' },
          403: { description: 'Permisos insuficientes' },
        },
      },
    },
    '/torneos/{id}/fixture': {
      get: {
        summary: 'Consultar fixture y calendario de partidos de un torneo',
        tags: ['Torneos'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Fixture de partidos' },
        },
      },
    },
    '/torneos/{id}/generar-fixture': {
      post: {
        summary: 'Generar fixture Round-Robin automático (Inmutable una vez iniciado)',
        tags: ['Torneos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Fixture generado exitosamente' },
          400: { description: 'El torneo ya se encuentra iniciado o en curso' },
        },
      },
    },
    '/torneos/{id}/posiciones': {
      get: {
        summary: 'Obtener tabla de posiciones calculada del torneo',
        tags: ['Torneos'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Tabla de posiciones actualizada' },
        },
      },
    },
    '/partidos/{id}/resultado': {
      put: {
        summary: 'Registrar resultado de partido (Árbitro o Administrador)',
        tags: ['Partidos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['golesLocal', 'golesVisitante'],
                properties: {
                  golesLocal: { type: 'integer', example: 3 },
                  golesVisitante: { type: 'integer', example: 1 },
                  observaciones: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Resultado guardado y tabla de posiciones recalculada' },
        },
      },
    },
    '/admin/administradores': {
      get: {
        summary: 'Listar usuarios con roles de administración (Exclusivo Administradores)',
        tags: ['Administración'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Listado de administradores y árbitros' },
        },
      },
    },
    '/admin/crear-admin': {
      post: {
        summary: 'Crear nuevo usuario con rol de Administrador o Árbitro (Restringido)',
        tags: ['Administración'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'email', 'contrasena'],
                properties: {
                  nombre: { type: 'string', example: 'Admin General' },
                  email: { type: 'string', format: 'email', example: 'admin@complejoub.com' },
                  contrasena: { type: 'string', example: 'ClaveSegura2026' },
                  rol: { type: 'string', enum: ['Administrador', 'Arbitro'], example: 'Administrador' },
                  telefono: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Usuario administrativo creado' },
          403: { description: 'Acceso restringido a administradores' },
        },
      },
    },
    '/admin/promover': {
      post: {
        summary: 'Promover usuario existente a Administrador o Árbitro (Restringido)',
        tags: ['Administración'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  targetRole: { type: 'string', enum: ['Administrador', 'Arbitro'], default: 'Administrador' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Usuario promovido exitosamente' },
        },
      },
    },
  },
  components_responses: {
    BadRequest: {
      description: 'Datos de entrada inválidos o faltantes',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
};

