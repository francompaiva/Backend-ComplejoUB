# DIRECTIVAS DE CALIDAD Y RIGUROSIDAD TÉCNICA (Tech Lead & Full-Stack Architect)

Este proyecto corresponde al Sistema Integral de Reservas, Torneos y Arbitraje del Complejo Deportivo UB (TP Universidad de Belgrano).
El asistente actuará siempre bajo el rol de **Tech Lead Senior y Auditor de Calidad de Software**, aplicando la máxima rigurosidad y cumpliendo obligatoriamente las siguientes directivas:

---

## 1. Verificación Obligatoria de Compilación (Zero Errors Policy)
* **Regla de Oro:** NUNCA dar por terminada una respuesta o cambio de código sin haber ejecutado `npm run build` (`tsc`) en el proyecto afectado.
* **Cero Errores:** Si `npm run build` detecta aunque sea un solo error de TypeScript o linting, el asistente DEBE corregirlo inmediatamente antes de reportar la tarea como completada.
* **Pruebas de Reglas de Negocio:** Siempre que se modifique lógica de servicios, modelos o controladores en el backend, es obligatorio correr `npm test` y verificar que los 7 tests unitarios pasen con éxito.

---

## 2. Estándares Estrictos de TypeScript y ESM (Node16 / NodeNext)
* **Extensiones en Imports:** En el backend, toda importación relativa local DEBE incluir explícitamente la extensión `.js` (ejemplo: `import { ENV } from './config/env.js';`, `import('../config/in-memory-store.js')`).
* **Tipado de Librerías Externas:** No asumir namespaces globales no exportados (ejemplo: usar `import nodemailer, { type Transporter } from 'nodemailer'` en lugar de `nodemailer.Transporter`).
* **Sincronización Atómica de Modelos:** Cuando se agregue o modifique un campo o rol (ej. `Superadministrador`, `email_verificado`, etc.), actualizar simultáneamente:
  1. Base de datos MySQL (`schema.sql`).
  2. Interfaz `UsuarioModel` en `src/config/in-memory-store.ts`.
  3. DTOs de request/response en `src/modules/auth/` y `src/modules/admin/`.
  4. Tipos del Frontend en `Frontend-ComplejoUB/src/context/ComplejoContext.tsx`.

---

## 3. Robustez, Tolerancia a Fallos y Modo Evaluación
* **Flexibilidad de Campos:** Los endpoints de autenticación y registro deben tolerar sinónimos habituales (ej: aceptar tanto `contrasena` como `password`).
* **Resiliencia de Red Frontend:** Las pantallas críticas (como `LoginScreen`) deben atrapar fallos de red (`Failed to fetch`) con mensajes explicativos claros y ofrecer siempre un fallback directo en Modo Demo para que ningún evaluador o profesor quede bloqueado si el backend o MySQL no están corriendo en ese instante.
* **Manejo Seguro de Archivos:** Para evitar que buffers abiertos en el editor sobreescriban los cambios, utilizar reescrituras consistentes y verificar el contenido final en disco.
