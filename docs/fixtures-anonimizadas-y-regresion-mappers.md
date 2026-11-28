# Fixtures anonimizadas y regresión de mappers

Este documento describe las fixtures con respuestas reales de la API Gateway que conserva el proyecto, cómo se anonimizaron y qué pruebas automatizan su transformación de DTO a modelo. Todas las respuestas se obtuvieron con las cuentas de prueba de cada rol, usando solo consultas de lectura (`GET`). Las respuestas originales nunca se incorporaron al repositorio.

## Fixtures

Las fixtures están en `src/mocks/gateway/`.

| Archivo | Endpoint | Cuenta | Registros | Gateway usada |
|---|---|---|---|---|
| `auth-me.gateway.ts` | `GET /api/auth/me` | Cliente, mecánico y administrador | 3 usuarios, uno por rol | Anterior (`https://tallerconect.vercel.app/api`), ya retirada |
| `vehicles.gateway.ts` | `GET /api/vehiculos` | Cliente | 3 vehículos | Anterior, ya retirada |
| `orders.gateway.ts` | `GET /api/ordenes` | Administrador | 3 órdenes | Anterior, ya retirada |
| `budgets.gateway.ts` | `GET /api/presupuestos` y `GET /api/presupuestos/{presupuesto_id}` | Administrador | 4 presupuestos, como resumen y como detalle | UCT (`https://api-tallerconnect.inf.uct.cl/api`) |
| `parts.gateway.ts` | `GET /api/repuestos` | Administrador | 1 repuesto | UCT |
| `providers.gateway.ts` | `GET /api/proveedores` y `GET /api/proveedores/{proveedor_id}` | Administrador | 1 proveedor, como resumen y como detalle | UCT |

Cubren MS1 (usuarios), MS2 (vehículos y órdenes) y MS3 (presupuestos, repuestos y proveedores). Las evidencias de MS4 no tienen fixtures reales: su contrato se audita en las tareas de la Semana 3.

## Anonimización

**Se reemplazó** por valores ficticios:

- Identificadores.
- Patentes, que conservan su formato: letras y dígitos, o solo dígitos.
- Correos: los usuarios usan `example.invalid` y el proveedor, `proveedor.example`.
- Nombres de usuarios.
- Fechas, que conservan su formato y su orden dentro de cada archivo.

**Se conservó** tal como lo entregó la API:

- Estados, importes, cantidades y valores nulos.
- Marcas, modelos, años y kilometrajes.
- Descripciones de ítems y motivos de decisión.
- Nombres de repuestos y el nombre del proveedor de prueba.

**Ninguna fixture contiene:**

- Contraseñas.
- Tokens. La prueba de login de `gateway-schema-conformity.test.ts` arma su respuesta con un token ficticio escrito en la propia prueba, no en una fixture.
- Datos personales reales.

Cada identificador usa una centena ficticia según su entidad. Así se conservan las relaciones entre registros de distintos archivos:

| Entidad | Campos | Centena |
|---|---|---|
| Vehículo | `vehiculo_id` | 1xx |
| Orden | `orden_id` | 2xx |
| Ingreso | `ingreso_id` | 3xx |
| Presupuesto | `presupuesto_id` | 4xx |
| Usuario | `id`, `cliente_id`, `mecanico_actual_id`, `creado_por_id`, `devuelto_por_id`, `cliente_usuario_id` | 5xx: `501` cliente, `502` mecánico, `503` administrador |
| Repuesto | `repuesto_id` | 6xx |
| Ítem de presupuesto | `item_id` | 7xx |
| Decisión de presupuesto | `decision_id` | 8xx |
| Proveedor | `proveedor_id` | 9xx |

## Relaciones entre fixtures

Se mantienen estas relaciones:

- Los vehículos pertenecen al cliente `501`.
- Las órdenes las crea el administrador `503`. Las órdenes `201` y `202` corresponden a los vehículos `101` y `102`, y su mecánico es `502`.
- Los presupuestos `401`, `402` y `403` corresponden a las órdenes `201`, `202` y `203`.
- Las versiones las crea el mecánico `502` y las decide el cliente `501`.
- Los ítems de repuesto apuntan al repuesto `601`, que pertenece al proveedor `901`. El detalle de ese proveedor incluye el mismo repuesto.

Hay tres registros que no están en las fixtures:

| Registro | Dónde aparece | Por qué no está |
|---|---|---|
| Vehículo `104` | Orden `203` | La fixture de vehículos se capturó con la cuenta del cliente, y el vehículo `104` solo aparece en la respuesta de órdenes del administrador. No se pudo confirmar su dueño. |
| Usuario `506` | Mecánico de la orden `203` | `auth-me.gateway.ts` tiene un usuario por rol, el de cada cuenta de prueba. |
| Orden `206` | Presupuesto `404` | La fixture de órdenes se capturó en otra fecha y no incluye esa orden. |

Las fechas ficticias **no son comparables entre archivos**. Cada fixture se anonimizó por separado, así que el orden de las fechas solo vale dentro de un mismo archivo. Por ejemplo, en las fixtures la orden `203` figura devuelta en febrero y su presupuesto `403`, creado en marzo. Las pruebas no relacionan fechas de fixtures distintas.

## Hallazgos de las respuestas reales de MS3

- **No fue necesario cambiar código.** Los esquemas aceptan las respuestas reales y los mappers las representan correctamente.
- **Campo `vigente`.** La API agrega `vigente` en cada versión de presupuesto, pero el contrato de la app no lo declara. El esquema lo descarta sin perder información, porque `version_vigente` del presupuesto identifica la misma versión. La fixture lo conserva con el tipo `BudgetVersionGatewayResponse`.
- **Campos que no llegan al modelo.** `tipo_distribuidor`, `proveedor_tipo_distribuidor` y `umbral_general` están declarados en los DTO y en los esquemas, pero los mappers los descartan, porque ningún modelo los representa. La información de umbral de cada repuesto sí se conserva en `umbral_efectivo`.
- **Modelos duplicados.** Repuestos y proveedores tienen dos representaciones paralelas: `Part`/`Provider`, con `part.mapper` y `provider.mapper`, y `SparePart`/`Supplier`, con `parts.mapper`. Las pantallas usan la segunda. `parts.mapper` solo conserva el `total` de las páginas, sin `desde` ni `limite`.
- La incorporación de esos campos y la unificación de los modelos quedan para la tarea de la Semana 4 "Unificar tipos compartidos".

## Limitaciones

- Los cuatro presupuestos reales tienen una sola versión y ninguno es una modificación (`es_modificacion: true`). No hay casos reales con varias versiones o con una versión vigente distinta de la primera, y no se inventaron dentro de fixtures presentadas como respuestas reales.
- Hay un solo repuesto y un solo proveedor. Ningún repuesto real tiene `umbral_particular` con valor.
- Los vehículos reales no tienen `anio` ni `kilometraje` en `null`. Esos casos se cubren con las fixtures de contrato de `src/mocks/payloads/`.
- La relación `501` = cliente y `502` = mecánico en los presupuestos sigue la convención de anonimización. Ninguna respuesta de MS3 la confirma por sí sola.
- No hay fixtures reales de historial de estados, avisos, alertas de stock ni evidencias.

## Pruebas de mappers

Estas suites usan las fixtures de `src/mocks/gateway/`:

| Suite | Qué comprueba | Pruebas |
|---|---|---|
| `__tests__/mapper-regression.test.ts` | En cada fixture, la ausencia de credenciales y tokens, los correos ficticios y las centenas de los identificadores. Las relaciones entre fixtures y sus excepciones. La salida completa de cada mapper de la capa de contratos, comparada campo por campo con `toStrictEqual`. | 34 |
| `__tests__/ms3-gateway-response.test.ts` | Presupuestos, repuestos y proveedores reales: esquemas, totales, cantidades decimales, estados aprobado y rechazado, `vigente`, paginación, y correspondencia entre `part.mapper`/`provider.mapper` y `parts.mapper` | 14 |
| `__tests__/auth-me-gateway-response.test.ts` | Campos del contrato, esquema, rol y correo ficticio de cada usuario | 12 |
| `__tests__/vehicle-gateway-response.test.ts` | Campos y esquema de los vehículos reales | 2 |
| `__tests__/gateway-contract-contrast.test.ts` | Órdenes reales y casos incompatibles O1, O2 y V1 a V4 | 8 |
| `__tests__/gateway-schema-conformity.test.ts` | Esquemas de órdenes y autenticación frente a respuestas reales y errores de validación | 10 |
| `__tests__/gateway-missing-fields.test.ts` | Campos ausentes, nulos e inválidos en respuestas HTTP | 5 |
| `__tests__/mapper-ids-dates-nulls.test.ts` | Identificadores, fechas y valores nulos, y la compatibilidad que se mantiene fuera de contrato | 20 |
| `__tests__/plate-normalization.test.ts` | Patentes reales y su presentación | 14 |
| `__tests__/order-date-display.test.tsx` | Fechas válidas e inválidas de órdenes en la vista | 15 |

La regresión cubre estos mappers:

- `mapUserResponse`
- `mapVehicleResponse`
- `mapOrderResponse`
- `mapBudgetDetailResponse` y `mapBudgetPageResponse`, de `budget.mapper` y de `budget-management.mapper`
- `mapPartPageResponse`
- `mapProviderPageResponse` y `mapProviderDetailResponse`

`parts.mapper` se contrasta con las mismas fixtures en `ms3-gateway-response.test.ts`.

### Ejecución

```powershell
npx jest __tests__/mapper-regression.test.ts __tests__/ms3-gateway-response.test.ts __tests__/auth-me-gateway-response.test.ts __tests__/vehicle-gateway-response.test.ts __tests__/gateway-contract-contrast.test.ts __tests__/gateway-schema-conformity.test.ts __tests__/gateway-missing-fields.test.ts __tests__/mapper-ids-dates-nulls.test.ts __tests__/plate-normalization.test.ts __tests__/order-date-display.test.tsx
```

Resultado del 28 de noviembre de 2026, en la rama `Leo`:

- **Las 10 suites:** 134 pruebas aprobadas.
- **Suite completa del proyecto:** 91 suites y 1502 pruebas aprobadas.

Además, se comprobó que la regresión detecta cambios. Cada uno de estos cambios temporales hizo fallar la suite, y después se deshizo:

- Un token agregado a una fixture.
- Un identificador fuera de su centena.
- Un campo nuevo en `mapVehicleResponse`.
- Una orden que apunta a un vehículo inexistente.

Las pruebas no se conectan a la Gateway ni requieren credenciales.

### Mantenimiento

- **Si un mapper cambia a propósito,** por ejemplo porque cambió el contrato, se actualizan los valores esperados de `mapper-regression.test.ts` y este documento. Si cambia sin intención, la prueba falla y muestra el campo afectado.
- **Para incorporar una nueva respuesta real:**
  1. Capturarla solo con consultas de lectura y con cuentas de prueba.
  2. Guardar la respuesta original fuera del repositorio.
  3. Anonimizarla con las centenas de la tabla.
  4. Agregar su archivo a `FIXTURES` en `mapper-regression.test.ts`, para que se verifique su anonimización.