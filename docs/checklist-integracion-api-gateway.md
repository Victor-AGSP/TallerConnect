# Checklist de integración móvil con la API Gateway

## Propósito y estado del contrato

Usar esta lista para acordar y verificar cada integración antes de conectarla desde la aplicación móvil. La especificación OpenAPI/Swagger publicada por el equipo de la Gateway debe ser la fuente de verdad para rutas, formatos y respuestas.

En el repositorio no hay actualmente una especificación OpenAPI oficial ni un entorno Gateway documentado para pruebas. `docs/contratos-openapi-dto.md` contiene ejemplos ilustrativos, no un contrato aprobado. Por eso, las rutas que ya aparecen en el código se registran como supuestos pendientes de cotejo, no como acuerdos confirmados.

## Datos compartidos de la Gateway

- [ ] Recibir la URL de OpenAPI/Swagger y registrar su versión o commit.
- [ ] Recibir las URLs base para desarrollo, pruebas y producción; confirmar HTTPS fuera del entorno local.
- [x] La app permite configurar `EXPO_PUBLIC_API_URL`; el valor por defecto del cliente actual es `http://localhost:8000/api`.
- [ ] Confirmar si `/api` forma parte de la URL base o del prefijo de cada ruta para evitar duplicarlo.
- [ ] Confirmar autenticación requerida por operación, formato del encabezado, expiración y renovación del token.
- [ ] Confirmar la forma común de errores, códigos HTTP y mensajes que puede mostrar la app.
- [ ] Confirmar límites de tiempo, paginación, orden, filtros, formatos de fecha/hora, límites de solicitudes y encabezados de trazabilidad.
- [ ] Acordar cómo se versiona el contrato y cómo se notifican cambios incompatibles al equipo móvil.

## Autenticación y usuarios

### Login

- [x] La app envía correo y contraseña a `POST /auth/login` relativo a la URL base configurada.
- [x] La respuesta se transforma mediante DTO, mapper y esquema Zod antes de guardarse en Zustand.
- [x] Hay pruebas unitarias del mapper/esquema y pruebas del flujo de login con respuestas simuladas.
- [ ] Cotejar con OpenAPI que ruta, método, prefijo, nombres, tipos y campos obligatorios coincidan. El código hoy espera `access_token`, `token_type` y `user` con `id`, `email`, `full_name`, `roles` e `is_active`.
- [ ] Confirmar si `roles` contiene uno o varios roles, el orden/prioridad aplicable y los valores exactos que devuelve el servicio.
- [ ] Confirmar estados y cuerpos de respuesta para credenciales inválidas, cuenta inactiva, validación y errores de servidor.
- [ ] Confirmar si la Gateway entrega `refresh_token`, duración/unidad de expiración y mecanismo de renovación.

### Sesión, autorización y usuarios

- [x] La sesión móvil se persiste en SecureStore en iOS/Android; el almacenamiento web usa `localStorage`.
- [x] La navegación protege las rutas locales de cliente, mecánico y administrador según sesión y rol.
- [ ] Confirmar el mecanismo de envío del token en solicitudes autenticadas y comprobarlo en el contrato.
- [ ] Confirmar si existen operaciones oficiales para consultar usuario/sesión, renovar token, cerrar sesión o revocar tokens. El DTO menciona `GET /auth/me`, pero no existe una llamada móvil implementada.
- [ ] Confirmar políticas de autorización en la Gateway y comportamiento esperado para `401` y `403`; la protección de rutas móviles no reemplaza la autorización del servidor.
- [ ] Confirmar qué campos del perfil devuelve cada rol y cuáles pueden ser nulos o actualizarse.

## Vehículos y órdenes de trabajo

- [ ] Registrar en esta lista cada método y ruta oficial de vehículos, servicios, órdenes e historial de estados; no inferir rutas a partir de las pantallas.
- [ ] Confirmar DTO de vehículo, identificador, patente única, kilometraje, año, relaciones con cliente y reglas de validación.
- [ ] Confirmar qué vehículos y órdenes puede consultar cada rol, y cómo se valida propiedad del cliente y asignación del mecánico.
- [ ] Confirmar estados válidos, transiciones, fecha/hora/autor de cada cambio y restricciones del flujo.
- [ ] Confirmar operaciones y errores para creación, consulta, actualización, cancelación y filtros/paginación.
- [ ] Confirmar límites de órdenes activas por mecánico y máximo de vehículos revisados por día, incluyendo la respuesta cuando se exceden.

## Presupuestos, repuestos y proveedores

- [ ] Registrar endpoints oficiales de presupuestos, aprobaciones, repuestos, proveedores/distribuidores e inventario/stock.
- [ ] Confirmar DTOs, unidades y formato monetario, disponibilidad, relaciones y reglas de validación.
- [ ] Confirmar quién puede crear, consultar o aprobar presupuestos y qué estados de aprobación existen.
- [ ] Confirmar cómo comprobar stock y asociar el proveedor antes de registrar un repuesto como utilizado.
- [ ] Confirmar respuestas para falta de stock, presupuesto vencido/rechazado y conflictos por actualizaciones concurrentes.

## Evidencia multimedia

- [ ] Registrar endpoints oficiales de carga, consulta y eliminación de evidencias asociadas a una orden.
- [ ] Confirmar si la carga usa `multipart/form-data`, carga directa o URL temporal; documentar nombres de campos.
- [ ] Confirmar tipos MIME, tamaño/duración máximos, formatos admitidos, límites por orden y tratamiento de metadatos.
- [ ] Confirmar permisos por rol, estados sin permiso de carga y respuestas frente a carga parcial o desconexión.
- [ ] Validar permisos de cámara/galería, cancelación, reintento y visualización/descarga desde dispositivos.

## Cambios requeridos en la app por contrato

- [x] El cliente HTTP centraliza la URL base, `Content-Type`, `Accept` y timeout de 10 segundos.
- [ ] Añadir interceptores o configuración equivalente para autorización solo después de confirmar el formato del token.
- [ ] Normalizar los errores de Gateway sin ocultar errores de validación ni filtrar datos sensibles en logs.
- [ ] Crear DTO, schema de entrada/salida y mapper por dominio; validar datos externos antes de actualizar Zustand o las pantallas.
- [ ] Mantener las respuestas simuladas detrás de configuración de desarrollo y evitar que se confundan con datos reales en pruebas de integración.
- [ ] No guardar tokens, contraseñas ni datos personales en logs, reportes de errores o archivos de configuración versionados.

## Pruebas y aceptación de cada endpoint

- [ ] Prueba de mapper/schema con ejemplos válidos y respuestas incompletas o malformadas del contrato.
- [ ] Prueba de servicio HTTP que verifique método, ruta, encabezados, cuerpo y transformación de respuesta.
- [ ] Pruebas de errores: desconexión, timeout, `400`, `401`, `403`, `404`, `409` y `5xx`, según aplique al contrato.
- [ ] Pruebas de permisos por rol y de navegación ante sesión expirada o rechazada por el servidor.
- [ ] Prueba de integración contra entorno de pruebas de la Gateway sin credenciales reales en fixtures ni logs.
- [ ] Prueba funcional en Android y iOS con dispositivos/emuladores y URL accesible desde el dispositivo.
- [ ] Confirmar resultados del pipeline: `npm run test:ci`, `npm run typecheck` y `npm run export:android`.

## Estado observado al crear esta lista

- Autenticación: cliente y DTO de login implementados; la integración HTTP depende de `EXPO_PUBLIC_USE_MOCK_AUTH=false`. Las pruebas del flujo usan AuthService simulado.
- Navegación/roles: rutas locales protegidas y cubiertas con pruebas automatizadas.
- Resto de dominios: las pantallas muestran datos de demostración; todavía no hay servicios HTTP móviles para vehículos/órdenes, presupuestos/repuestos/proveedores ni evidencia.
- Verificación contra Gateway: pendiente de contar con el contrato oficial y un entorno de pruebas accesible.

## Registro de validación

| Fecha | Versión/commit OpenAPI | Entorno Gateway | Responsable API | Responsable móvil | Resultado/notas |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |
