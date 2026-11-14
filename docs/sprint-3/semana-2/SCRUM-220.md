# SCRUM-220 — Cliente sin órdenes ajenas

Fecha: 2026-11-14. Objetivo: verificar listado, detalle, vacío, errores, actualización y reapertura. **Frontend controlado PASS; aceptación real BLOCKED** por falta de dos cuentas/dataset expresamente autorizados y dispositivo observable.

La ruta Cliente de vehículo consulta el vehículo y luego `/ordenes`, mostrando las relacionadas por `vehicleId`; abre `/(cliente)/ordenes/{id}`. El detalle consulta `/ordenes/{id}` y no carga vehículo si se deniega. El filtro por vehículo es una transformación visual; la autorización del listado y detalle depende de MS2. No se cambió el servidor ni se atribuye propiedad a `createdById`. Si MS2 devolviese órdenes ajenas sería un defecto backend pendiente de confirmar con el dataset autorizado.

## Defecto y cambio

D-02: `VehicleDetailScreen` capturaba fallos del listado y mostraba «Sin órdenes», incluso ante 401/403/503. Ahora separa error de órdenes del detalle válido del vehículo, muestra mensaje y reintento, y retira registros anteriores si falla el refresh. Una lista vacía exitosa conserva el estado vacío. Archivos: `src/components/vehicles/VehicleDetailScreen.tsx`, `__tests__/order-client-scope.test.tsx`, este registro y evidencias.

## Ejecución

`npm test -- --runTestsByPath __tests__/order-client-scope.test.tsx __tests__/cliente-real.test.tsx __tests__/order-functional.test.tsx __tests__/order-contract-compatibility.test.tsx __tests__/vehicle-list-integration.test.tsx`: **5 suites, 71 PASS, 0 FAIL**, [resultados](evidencias/SCRUM-220.json).

Ocho casos nuevos con servicios simulados: filtro por vehículo propio/exclusión de otro vehículo; detalle propio mediante navegación; detalle ajeno denegado; vacío válido; tres errores HTTP con recuperación; refresh/reapertura; refresh denegado sin datos anteriores. Los IDs son fixtures locales, sin correspondencia declarada con producción. El 401 simulado a nivel de servicio prueba la presentación; la invalidación de sesión por el interceptor está cubierta en SCRUM-159.

La primera ejecución de esta suite nueva reveló además sincronización incompleta del harness (aserciones antes de terminar consultas). Se corrigieron las esperas y pulsaciones; la [reproducción previa](evidencias/SCRUM-220-before.json) se repitió con esas esperas y la versión anterior del componente. Solo sus fallos de error/vacío se consideran evidencia de D-02. El resultado final anterior se ejecutó sobre el componente corregido.

TypeScript exit 0; `git diff --check` PASS. No se habilitaron mocks en `.env` ni se alteraron dependencias. La recuperación del estado al volver a abrir es una nueva lectura del servicio simulado, no persistencia en base de datos. Las rutas protegidas y el aislamiento al cambiar ID se reutilizan de [SCRUM-159](SCRUM-159.md).

| Caso real | Estado | Dependencia |
| --- | --- | --- |
| Lista propia, ausencia ajena, detalle propio y ajeno | BLOCKED | Dos clientes QA, órdenes y vehículos relacionados autorizados |
| Cuenta sin órdenes / refresh / reapertura | BLOCKED | Dataset y sesión autorizados; Expo Go observable |
| GET anónimo de órdenes | FAIL disponibilidad | 504 en la [sonda de esta ejecución](evidencias/http-anonimo.json), no prueba exposición de datos |

Commit de este registro: `git log -1 --format=%H -- docs/sprint-3/semana-2/SCRUM-220.md`; hash consolidado en SCRUM-223 e informe final. No se atribuye PASS a ninguna consulta autenticada real.
