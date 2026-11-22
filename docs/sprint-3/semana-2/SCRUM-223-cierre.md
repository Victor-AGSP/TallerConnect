# SCRUM-223 — prioridades y cierre de Semana 2

Fecha: 2026-11-14. Rama exclusiva Victor. Siete entregables independientes; **validación frontend completada, aceptación autenticada real BLOCKED**. No se envió ningún push ni comunicación al equipo.

## Matriz y prioridades

[Matriz CSV de defectos](defectos.csv): siete IDs únicos con ticket, descripción, evidencia, impacto, severidad, prioridad, componente, responsable propuesto, estado, acción y justificación. Se verificaron todos los campos y archivos referenciados. **7 hallazgos, 6 corregidos, 1 abierto**. Incluye D-07, regresión del descubrimiento de fixtures introducida y corregida durante esta ejecución. Los bloqueos de cuentas, autorización, datos y dispositivo se registran como dependencias de QA, no como defectos backend inventados.

| ID | Impacto | Severidad / prioridad | Responsable propuesto | Estado |
| --- | --- | --- | --- | --- |
| D-01 | Consulta/título anterior al cambiar de orden | Alta / P1 | Frontend React Native | Corregido SCRUM-159 |
| D-02 | Denegación/error de órdenes mostrado como ausencia | Media / P2 | Frontend React Native | Corregido SCRUM-220 |
| D-03 | Presupuesto asociado a orden o ID incorrecto | Alta / P1 | Frontend servicios MS3 | Corregido SCRUM-160 |
| D-04 | 504 en consulta anónima de órdenes | Media / P2 | Gateway/MS2 e infraestructura | Abierto: origen por diagnosticar |
| D-05 | Demo ausente con total cero y datos de reemplazo | Baja / P3 | Frontend UI | Corregido SCRUM-222 |
| D-06 | Mensaje de decisión de A visible en orden B | Media / P2 | Frontend React Native | Corregido SCRUM-161 |
| D-07 | Fixture interpretada como suite vacía; CI falla | Baja / P2 | Frontend / QA | Corregido SCRUM-161 |

D-01 y D-03 comprometen la integridad de consultas principales, por eso P1; no se acreditó exposición backend. D-02 y D-06 afectan estados parciales de pantalla; P2. D-04 tiene una observación aislada sin información de permisos efectivos ni causa interna; P2 de investigación, sin declarar caída permanente o vulnerabilidad. D-07 bloquea CI y necesita corrección antes del cierre, aunque no afecte runtime; P2. D-05 queda circunscrito a la demostración; P3. No hay evidencia que justifique P0.

## Entregables y pruebas por ticket

Los PASS son aserciones Jest de las ejecuciones propias de cada ticket; las suites se solapan y **no se suman**. FAIL distingue los resultados finales de los fallos previos ya corregidos. Los conteos BLOCKED de 159/220/160/221 corresponden a los casos funcionales reales del encargo; sus variantes controladas sí se ejecutaron. Expo Go está bloqueado adicionalmente por falta de dispositivo observable (`adb` no disponible).

| Ticket | Estado | Pruebas PASS | Pruebas FAIL | Casos BLOCKED | Evidencia | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| SCRUM-159 | Frontend PASS; real parcial/BLOCKED | 64 Jest | 0 Jest finales; 1 HTTP 504; 3 iniciales corregidas | 8 casos autenticados/directos; anónimo de órdenes no evaluable | [Registro](SCRUM-159.md), [tests](evidencias/SCRUM-159.json) | `e5cc288d98ddd0266ab31d5d962eb39d07978a9e` |
| SCRUM-160 | Frontend PASS; real BLOCKED | 92 Jest; 1 GET anónimo 401 | 0 finales; 5 iniciales corregidas | 10 lecturas/refresh/persistencia reales | [Registro](SCRUM-160.md), [tests](evidencias/SCRUM-160.json) | `b1b2a81e36cbfb99e184fa2f6a5022a5e0053aaf` |
| SCRUM-161 | Correcciones PASS; coordinación preparada | 52 dirigidas; 866 regresión | 0 finales; 1 inicial y 1 suite vacía corregidas | Diagnóstico externo de D-04 | [Registro](SCRUM-161.md), [tests](evidencias/SCRUM-161.json) | `b819735aa9d22124e7d1ec2ff90be5b3ce474b3f` |
| SCRUM-220 | Frontend PASS; real BLOCKED | 71 Jest | 0 finales; 4 iniciales corregidas | 8 casos Cliente reales | [Registro](SCRUM-220.md), [tests](evidencias/SCRUM-220.json) | `d37ddaa5f09211438c451859a60139d91b6437ac` |
| SCRUM-221 | Consulta aprobada real BLOCKED | 81 Jest reutilizadas | 0 finales | 9 casos de presupuesto aprobado real | [Registro](SCRUM-221.md), [tests](evidencias/SCRUM-221.json) | `653a15351253f6dd81fc5a4e972bc8428d846360` |
| SCRUM-222 | Demo controlada PASS | 47 Jest (4 nuevas) | 0 finales; 1 inicial corregida | 0 para entrega demo controlada | [Registro](SCRUM-222.md), [tests](evidencias/SCRUM-222.json) | `c67598a237403d79127b32b677c0c3bb052cac48` |
| SCRUM-223 | Matriz y cierre PASS | Matriz 7 filas, enlaces/documentos y cierre verificados | 0 finales | 0 del entregable documental | [Matriz](defectos.csv), [validación final](evidencias/validacion-final.txt) | Commit de este archivo; resolver abajo |

El hash del commit SCRUM-223 se obtiene sin autorreferencia circular con `git log -1 --format=%H -- docs/sprint-3/semana-2/SCRUM-223-cierre.md`. El informe entregado al usuario incluye también ese séptimo hash. Cada registro individual tiene un comando equivalente y los seis hashes previos están fijados en esta tabla.

## Resultado técnico consolidado

- Suite final completa: **83 suites, 1320 PASS, 0 FAIL, 0 omitidas**, [resultados Jest](evidencias/final-suite.json). Base de esta ejecución: 78 suites / 1295 PASS; **25 pruebas nuevas**. Regresión: **46 suites / 866 PASS / 0 FAIL**, subconjunto de la completa, [resultado](evidencias/final-regression.json).
- Se conservaron evidencias de los fallos que originaron correcciones. La primera ejecución completa fue **FAIL**: 1320 aserciones PASS pero una fixture recolectada como suite vacía. Se corrigió D-07 y se repitieron suite completa, regresión, TypeScript y lint con resultado aprobado; no se presenta el intento fallido como éxito.
- Pruebas funcionales autenticadas reales: **0**. Pruebas móviles observadas: **0**. Sondas HTTP reales anónimas: **2**, una PASS (presupuestos 401) y una FAIL de disponibilidad (órdenes 504); sin token, login, cuerpos almacenados, IDs enumerados ni mutaciones. [HTTP saneado](evidencias/http-anonimo.json). El primer intento dentro del sandbox tuvo fallo DNS y se repitió con red autorizada.
- Órdenes: rutas y manejo 401/403/404, listado por vehículo, navegación y aislamiento PASS con dobles; propiedad/asignación y política efectiva por rol **BLOCKED real**. `orders.service.ts` no cambió. El filtro visual por vehículo no subsana ni demuestra autorización de servidor.
- Presupuestos: lectura y coherencia de relación corregidas; vacíos, errores, importes/versiones y navegación PASS con dobles. Nueva consulta al refrescar/reabrir PASS controlado; **persistencia real backend BLOCKED**, sin inferir DB desde estado local. Presupuesto aprobado real **BLOCKED**; no se aprobó ninguno para preparar datos.
- TypeScript exit **0**. Lint exit **0**, **0 errores / 46 advertencias preexistentes, sin nuevas**. Android export exit **0**, un bundle Hermes y metadata generados en `/tmp/tallerconnect-s3s2/android-final`. Es exportación, no APK instalado ni ejecución Expo Go. [Salida de herramientas](evidencias/validacion-final.txt).
- Configuración real: producción, Gateway `https://tallerconect.vercel.app/api`, mocks de auth/servicios y demo **false**, [resumen permitido](evidencias/configuracion-final.json). Ningún fixture nuevo se importa desde `src`; solo desde tests. No se modificaron `.env`, dependencias ni servicios productivos.
- Integridad Git: `git fsck --full --no-reflogs` exit **0**; objetos dangling informativos preservados. `git diff a1fd1fe --check` y revisión de servicios/rutas PASS. Árbol de trabajo limpio tras el commit final; siete commits en el orden 159 → 220 → 160 → 221 → 222 → 161 → 223.

`main` conserva `6bf6fd1aefd9560cdd04c7f1cdf989aae5bcd6a1` y `Develop` conserva `6a020ffe4b4f17a28e2aa51af8c4b21e8d0d3b31`, iguales a la auditoría inicial. No se hicieron checkout de esas ramas, merge, rebase, reset, limpieza destructiva ni push.

## Reproducción y pendientes externos

Comandos finales: `npm test`, `npm run test:regression`, `npm run typecheck`, `npm run lint`, `CI=1 EXPO_NO_TELEMETRY=1 npm run export:android -- --output-dir /tmp/tallerconnect-s3s2/android-final --max-workers 2`, `python3 scripts/validate-sprint3-docs.py docs/sprint-3/semana-2/*.md`, `git diff a1fd1fe --check`, `git fsck --full --no-reflogs`. Los JSON de evidencia son resúmenes de resultados realmente generados por Jest, con nombres/estados de aserciones, no respuestas de API.

Backend/Gateway necesita investigar **D-04**; no hay otro defecto backend confirmado por esta ejecución. QA y propietario del destino deben autorizar cuentas y dataset de dos clientes, mecánico y administrador, relaciones propias/ajenas y presupuesto ya aprobado. Se requiere dispositivo observable para Expo Go. [Preparación de coordinación](SCRUM-161.md) y [datos necesarios para aprobado](SCRUM-221.md). Hasta entonces los tickets con aceptación real mantienen sus bloqueos.

Archivos de SCRUM-223: este cierre, `defectos.csv`, resúmenes finales de suite/regresión, configuración y validación de herramientas. No agrega código runtime ni datos demo a producción.
