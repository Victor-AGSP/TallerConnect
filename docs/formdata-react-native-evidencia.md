# FormData en React Native aplicado al contrato de evidencia

Este documento estudia cómo React Native construye y envía una solicitud `multipart/form-data`, y cómo se aplica a `POST /api/evidencias` (esquema `Body_subir_evidencias_post` de MS4). Se basa en el código instalado de React Native 0.86 y Axios 1.20, y en el envío actual de `EvidenceService` (`buildEvidenceFormData` en `src/mappers/evidence.mapper.ts`).

## Qué es multipart/form-data

Es un formato que divide el cuerpo de la solicitud en **partes** separadas por un texto llamado *boundary*. Cada parte tiene un nombre de campo; las de archivo agregan el nombre del archivo y su tipo:

```
Content-Type: multipart/form-data; boundary=XyZ

--XyZ
Content-Disposition: form-data; name="orden_id"

31
--XyZ
Content-Disposition: form-data; name="archivo"; filename="foto.jpg"
Content-Type: image/jpeg

<bytes del archivo>
--XyZ--
```

Todo campo que no es archivo viaja como **texto**. El backend reconstruye los tipos (entero, booleano) al leerlo.

## FormData en React Native

React Native trae su propia implementación de `FormData` (`react-native/Libraries/Network/FormData.js`), distinta de la del navegador:

| Aspecto | Comportamiento |
|---|---|
| Archivo | Se agrega como objeto `{ uri, name, type }`. La capa nativa lee el archivo desde `uri`; no se necesita `Blob` |
| Valores que no son objeto | Se convierten con `String()` |
| `name` | Se usa como `filename` de la parte, codificado con `encodeURIComponent` (las `/` se cambian por `_`) |
| `type` | Se usa como `Content-Type` de la parte. En Android es obligatorio en las partes de archivo: sin él la solicitud falla con "Binary FormData part needs a content-type header." En iOS, si el sistema detecta el tipo al leer el archivo, ese tipo reemplaza al declarado |
| Boundary | Lo genera la capa nativa, que fija `Content-Type: multipart/form-data; boundary=...` y reemplaza cualquier `Content-Type` multipart anterior |

La conversión con `String()` tiene consecuencias directas:

| Valor agregado | Texto enviado |
|---|---|
| `31` | `"31"` |
| `false` | `"false"` |
| `null` | `"null"` |
| `undefined` | `"undefined"` |

La codificación del nombre también: un archivo `mi foto.jpg` se envía como `filename="mi%20foto.jpg"`. Si el backend no lo decodifica, ese es el texto que queda como `nombre_original`.

## Envío con Axios

`apiClient` (`src/services/api/client.ts`) tiene `Content-Type: application/json` por defecto. Axios procesa el cuerpo en dos pasos, siempre en este orden: `lib/core/dispatchRequest.js` aplica las transformaciones del cuerpo y después llama al adaptador `xhr`.

1. **Transformación** (`lib/defaults/index.js`): si el cuerpo es un `FormData` y el `Content-Type` es JSON, lo convierte a JSON con `formDataToJSON`. Esa función necesita `entries()`, que el `FormData` de React Native no tiene, así que el resultado es el texto `"null"`.
2. **Adaptador** (`lib/helpers/resolveConfig.js`): si el cuerpo **todavía** es un `FormData` de React Native (lo reconoce por `getParts()`), Axios quita el `Content-Type` para que lo fije la capa nativa con su boundary.

Como la transformación ocurre primero, el paso 2 solo funciona si el paso 1 no convirtió el cuerpo:

| `Content-Type` de la solicitud | Cuerpo que recibe la capa nativa | `Content-Type` que recibe la capa nativa |
|---|---|---|
| Sin cambiar (hereda `application/json`) | Texto `"null"` | `application/json`: el archivo no se envía |
| `multipart/form-data` | El `FormData` | Ninguno: lo fija la capa nativa con el boundary |
| `undefined` | El `FormData` | Ninguno: lo fija la capa nativa con el boundary |

Por eso, con este cliente, el `Content-Type: multipart/form-data` que fija `EvidenceService` es **necesario**: reemplaza el JSON por defecto y evita la conversión del paso 1. No deja la solicitud sin boundary, porque en el paso 2 Axios lo quita y la capa nativa pone el definitivo. La recomendación general de no fijar `Content-Type` al enviar `FormData` en React Native supone un cliente sin `Content-Type` JSON por defecto.

```ts
const response = await apiClient.post<EvidenceResponseDto>('/evidencias', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress: (event) => { /* event.loaded, event.total */ },
});
```

Otros comportamientos del envío:

- **Progreso:** el `XMLHttpRequest` de React Native emite el progreso de subida que informa la capa nativa, así que `onUploadProgress` funciona en Android e iOS.
- **Timeout:** el timeout de 15 segundos de `apiClient` cubre la solicitud completa, incluida la transferencia del archivo, y `EvidenceService` no lo cambia. En una red lenta, un video grande puede superarlo y terminar como `EVIDENCE_TIMEOUT`. Axios permite fijar un `timeout` distinto por solicitud.
- **Reintentos:** la política de reintentos (`src/services/api/retry.ts`) solo reintenta `GET`, `HEAD` y `OPTIONS`. Un `POST` fallido no se repite solo, por lo que no se duplican evidencias.

## Diferencia en web

En Expo web, `FormData` es el del navegador. Al agregar un objeto `{ uri, name, type }`, el navegador lo convierte a texto y envía `"[object Object]"` en lugar del archivo. En web, el archivo debe agregarse como `Blob` o `File`, por ejemplo con `fetch(uri).then((r) => r.blob())`. `toFormDataFilePart` convierte los archivos de `media-picker.ts` en `{ uri, name, type }` en todas las plataformas, así que con ellos la subida de evidencias solo funciona en Android e iOS.

## Aplicación al contrato de evidencia

| Campo | Contrato | Cómo se agrega a `FormData` | Sin valor |
|---|---|---|---|
| `archivo` | Binario, obligatorio | `{ uri, name, type }`, con `type` siempre presente | No aplica |
| `orden_id` | Entero `> 0`, obligatorio | Texto del entero: `"31"` | No aplica |
| `contexto` | `ContextoEvidencia`, obligatorio | Texto tal cual: `"diagnostico"` | No aplica |
| `presupuesto_id` | Entero `> 0` o `null`, opcional | Texto del entero: `"2"` | Se omite el campo |
| `visible_cliente` | Booleano o `null`, opcional | `"true"` o `"false"` | Se omite el campo |

**Valores nulos.** Multipart no puede representar `null`. Si se agregan directamente al `FormData`, `null` y `undefined` producen textos distintos (`"null"` y `"undefined"`), y el backend no puede interpretar ninguno como entero ni como booleano. Como `presupuesto_id` y `visible_cliente` no son obligatorios, la forma de indicar que no tienen valor es **omitir el campo**. `buildEvidenceFormData` trata `null` y `undefined` de la misma forma: en ambos casos omite el campo.

**Interpretación en el backend.** El contrato de MS4 lo genera FastAPI (esquemas `Body_subir_evidencias_post` y `HTTPValidationError`), que convierte los campos de formulario con Pydantic: `"31"` pasa a `31` y `"true"` o `"false"` pasan a booleano. Un texto que no representa un entero válido, como `"ot-00124"` o `"1.5"`, o un entero que no sea mayor que 0, se rechaza con `422`. Por eso el valor de un identificador debe representar un entero positivo antes de agregarlo al `FormData`.

## Comportamiento comprobado

Con el `FormData` de React Native y un `XMLHttpRequest` simulado se comprobó que:

- `append` convierte `null`, `undefined`, `false` y `31` en `"null"`, `"undefined"`, `"false"` y `"31"`.
- Un archivo con `name: 'mi foto.jpg'` genera `filename="mi%20foto.jpg"` y su `type` queda como `Content-Type` de la parte.
- Con el `Content-Type` JSON del cliente, Axios envía el texto `"null"` con `Content-Type: application/json`.
- Con `Content-Type: multipart/form-data`, Axios entrega el `FormData` sin `Content-Type`.

El manejo del boundary y la obligatoriedad de `type` en Android se tomaron del código nativo de React Native (`RCTNetworking.mm` y `NetworkingModule.kt`).

## Referencias

- [React Native: Networking](https://reactnative.dev/docs/network)
- [Axios: multipart/form-data](https://axios-http.com/docs/multipart)
- [MDN: FormData.append()](https://developer.mozilla.org/en-US/docs/Web/API/FormData/append)
- [FastAPI: formularios y archivos](https://fastapi.tiangolo.com/tutorial/request-forms-and-files/)
- [Pydantic: tabla de conversiones](https://docs.pydantic.dev/latest/concepts/conversion_table/)