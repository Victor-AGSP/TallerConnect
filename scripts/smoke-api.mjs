#!/usr/bin/env node
import process from 'node:process';

const DEFAULT_GATEWAY = 'https://api-tallerconnect.inf.uct.cl/api';
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 10000);
const INVALID_TEST_TOKEN = 'tallerconnect-smoke-invalid-token';

const checks = [
  { name: 'Salud Gateway', path: process.env.SMOKE_HEALTH_PATH || '/health', kind: 'health' },
  { name: 'Salud global de servicios', path: '/health/servicios', kind: 'health' },
  { name: 'Salud MS2 Taller', path: '/health/servicios/ms2_taller', kind: 'health' },
  { name: 'Rechazo de token inválido', path: process.env.SMOKE_PROTECTED_PATH || '/ordenes', kind: 'auth' },
];

function help() {
  console.log(`TallerConnect — Smoke tests S3 (solo GET)\n\nUso: npm run smoke:api\n\nVariables:\n  SMOKE_API_URL         Gateway HTTPS (default: ${DEFAULT_GATEWAY})\n  SMOKE_HEALTH_PATH     Ruta Gateway health (default: /health)\n  SMOKE_PROTECTED_PATH  Ruta protegida (default: /ordenes)\n  SMOKE_TIMEOUT_MS      Timeout por solicitud (default: 10000)\n\nNo requiere JWT real. El test protegido usa un token ficticio inválido. No imprime cuerpos ni credenciales.`);
}

function validateGateway(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.pathname.replace(/\/+$/, '') !== '/api' ||
      url.search || url.hash || url.username || url.password) {
    throw new Error('SMOKE_API_URL debe ser HTTPS y terminar exactamente en /api.');
  }
  return url.toString().replace(/\/+$/, '');
}

async function runCheck(baseUrl, check) {
  const route = check.path.startsWith('/') ? check.path : `/${check.path}`;
  const headers = { Accept: 'application/json' };
  if (check.kind === 'auth') headers.Authorization = `Bearer ${INVALID_TEST_TOKEN}`;
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}${route}`, {
      method: 'GET', headers, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // Consumir y descartar el cuerpo: nunca exponer datos aunque el servidor falle en autorizar.
    await response.arrayBuffer();
    const status = response.status;
    let ok = false;
    let code = `HTTP_${status}`;
    let detail = `HTTP ${status}`;

    if (check.kind === 'health') {
      ok = status >= 200 && status < 300;
      code = ok ? 'HEALTH_OK' : `HEALTH_HTTP_${status}`;
      detail = ok ? 'Servicio responde' : 'No se confirmó salud del servicio';
    } else {
      ok = status === 401 || status === 403;
      code = status === 401 ? 'INVALID_TOKEN_REJECTED' : status === 403 ? 'ACCESS_DENIED' :
        status >= 200 && status < 300 ? 'SECURITY_FAILURE_DATA_EXPOSED' : `AUTH_HTTP_${status}`;
      detail = status === 401 ? 'Token inválido rechazado (401)' :
        status === 403 ? 'Acceso denegado (403)' :
        status >= 200 && status < 300 ? 'FALLO: ruta protegida aceptó token inválido' :
        `No se confirmó rechazo del token (HTTP ${status})`;
    }
    return { name: check.name, route, status, code, detail, ok, ms: Date.now() - started };
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    return { name: check.name, route, status: '—', code: timeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      detail: timeout ? `Timeout (${TIMEOUT_MS} ms)` : 'Error de red, DNS o TLS',
      ok: false, ms: Date.now() - started };
  }
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) return help();
  const baseUrl = validateGateway(process.env.SMOKE_API_URL || DEFAULT_GATEWAY);
  if (!Number.isFinite(TIMEOUT_MS) || TIMEOUT_MS <= 0) throw new Error('SMOKE_TIMEOUT_MS debe ser positivo.');
  if (process.argv.includes('--dry-run')) {
    console.log(`DRY RUN — ${new Date().toISOString()} — no se enviaron solicitudes.`);
    console.log(`Gateway: ${baseUrl}`);
    for (const check of checks) console.log(`GET ${check.path} (${check.kind === 'auth' ? 'token inválido ficticio' : 'sin autenticación'})`);
    return;
  }

  console.log(`TallerConnect — Smoke S3 — ${new Date().toISOString()}`);
  console.log(`Gateway: ${baseUrl}`);
  const results = [];
  for (const check of checks) results.push(await runCheck(baseUrl, check));
  console.table(results.map((r) => ({ prueba: r.name, ruta: r.route, HTTP: r.status,
    resultado: r.code, detalle: r.detail, ms: r.ms, correcto: r.ok ? 'Sí' : 'No' })));
  const passed = results.filter((r) => r.ok).length;
  console.log(`Resultado: ${passed}/${results.length} comprobaciones correctas.`);
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`No se pudo ejecutar el smoke test: ${error.message}`);
  process.exitCode = 2;
});
