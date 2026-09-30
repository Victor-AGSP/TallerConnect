# Auditoría de tareas de Victor

Fecha de revisión: 27-09-2026. Rama: `Victor` (respeta mayúscula inicial). Base revisada: `c0dca50`.

## Método y conclusión

Se inspeccionaron archivos de producción, consumidores, pruebas, configuración y contenido/historial de los commits. Todos los commits originales de la tabla son ancestros de `Victor`. También se consultó GitHub Actions: el pipeline de la base estaba aprobado ([ejecución 36368959588](https://github.com/Victor-AGSP/TallerConnect/actions/runs/36368959588)).

La base pasaba 80 pruebas, pero tenía defectos no cubiertos. Se escribieron pruebas que fallaron antes de corregir el código: prioridad visual de errores de Input, fallos de persistencia/migración, operaciones que restauraban una sesión tras Logout o borraban un login posterior, y aceptación de usuarios inactivos/identificadores inválidos en AuthService. Por tanto, el estado anterior no justificaba considerar todas las tareas correctamente terminadas.

Los commits de corrección llevan `Corrección: ` seguido del nombre de la tarea. Una corrección puede reforzar varias tareas relacionadas sin duplicar el mismo cambio en varios commits.

## Matriz de las 20 tareas

| Tarea exacta | Commit original asociado | Resultado de auditoría / corrección | Evidencia y alcance |
| --- | --- | --- | --- |
| Implementar componentes base reutilizables: Button, Input, Card, Loading y ErrorMessage | a265dba | Verificada; ajuste posterior de Input en 9dfc050 | Los cinco componentes existen en src/components/common; pruebas de render, interacción y estados. |
| Completar componentes reutilizables iniciales | 3939014, 1f889f4 | Verificada | Dos commits originales; variantes, estados de carga/deshabilitado, ayuda, errores y reintento. |
| Crear pruebas unitarias de componentes comunes | 7457c05 | Corregida: e1a1f2d; ampliada: 9dfc050 | 22 casos actuales; se corrigieron eventos asíncronos que no se esperaban. |
| Integrar componentes comunes en Login y Home | 9939eb3 | Corregida: 9dfc050 | Login y panel cliente usan componentes comunes; los estilos de Login ocultaban el borde de error de Input. |
| Crear utilidades de pruebas y providers comunes para Router/Zustand | 15f211a | Corregida y comprobada: e1a1f2d | Se probó composición de providers, estado inicial, suscripción real, reset y navegación; se retiró la reexportación incompatible de testRouter. |
| Estudiar mocks y patrones de React Native Testing Library aplicados a Expo Router y Zustand | b7234dd | Corregida: e1a1f2d | Ejemplos ejecutables actualizados a RNTL 14. Se corrobora el material y su ejecución; no se puede auditar el aprendizaje personal. |
| Agregar pruebas básicas de accesibilidad y estados de los componentes reutilizables | 3f30106 | Verificada; ampliada: 9dfc050, e1a1f2d | Etiquetas, alertas, loading, disabled, Input no editable y reintentos. Sin validación en lector de pantalla físico. |
| Integrar Login con AuthService y Zustand | c99f5c1 | Corregida: 759958a, 96e34e6 | Servicio real probado con HTTP simulado; rechazo de cuenta inactiva/id inválido; no autentica si falla la persistencia. |
| Implementar identificación del rol autenticado | 4145229 | Verificada; validación reforzada: 759958a | Tres roles reconocidos, redirección por rol y rechazo de roles desconocidos. Se usa el primer rol recibido; no hay selección multirrol. |
| Crear pruebas del flujo de autenticación | 46b4692 | Verificada y ampliada: 759958a, 96e34e6 | Validación de formulario, error y éxito; se añadió cobertura del servicio HTTP y fallos de almacenamiento. |
| Integrar persistencia y recuperación de sesión mediante SecureStore | 033e476 | Corregida: 96e34e6; reforzada: 268b6f1, fa3dac1 | Errores de lectura/escritura visibles, migración real, protección de operaciones concurrentes y pruebas de adaptadores web/nativo. |
| Implementar limpieza de sesión y datos locales durante Logout | 033e476, 458a92a | Corregida: 268b6f1 | No existía un commit original con el título exacto. El store y los botones aportaban la funcionalidad; se corrigieron carreras, borrado de claves y reintento visible. |
| Crear prueba de integración de rutas protegidas según sesión y rol | d1c37e6 | Verificada | Layouts reales y guard compartido: ausencia de sesión, acceso permitido, cruce de roles y espera de recuperación. |
| Ejecutar pruebas completas del flujo Login → rol → Logout | 368b619 | Reforzada: 268b6f1, 42e079f | 9 casos: flujo de los tres roles, reintento de logout y arranque/reinicio con RootLayout real. |
| Ejecutar pruebas de acceso diferenciado por rol | 7e76d68 | Verificada para navegación local | 16 casos en protected-routes: 3 sin sesión, 3 permitidos, 6 cruces rechazados, 3 cambios de rol y 1 espera de recuperación. |
| Integrar y corregir defectos finales de Sprint 1 | af116fe | El cierre anterior era insuficiente; defectos corregidos en esta auditoría | El commit original agregó CI, entorno y ajustes de logout. No acreditaba ausencia de defectos. Esta auditoría corrige los reproducidos; no certifica la integración con backend ni todo el producto. |
| Ejecutar regresión automatizada de autenticación, navegación y componentes comunes | 17b92ef | Corregida: fa3dac1 | La lista fija excluía nuevas suites; ahora descubre auth-*, rutas, componentes y utilidades automáticamente. |
| Configurar comando estable de pruebas para ejecución local y CI | 1673a1e | Corregida: 20b2ab0 | npm test/test:ci secuencial, CI existente funcional; requisitos Node alineados con RNTL y lockfile. Comprobado con Node 24.21.0. |
| Crear checklist de integración móvil con los contratos de la API Gateway | fa5f52d | Corregida: 07627c3 | Checklist contrastado y documentación enlazada actualizada; diferencia implementación, mocks y contrato oficial pendiente. |
| Revisar y refactorizar componentes compartidos utilizados por varios flujos | c0dca50 | Verificada dentro del alcance del commit | AppButton e InfoCard reutilizan Button/Card; los tres paneles usan Button. Los alias siguen probados; no equivale a refactorizar todas las pantallas. |

## Correcciones reproducidas

1. **Input en Login:** los estilos personalizados y el estilo de foco reemplazaban el borde de error. Dos pruebas fallaron antes del ajuste y pasaron después.
2. **Persistencia:** la capa de almacenamiento ocultaba fallos; login/setAuth podían autenticar sin guardar. Una lectura fallida se trataba como sesión ausente y provocaba borrados. La recuperación de claves antiguas no completaba su migración. Cuatro pruebas reprodujeron estas diferencias.
3. **Logout concurrente:** login HTTP pendiente, recuperación pendiente, escritura pendiente y borrado anterior podían dejar memoria y almacenamiento en desacuerdo. Cuatro pruebas fallaron; ahora hay invalidación por operación y una cola de escrituras/borrados. Se intenta limpiar todas las claves y la UI permite reintentar un fallo.
4. **Servicio real de login:** las pruebas existentes sustituían AuthService completo. Tres casos nuevos demostraron que se aceptaban cuenta inactiva e id ausente/nulo; la validación ocurre ahora antes de convertir el id a texto y descartar is_active.
5. **Patrones de pruebas:** se esperaron los eventos async, se corrigieron ejemplos de Router y se ejecutaron los ejemplos. Se retiró del helper local testRouter, incompatible con la combinación instalada de Expo Router/RNTL.
6. **Regresión y entorno:** se reemplazó la lista fija de suites, se agregaron pruebas de almacenamiento web/nativo y se corrigió el requisito Node 20 que contradecía RNTL 14.
7. **Documentación Gateway:** se eliminó la referencia a apiLogin inexistente y la descripción de DTO/mappers como carpetas por crear; el checklist especifica qué pruebas usan simulaciones y qué falta acordar.

## Evidencia ejecutable

- `__tests__/common-components.test.tsx`: 22 casos de componentes, compatibilidad, estados y accesibilidad básica.
- `__tests__/test-utils.test.tsx`: 4 casos de providers, Zustand y Router real.
- `__tests__/auth-service.test.ts`: 13 casos del servicio real con HTTP simulado, incluidos tres roles y modo demo.
- `__tests__/auth-session.test.tsx`: 9 casos de persistencia, migración, recuperación y fallos.
- `__tests__/auth-logout.test.ts`: 5 casos de concurrencia y limpieza/reintento.
- `__tests__/auth-storage.test.ts`: 10 casos de adaptadores web/nativo y errores sanitizados.
- `__tests__/auth-full-flow.test.tsx`: 9 casos del flujo, reintento y reinicio para los tres roles.
- `__tests__/protected-routes.test.tsx`: 16 casos de permisos locales y recuperación.
- Se conservan las suites de mapper, schemas, rol, formulario de login y entorno.

## Verificación final local

Entorno: Node 24.21.0, dependencias reinstaladas desde el lockfile con `npm ci --offline --no-audit --no-fund` (caché local).

| Comando | Resultado |
| --- | --- |
| `npm run test:ci` | 13 suites, 124 pruebas aprobadas |
| `npm run test:regression` | 12 suites, 123 pruebas aprobadas |
| `npm run typecheck` | Sin errores |
| `npm run export:android` | Bundle Android generado, 1374 módulos |
| `git diff --check` | Sin errores de whitespace |

La exportación genera un bundle; no instala una APK ni ejecuta pruebas instrumentadas en un dispositivo.

## Límites y pendientes reales

- No hay OpenAPI oficial ni entorno Gateway verificado en este repositorio. No se certifican contratos ni autorización del servidor con estas pruebas.
- El modo predeterminado de autenticación es demo. La ruta HTTP se activa con `EXPO_PUBLIC_USE_MOCK_AUTH=false`; su validación aquí usa un cliente HTTP simulado.
- Aún faltan envío del token para operaciones protegidas, tratamiento de expiración/renovación y normalización de errores Gateway conforme al contrato. El control local de rutas no sustituye la autorización del servidor.
- Los demás dominios continúan con datos de demostración. No se declara finalizado todo Sprint 1/producto por tener CI aprobado.
- No se probó en dispositivos físicos, emuladores ni lectores de pantalla; las pruebas nativas simulan SecureStore. El adaptador web usa localStorage, no SecureStore.
- Si el dispositivo rechaza la eliminación de datos, el cierre es inmediato en memoria pero se informa del fallo y se ofrece reintento. Hasta que la limpieza tenga éxito pueden persistir datos en el dispositivo.
- El cambio preexistente del usuario en `package-lock.json` (`dev: true` de fsevents) se preserva fuera de los commits de auditoría. El ajuste del requisito Node en ese archivo se registra por separado.
