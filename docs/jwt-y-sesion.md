# Estructura del JWT y datos de sesión de TallerConnect

Este documento estudia el token que entrega la API al iniciar sesión y define qué datos de sesión necesita realmente la app móvil. Se basa en el contrato verificado contra producción (25-09-2026) y en el código actual de sesión (`authStore`, `utils/storage`, `app/index.tsx`).

## Qué es un JWT

Un JWT (JSON Web Token) es un texto con tres partes separadas por puntos:

```
header.payload.firma
```

- **Header:** indica el algoritmo de firma. En TallerConnect es `HS256`.
- **Payload:** los datos del token, llamados *claims*.
- **Firma:** la calcula el backend con una clave secreta que solo él conoce.

Las dos primeras partes solo están codificadas en base64url, **no cifradas**. Cualquiera que tenga el token puede leer su contenido sin conocer la clave.

La firma permite al backend comprobar que nadie modificó el token. Con `HS256`, esa comprobación requiere la clave secreta, así que **la app no puede verificar la firma**. Por lo tanto, la app no debe confiar en el payload para decisiones de seguridad: quien valida el token es la API, en cada petición.

## El JWT de TallerConnect

Payload real:

```json
{ "sub": "1", "roles": ["cliente"], "exp": 1790365142 }
```

| Claim | Tipo | Significado | Observación |
|---|---|---|---|
| `sub` | string | Id del usuario | En `user.id` del login es número. El mapper lo convierte a string, así que coinciden |
| `roles` | string[] | Roles del usuario | Mismos valores que `user.roles` del login |
| `exp` | number | Fecha de expiración, en segundos desde 1970 (formato Unix) | El token vence 60 minutos después del login |

El token **no incluye** `email`, `full_name`, `iat` (fecha de emisión) ni `is_active`.

Además, el backend **no tiene refresh token ni endpoint de logout**. Al vencer el token no hay forma de renovarlo: hay que iniciar sesión de nuevo. Cerrar sesión consiste en borrar el token del dispositivo.

## Datos de sesión que usa hoy la app

| Dato | Para qué lo usa | De dónde sale | Dónde se guarda |
|---|---|---|---|
| `token` | Enviarlo en `Authorization: Bearer` | `access_token` del login | SecureStore (`tc_auth_token`) |
| `user` (`id`, `name`, `email`, `role`) | Mostrar datos del usuario | `user` del login, vía `mapLoginResponse` | SecureStore (`tc_user_data`) |
| `role` | Redirigir al Home de cada rol y proteger rutas | `user.role` | Se deriva de `user` en el store |

Al abrir la app, `restoreSession` lee el token y el usuario guardados. Si existen los dos, la sesión queda activa y `app/index.tsx` redirige según el rol.

En web, el almacenamiento usa `localStorage` en vez de SecureStore. Eso solo ocurre en desarrollo.

## Qué aporta realmente el JWT

- `sub` y `roles` repiten datos que ya vienen en el `user` del login.
- El nombre y el correo no están en el token, así que los datos del usuario **tienen que** salir de la respuesta del login.
- El único dato propio del token es `exp`.

**Conclusión:** la app trata el token como un valor opaco. Lo guarda y lo envía, sin decodificarlo para obtener datos del usuario.

## Hallazgo: la sesión restaurada no revisa la expiración

`restoreSession` restaura la sesión con solo encontrar un token guardado, sin revisar si ya venció. Si el usuario abre la app más de 60 minutos después de iniciar sesión:

1. Entra a su Home con un token vencido.
2. La primera petición protegida responde `401` con el mensaje "Token inválido o expirado".
3. Según el contrato, la app debe cerrar la sesión ante un 401.

Opciones para manejarlo:

| Opción | Ventaja | Desventaja |
|---|---|---|
| **A. Depender del 401** | Simple. La API es la fuente de verdad | El usuario alcanza a ver su Home antes de ser expulsado |
| **B. Revisar `exp` al restaurar** | Evita entrar con un token vencido | Hay que decodificar base64url y no hay librería instalada. Los tokens demo (`demo-token-...`) no son JWT y hay que tolerarlos. Depende del reloj del dispositivo. No reemplaza el manejo del 401 |
| **C. Llamar `GET /api/auth/me` al restaurar** | El backend confirma si el token sigue válido y actualiza los datos del usuario | Agrega una petición de red al abrir la app y falla sin conexión |

**A es necesaria en cualquier caso**, porque un token también puede vencer mientras la app está abierta. B y C son mejoras opcionales que el equipo debe decidir. Se relacionan con estas tareas:

- "Implementar coordinación de cierre de sesión cuando la sesión deje de ser válida"
- "Implementar interfaces para sesión expirada/no autorizada"
- "Integrar persistencia y recuperación de sesión mediante SecureStore"

## Datos de sesión que necesita la app

| Dato | ¿Necesario? | Fuente |
|---|---|---|
| `token` | Sí | `access_token` del login |
| `user` (`id`, `name`, `email`, `role`) | Sí | `user` del login, vía mapper |
| `exp` | Solo si se elige la opción B | Se lee del mismo token. No hace falta guardarlo aparte |
| `token_type` | No | Siempre es `bearer` |
| `is_active` | No, por ahora | Pendiente: el contrato no dice qué pasa si llega en `false` |
| `refreshToken` | No existe | El backend no lo entrega |

## Pendientes para otras tareas

- `refreshToken` en `AuthResponse` y `AuthSession`, y `AuthSession` sin uso: tarea "Revisar nulabilidad, campos opcionales y valores inesperados".
- El comportamiento ante `is_active: false`: consultar a Integración 2.
- La validación de las respuestas de sesión, usuario y roles: tarea "Definir validaciones para respuestas de sesión, usuario autenticado y roles".