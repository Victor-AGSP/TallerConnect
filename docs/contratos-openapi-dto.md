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

Así se describiría en OpenAPI el endpoint de login. Los nombres de campos corresponden a lo que hoy asume `apiLogin` en `src/services/auth.service.ts` (`access_token`, `full_name`, `roles`); es un ejemplo ilustrativo, no el contrato oficial del backend.

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
                required: [access_token, user]
                properties:
                  access_token:
                    type: string
                  user:
                    type: object
                    required: [id, full_name, email, roles]
                    properties:
                      id:
                        type: integer
                      full_name:
                        type: string
                      email:
                        type: string
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
| `roles: string[]` | `role: UserRole` | Tomar un rol válido |
| `access_token` | `token` (en `AuthResponse`) | Renombrar |

Con DTO y mapper separados, quedaría así:

```ts
// DTO: forma de los datos recibidos por el backend
export interface LoginResponseDto {
  access_token: string;
  user: {
    id: number;
    full_name: string;
    email: string;
    roles: string[];
  };
}

// Mapper: convierte el DTO al modelo que usa la app
export function mapLoginResponse(dto: LoginResponseDto): AuthResponse {
  const role = dto.user.roles[0];

  if (role !== 'cliente' && role !== 'mecanico' && role !== 'administrador') {
    throw new Error('El usuario no tiene un rol válido para TallerConnect.');
  }

  return {
    token: dto.access_token,
    user: {
      id: String(dto.user.id),
      name: dto.user.full_name,
      email: dto.user.email,
      role,
    },
  };
}
```

Hoy esa conversión ocurre dentro de `apiLogin`. Separarla en un DTO y un mapper permite reutilizarla, probarla por separado y ajustarla en un solo lugar si el backend cambia.

## Aplicación en TallerConnect

El recorrido de una respuesta del backend sería:

```
Respuesta HTTP → DTO → validación Zod → mapper → modelo → store / pantallas
```

- **DTO:** nueva carpeta `src/dto/`, un archivo por dominio (por ejemplo, `auth.dto.ts`).
- **Mappers:** nueva carpeta `src/mappers/` (por ejemplo, `auth.mapper.ts`).
- **Modelos:** se mantienen en `src/models/`; el resto de la app sigue usándolos sin cambios.
- **Schemas Zod:** conviene validar el DTO, que es el dato externo no confiable, antes de pasarlo al mapper. Los schemas actuales de `src/schemas/` validan la forma del modelo.
- **Mocks:** los de `src/mocks/` tienen forma de modelo y siguen sirviendo para la UI. Para probar los mappers se necesitan payloads simulados con forma de DTO.
- **Servicios**: realizan las solicitudes HTTP y reciben las respuestas del backend. Los datos recibidos se validan y transforman antes de incorporarse al modelo interno.

## Referencias

- [Especificación OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0)
- [Documentación de Swagger](https://swagger.io/docs/specification/)
