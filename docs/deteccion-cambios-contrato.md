# Detección de cambios de contrato con OpenAPI

Este documento estudia cómo detectar los cambios en el contrato de la API de TallerConnect, publicado por cada microservicio en `/msN/openapi.json`, para saber a tiempo cuándo la app debe ajustarse.

## Qué es un cambio de contrato

Un cambio de contrato es cualquier modificación en el `openapi.json`: endpoints, parámetros, campos, tipos u obligatoriedad. No todos afectan a la app de la misma forma.

**Criterio:** un cambio es **incompatible** si una solicitud que antes era válida ahora puede ser rechazada, o si una respuesta puede traer algo distinto de lo que la app espera.

| Tipo | Ejemplos | Efecto en la app |
|---|---|---|
| **Compatible** | Endpoint nuevo; campo opcional nuevo en una solicitud; campo nuevo en una respuesta | Ninguno inmediato. Los mappers de la app solo leen los campos que conocen, así que un campo nuevo no se utiliza |
| **Incompatible** | Endpoint eliminado; campo eliminado o renombrado en una respuesta; cambio de tipo; campo que pasa de obligatorio a opcional en una respuesta; campo obligatorio nuevo en una solicitud | La app puede fallar al enviar datos o al validar y convertir respuestas |

**Casos del proyecto:**
- La aparición de `PUT /api/ordenes/{orden_id}/mecanico` es un cambio **compatible**: agrega funcionalidad sin afectar lo existente.
- `token_type` es opcional en `TokenRespuesta`, pero el schema de la app lo exigía. Es el tipo de diferencia que un cambio **incompatible** produce: una respuesta válida para la API habría sido rechazada por la app, y hubo que ajustar el DTO y el schema.

## Formas de detectarlo

| Método | Cómo funciona | Qué detecta | Limitación |
|---|---|---|---|
| **Revisión manual** | Leer `/msN/openapi.json` en el navegador y compararlo con la documentación del proyecto | Cualquier cambio, si se revisa con cuidado | Lenta y propensa a omisiones o malas lecturas, como confundir campos obligatorios con campos permitidos |
| **Copia del contrato en el repositorio** | Guardar el `openapi.json` de cada microservicio en el repositorio y reemplazarlo al actualizarlo; `git diff` muestra qué líneas cambiaron | Todo cambio, línea por línea | No distingue cambios compatibles de incompatibles |
| **oasdiff** | Herramienta de línea de comandos que compara dos versiones de un contrato (archivos o URLs). `oasdiff changelog` lista todos los cambios y `oasdiff breaking` solo los incompatibles, cada uno clasificado como error, advertencia o informativo | Endpoints, parámetros, campos, tipos y obligatoriedad, con su clasificación | Hay que instalarla (binario, Docker o GitHub Action) y tener una versión anterior del contrato con la cual comparar |
| **Tipos generados** | `openapi-typescript` genera tipos TypeScript desde el `openapi.json`. Si el contrato cambia y se regeneran, `tsc` marca cada uso incompatible en el código | Cambios que afectan al código que usa esos tipos | Los DTO de la app están escritos a mano; habría que basarlos en los tipos generados |
| **Pruebas de contrato** | Pruebas como `__tests__/auth-contract.test.ts` comparan los payloads y schemas de la app con los campos del contrato escritos en la prueba | Desvíos de la app respecto del contrato registrado | No detectan cambios del backend por sí solas: los campos del contrato están fijos en la prueba y hay que actualizarlos a mano |

## Comprobación práctica

Se compararon dos versiones de un contrato basado en los esquemas de MS2: la segunda agrega `PUT /ordenes/{orden_id}/mecanico`, renombra `marca` a `brand` en `VehiculoRespuesta`, agrega `kilometraje` y cambia `estado_codigo` de entero a texto.

**`oasdiff changelog`** detectó los cinco cambios:
- 2 errores (incompatibles): se eliminó la propiedad obligatoria `marca` de la respuesta de `GET /vehiculos`, y el tipo de `estado_codigo` cambió de `integer` a `string` en `GET /ordenes/{orden_id}`.
- 3 informativos (compatibles): endpoint `PUT /ordenes/{orden_id}/mecanico` agregado, y propiedades `brand` y `kilometraje` agregadas a la respuesta.

**`oasdiff breaking`** mostró solo los 2 errores.

**`openapi-typescript`:** con los tipos generados desde la primera versión, un código que usa `marca` compila. Al regenerarlos desde la segunda, `tsc` falla con "Property 'marca' does not exist".

## Propuesta de aplicación en TallerConnect

Un flujo posible, que combina los métodos anteriores y queda a decisión del equipo:

1. **Guardar una copia** de `/ms1/openapi.json` y `/ms2/openapi.json` en el repositorio (por ejemplo, en `docs/contratos/`) como referencia del contrato vigente.
2. **Comparar con oasdiff** la copia guardada con el contrato de producción al iniciar cada sprint o cuando Integración 2 anuncie cambios:
```
   oasdiff changelog docs/contratos/ms2.openapi.json https://tallerconect.vercel.app/ms2/openapi.json
```
3. **Si hay cambios incompatibles**, ajustar los DTO, schemas, payloads y pruebas de contrato afectados, y actualizar los documentos de integración.
4. **Reemplazar la copia** guardada por la nueva versión, para que `git diff` deje registro de qué cambió.

Más adelante, los tipos generados con `openapi-typescript` permitirían que `tsc` detecte automáticamente el código afectado, pero requieren cambiar la forma en que se escriben los DTO.