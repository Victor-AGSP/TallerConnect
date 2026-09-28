# Contratos OpenAPI/Swagger y separación DTO → modelo

TallerConnect consume una API desarrollada por otro equipo (Integración 2). Para que ambos equipos trabajen sin depender uno del otro, necesitan un **contrato**: una descripción acordada de qué endpoints existen, qué datos reciben y qué datos devuelven. Este documento resume cómo se describe ese contrato con OpenAPI/Swagger y cómo la app móvil separa los datos que llegan del backend (DTO) de los que usa internamente (modelo).

## OpenAPI y Swagger

**OpenAPI** es un formato estándar, escrito en YAML o JSON, para describir una API REST. Para cada endpoint indica la ruta, el método HTTP, los datos que recibe, las respuestas posibles y los códigos de estado.

**Swagger** es el conjunto de herramientas que trabaja con ese formato. La más conocida es Swagger UI, una página web generada a partir del archivo OpenAPI donde se pueden ver y probar los endpoints. En la práctica ambos nombres se usan como sinónimos.

Para dos equipos separados, el archivo OpenAPI cumple el papel del "manual" de la API:

- El equipo móvil sabe qué enviar y qué esperar, sin tener que leer el código del backend.
- Los cambios en la API quedan visibles al comparar versiones del archivo.
- Muchos frameworks de backend generan el archivo automáticamente a partir del código.

## Ejemplo: contrato del login

Así se describiría en OpenAPI el endpoint de login. Los nombres de campos corresponden a lo que consumen `AuthService.login` y `mapLoginResponse` (`access_token`, `full_name`, `roles`); es un ejemplo ilustrativo, no el contrato oficial del backend.

```yaml
paths:
  /auth/login:
    post:
      summary: Iniciar sesión
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
      responses:
        '200':
          description: Credenciales correctas
          content:
            application/json:
              schema:
                type: object
                required: [access_token, token_type, user]
                properties:
                  access_token:
                    type: string
                  token_type:
                    type: string
                  user:
                    type: object
                    required: [id, full_name, email, roles, is_active]
                    properties:
                      id:
                        type: integer
                      full_name:
                        type: string
                      email:
                        type: string
                      is_active:
                        type: boolean
                      roles:
                        type: array
                        items:
                          type: string
        '401':
          description: Correo o contraseña incorrectos
```

## DTO y modelo

- **DTO (Data Transfer Object):** tipo que representa los datos **tal como llegan** del backend, con sus nombres y formatos.
- **Modelo:** tipo que usa la app internamente (pantallas, store, servicios). Ya existen en `src/models/`.
- **Mapper:** función que convierte un DTO en un modelo.

La separación permite que un cambio en el backend (renombrar un campo, cambiar un tipo) se corrija en un solo lugar, el DTO y su mapper, sin tocar pantallas ni store.

El login del proyecto muestra por qué hace falta. El backend y el modelo `User` no coinciden:

| Backend (DTO) | App (modelo `User`) | Conversión |
|---|---|---|
| `id: number` | `id: string` | `String(id)` |
| `full_name` | `name` | Renombrar |
| `roles: string[]` | `role: UserRole` | Validar el primer rol; rechazar si no es compatible |
| `access_token` | `token` (en `AuthResponse`) | Renombrar |

La separación ya existe en el código:

- `src/dto/auth.dto.ts`: `LoginRequestDto`, `LoginResponseDto` y `UserResponseDto`.
- `src/mappers/auth.mapper.ts`: `mapUserResponse` valida id numérico entero, nombre, correo, lista de roles y `is_active: true` antes de transformar. El primer rol debe ser compatible; no se implementa selección multirrol.
- `src/services/auth.service.ts`: `AuthService.login` envía la solicitud, llama al mapper y valida el modelo resultante con `authResponseSchema` antes de entregarlo al store.

`token_type` está declarado en el DTO pero no se conserva ni se valida en tiempo de ejecución; tampoco se ha implementado el encabezado de autorización de peticiones posteriores. Estas decisiones siguen pendientes del contrato Gateway.

## Aplicación en TallerConnect

El recorrido actual de una respuesta del backend es:

```
Respuesta HTTP → mapper (valida usuario DTO) → validación del modelo → store → pantallas
```

- **DTO:** carpeta `src/dto/`, un archivo por dominio (por ejemplo, `auth.dto.ts`).
- **Mappers:** carpeta `src/mappers/` (por ejemplo, `auth.mapper.ts`).
- **Modelos:** se mantienen en `src/models/`; el resto de la app sigue usándolos sin cambios.
- **Schemas Zod:** el mapper valida los campos del usuario externo antes de convertirlos; `src/schemas/auth.schema.ts` valida la forma del modelo y las credenciales. Falta cotejar estas reglas con el OpenAPI oficial.
- **Mocks:** los de `src/mocks/` tienen forma de modelo y siguen sirviendo para la UI. Los payloads de `src/mocks/payloads/auth.payload.ts` permiten probar el mapper y el servicio HTTP con forma de DTO.
- **Servicios**: realizan las solicitudes HTTP y reciben las respuestas del backend. Los datos recibidos se validan y transforman antes de incorporarse al modelo interno.

## Referencias

- [Especificación OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0)
- [Documentación de Swagger](https://swagger.io/docs/specification/)
- [Checklist de integración móvil con la API Gateway](./checklist-integracion-api-gateway.md)
