# Convenciones de representación de datos

Este documento define cómo la app representa los identificadores, las fechas, los valores nulos y las listas que recibe de la API. Las convenciones se aplican en la tarea "Corregir modelos/DTO según diferencias encontradas"; este documento no modifica código.

## Principio general

- **DTO:** refleja la API tal como llega (nombres, tipos y `null`).
- **Modelo:** sigue las convenciones de este documento.
- **Mapper:** convierte de uno a otro.

## Identificadores

**En la API:** enteros (`id`, `vehiculo_id`, `orden_id`, `mecanico_actual_id`, `creado_por_id`, `ingreso_id`). El `sub` del JWT es texto.

**En la app hoy:** texto en `User`, `Vehicle`, `WorkOrder`, en el store, en `userSchema` y en los mocks.

**Convención:**
- En los modelos, todo identificador es `string`.
- En los DTO, el identificador mantiene el tipo de la API (`number`).
- Al recibir datos, el mapper convierte con `String(id)`.
- Al enviar un identificador a la API (por ejemplo, `vehiculo_id` al crear una orden o `mecanico_id` al asignar un mecánico), se convierte con `Number(id)` y se comprueba que el resultado sea un entero.
- Los identificadores son opacos: solo se comparan y se envían; no se usan para calcular.
- Los mocks que representen payloads del backend deben utilizar identificadores compatibles con el tipo `number` del DTO, por ejemplo `12`. Los mocks del modelo móvil pueden utilizar identificadores `string` siempre que no pretendan simular directamente una respuesta de la API.

**Motivo:**
- Es la convención que ya usa todo el modelo móvil.
- Mantenerla evita conversiones y cambios en cascada dentro de la app: pasar a `number` obligaría a modificar modelos, store, schemas, mocks y pruebas en uso.

## Valores nulos

| En la API | En el modelo | Ejemplo |
|---|---|---|
| Campo siempre presente, con valor | `campo: T` (obligatorio) | `marca` → `brand: string` |
| Campo siempre presente que puede ser `null` | `campo: T \| null` | `anio` → `year: number \| null` |
| Campo que la API no envía | Se elimina del modelo | `description` en `WorkOrder` |
| Dato propio de la app que puede no existir | `campo?: T` | `phone?` en los usuarios demo |

**Convención:**
- El mapper copia `null` como `null`, sin convertirlo a `undefined`.
- En el estado de la app, `null` significa "sin valor", como ya hace el store (`user: User | null`).

**Motivo:**
- Refleja el contrato con exactitud: el campo siempre existe, pero puede no tener valor.
- TypeScript obliga a manejar el caso sin valor.
- Al guardar en JSON, `null` se conserva, mientras que un campo `undefined` desaparece.

**Consecuencia:** las funciones que reciban estos campos deben aceptar `null`. Hoy, `formatDate(dateString?: string)` no lo acepta.

## Fechas

**En la API:** texto ISO 8601 con zona horaria (`creado_en`, `actualizado_en`), por ejemplo `"2026-09-25T18:00:00Z"`.

**Convención:**
- Los modelos guardan la fecha como `string` ISO, sin convertirla.
- La conversión a `Date` se hace solo al mostrar o comparar.
- Al mostrar, se usa la zona horaria del dispositivo, como ya hace `formatDate`.

**Motivo:**
- La sesión y los datos se guardan en JSON. Un `Date` en el modelo se convertiría en texto al restaurarse, sin que TypeScript lo detecte.
- El texto ISO se puede almacenar directamente; para comparar instantes de tiempo se convierte a `Date`.

**Consecuencia:** `formatDate` no detecta un texto que no es fecha: muestra "Invalid Date", porque `new Date()` no lanza error. Debe comprobar que la fecha sea válida.

## Listas

**En la API:**
- Las consultas de listas (`GET /api/vehiculos`, `GET /api/ordenes`) devuelven un arreglo directo, sin envoltorio.
- Una lista vacía llega como `[]`.
- No hay paginación.
- Dentro de un objeto, `roles` también es un arreglo.

**Convención:**
- Una lista siempre es un arreglo. Si está vacía, es `[]`, nunca `null` ni `undefined`.
- Una lista vacía es una respuesta válida: la pantalla muestra su estado vacío, no un error.
- La respuesta de una lista se tipa como arreglo del DTO (por ejemplo, `VehiculoRespuestaDto[]`).

**Consecuencia:** `ApiResponse<T>` (`{ data: T; message?: string }`, en `src/types/api.types.ts`) no corresponde a la API real, que no envuelve sus respuestas.

## Resumen

| Tema | En el DTO | En el modelo |
|---|---|---|
| Identificador | `number` | `string` |
| Campo que puede ser nulo | `T \| null` | `T \| null` |
| Fecha | `string` ISO | `string` ISO |
| Lista | `T[]` | `T[]`, vacía como `[]` |