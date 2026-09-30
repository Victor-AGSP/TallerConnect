# Cliente Axios, Interceptores y Manejo Centralizado de Errores

Este documento detalla la arquitectura de comunicación HTTP entre la aplicación móvil **TallerConnect** y la **API Gateway** (desarrollada por Integración 2). Respalda el estudio de los interceptores en Expo, el tratamiento de variables de entorno y el análisis del formato de errores documentado en `endpoints.pdf`.

---

## 1. Configuración Base del Cliente Axios y Variables de Entorno

### Variables de Entorno en Expo
En Expo (React Native), las variables de entorno accesibles en tiempo de ejecución por el cliente JavaScript deben estar prefijadas obligatoriamente con `EXPO_PUBLIC_`. Cualquier otra variable es ignorada durante la compilación por motivos de seguridad.

- Variable oficial: `EXPO_PUBLIC_API_URL`
- Fallback por defecto: `'https://tallerconect.vercel.app/api'`

### Configuración del Cliente (`src/services/api/client.ts`)
Para evitar instancias dispersas de Axios que compliquen el mantenimiento o el monitoreo de peticiones, se centraliza una única instancia tipada:

```typescript
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS, // 15000 ms (15 segundos)
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});
```

- **Timeout de 15 segundos:** Definido para tolerar arranques en frío (*cold starts*) de servicios serverless en la nube y conexiones móviles inestables.
- **Cabeceras estándar:** Garantizan negociación de contenido en formato JSON tanto de ida como de vuelta.

---

## 2. Formato de Errores de la API Gateway (`endpoints.pdf`)

Al estudiar la especificación del backend provista por Integración 2 y el comportamiento de FastAPI / Pydantic, se identificaron los siguientes patrones:

### A. Respuestas de Error Estándar
Cuando ocurre una falla de negocio o autenticación, la API responde con un código HTTP 4xx o 5xx y un cuerpo JSON con la clave `detail`:

```json
{
  "detail": "Credenciales inválidas"
}
```

### B. Errores de Validación (HTTP 422 Unprocessable Entity)
Cuando los datos enviados en el cuerpo o parámetros no cumplen con el esquema Pydantic, FastAPI devuelve un array de validaciones:

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

### C. Normalización en la App (`normalizeApiError`)
Para evitar que la UI reciba objetos complejos o errores crudos de red que no pueda mostrar al usuario final, se implementó `normalizeApiError()` en `src/services/api/interceptors.ts`:

1. **Extracción de `detail`:** Si `detail` es texto, lo extrae directamente. Si es un array de Pydantic, extrae el primer mensaje comprensible (`detail[0].msg`).
2. **Fallbacks por código HTTP:** Si el backend responde sin mensaje o con un cuerpo vacío, asigna descripciones en español según el estándar HTTP:
   - `401 Unauthorized`: "Sesión expirada o no autorizada. Por favor, inicia sesión nuevamente."
   - `403 Forbidden`: "No tienes permisos para realizar esta acción."
   - `404 Not Found`: "El recurso solicitado no fue encontrado."
   - `409 Conflict`: "Conflicto con los datos ingresados (ej. patente duplicada)."
   - `422 Unprocessable Entity`: "Los datos enviados no son válidos o están incompletos."
   - `500+ Internal Server Error`: "Error interno en el servidor. Intenta nuevamente más tarde."
3. **Clasificación de fallas de conexión:**
   - **Timeout (`ECONNABORTED`):** Marca `isTimeout: true` y entrega un mensaje sobre tiempo de espera agotado.
   - **Falla de Red:** Si no existe `error.response` (sin conexión a internet, servidor caído o error de DNS), marca `isNetworkError: true`.

---

## 3. Interceptor de Solicitudes (Inyección de Token Bearer)

El backend de TallerConnect protege los endpoints de negocio exigiendo el encabezado HTTP:

```http
Authorization: Bearer <jwt_access_token>
```

### Funcionamiento (`attachAuthTokenInterceptor`)
En lugar de obligar a cada servicio o pantalla a consultar SecureStore y concatenar el encabezado manualmente, el interceptor de peticiones actúa como una capa transparente:

1. **Rutas Públicas (`skipAuth`):** Permite configurar `{ skipAuth: true }` en peticiones como `/auth/login` para evitar lecturas innecesarias de almacenamiento o envío de tokens residuales.
2. **Inyección segura:** Obtiene el token desde `storage.get(STORAGE_KEYS.AUTH_TOKEN)`. Si existe, lo inyecta mediante `config.headers.set('Authorization', 'Bearer ' + token)` o directamente en el objeto de cabeceras.
3. **Tolerancia a fallos:** Si no existe token o la lectura falla, la petición continúa sin romper el ciclo, permitiendo que el backend determine si la ruta requería o no autenticación.

---

## 4. Interceptor de Respuestas (Tratamiento de 401/403 y Auto-Logout)

El ciclo de vida del JWT de TallerConnect tiene una vigencia limitada (60 minutos) y carece de un endpoint de refresco (*refresh token*). Por lo tanto, cuando un token expira o es revocado, la API Gateway responderá con `HTTP 401 Unauthorized` o `HTTP 403 Forbidden`.

### Flujo de Coordinación de Cierre de Sesión (`attachErrorInterceptor`)

```
Petición Protegida ──────► Backend responde 401/403
                                 │
                                 ▼
                     ¿La URL es /auth/login
                      o tiene skipAuth: true?
                             /       \
                         SÍ /         \ NO
                           /           \
                 (Credenciales erróneas)  ▼
                 Fluye a la pantalla   useAuthStore.getState().logout()
                 de Login sin cerrar   ├── Borra SecureStore
                 sesión global.        └── Resetea estado Zustand
                                                 │
                                                 ▼
                                        RoleGuard / Expo Router
                                        redirige automáticamente
                                        al usuario a (auth)/login
```

### Prevención de Bucles Infinitos
Un error común en clientes HTTP es interceptar el 401 indiscriminadamente. Si el endpoint `/auth/login` falla por credenciales incorrectas, el servidor responde 401. El interceptor verifica explícitamente:
- `requestUrl.includes('/auth/login')`
- `config.skipAuth === true`

Si es un login fallido, **no ejecuta logout global**, permitiendo que el mensaje de "Correo o contraseña incorrectos" sea manejado localmente por el formulario de acceso.

---

## 5. Pruebas Automatizadas del Manejo de Errores

Para certificar la robustez y prevenir regresiones en futuras integraciones, todo este flujo cuenta con una suite completa de pruebas unitarias en `src/__tests__/interceptors.test.ts` (14 pruebas automatizadas con Jest):

- **Normalizador de errores:** Cobertura de mensajes de backend (`detail`), fallbacks por código de estado, timeouts de red y excepciones JavaScript.
- **Inyector de autorización:** Cobertura con token presente, sin token y con omisión explícita (`skipAuth`).
- **Manejador de respuestas:** Cobertura de auto-logout en 401/403 en endpoints protegidos, exclusión en login y adjunto de la propiedad `normalizedError` en la promesa rechazada.
