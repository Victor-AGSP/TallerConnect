#!/usr/bin/env node
import process from 'node:process';

const DEFAULT_GATEWAY = 'https://tallerconect.vercel.app/api';
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 10000);
const HEALTH_PATH = process.env.SMOKE_HEALTH_PATH || '/health';

const checks = [
  { name: 'Vehículos', path: '/vehiculos', requiresAuth: true },
  { name: 'Órdenes', path: '/ordenes', requiresAuth: true },
  { name: 'Presupuestos', path: '/presupuestos', requiresAuth: true },
];

function help() {
  console.log('TallerConnect — Smoke tests HTTP de solo lectura\n\n' +
    'Uso: npm run smoke:api\n\n' +
    'Variables:\n' +
    '  SMOKE_API_URL       Gateway (default: ' + DEFAULT_GATEWAY + ')\n' +
    '  SMOKE_API_TOKEN     JWT autorizado (no se imprime)\n' +
    '  SMOKE_HEALTH_PATH   Ruta de salud (default: /health)\n' +
    '  SMOKE_TIMEOUT_MS    Timeout por solicitud (default: 10000)\n\n' +
    'Solo ejecuta GET. No crea, modifica ni elimina datos.');
}

function validateGateway(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' ||
      url.origin !== new URL(DEFAULT_GATEWAY).origin ||
      url.pathname.replace(/\/+$/, '') !== '/api' ||
      url.search || url.hash || url.username || url.password) {
    throw new Error('SMOKE_API_URL debe ser la Gateway HTTPS autorizada y terminar exactamente en /api.');
  }
  return url.toString().replace(/\/+$/, '');
}

function classify(status, isHealth) {
  if (status >= 200 && status < 300) return { code: 'OK', label: 'Correcto', ok: true };
  if (status === 401) return { code: 'AUTH_REQUIRED', label: 'Token ausente, inválido o expirado', ok: false };
  if (status === 403) return { code: 'FORBIDDEN', label: 'Rol sin permiso para esta lectura', ok: false };
  if (status === 404 && isHealth) return { code: 'HEALTH_ROUTE_NOT_FOUND', label: 'Ruta de salud no publicada o incorrecta', ok: false };
  if (status === 404) return { code: 'NOT_FOUND', label: 'Ruta o recurso no encontrado', ok: false };
  if (status === 429) return { code: 'RATE_LIMITED', label: 'Límite de solicitudes alcanzado', ok: false };
  if (status === 400 || status === 422) return { code: 'REQUEST_INVALID', label: 'Solicitud rechazada por validación/contrato', ok: false };
  if (status === 502 || status === 503 || status === 504) return { code: 'UPSTREAM_UNAVAILABLE', label: 'Gateway o servicio backend no disponible', ok: false };
  if (status >= 500) return { code: 'SERVER_ERROR', label: 'Error interno de Gateway/backend', ok: false };
  if (status >= 400) return { code: 'HTTP_ERROR', label: 'Respuesta HTTP de error', ok: false };
  return { code: 'UNEXPECTED_STATUS', label: 'Código HTTP inesperado', ok: false };
}

async function runCheck(baseUrl, check, token) {
  const route = check.path.startsWith('/') ? check.path : '/' + check.path;
  const headers = { Accept: 'application/json' };
  if (check.requiresAuth) headers.Authorization = 'Bearer ' + token;
  const started = Date.now();

  try {
    const response = await fetch(baseUrl + route, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'error',
    });
    const elapsed = Date.now() - started;
    const body = await response.text();
    let validJson = true;
    if (body.length > 0) {
      try { JSON.parse(body); } catch { validJson = false; }
    }
    const result = classify(response.status, check.isHealth);
    if (result.ok && !validJson) {
      return { name: check.name, path: route, status: response.status, code: 'INVALID_JSON',
        label: 'Respuesta exitosa, pero el cuerpo no es JSON válido', ok: false, elapsed };
    }
    return { name: check.name, path: route, status: response.status,
      code: result.code, label: result.label, ok: result.ok, elapsed };
  } catch (error) {
    const timeout = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return { name: check.name, path: route, status: '—',
      code: timeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      label: timeout ? 'Timeout después de ' + TIMEOUT_MS + ' ms' : 'Falla de red, TLS o DNS',
      ok: false, elapsed: Date.now() - started };
  }
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) return help();

  const baseUrl = validateGateway(process.env.SMOKE_API_URL || DEFAULT_GATEWAY);
  const token = (process.env.SMOKE_API_TOKEN || '').trim();
  if (!token) throw new Error('Falta SMOKE_API_TOKEN. Define un JWT temporal de integración; no lo escribas en comandos ni lo compartas.');
  if (!Number.isFinite(TIMEOUT_MS) || TIMEOUT_MS <= 0) throw new Error('SMOKE_TIMEOUT_MS debe ser positivo.');

  const plan = [
    { name: 'Salud Gateway', path: HEALTH_PATH, requiresAuth: false, isHealth: true },
    ...checks,
  ];

  if (process.argv.includes('--dry-run')) {
    console.log('DRY RUN — No se enviaron solicitudes HTTP.');
    console.log('Gateway: ' + baseUrl);
    console.log('Timeout: ' + TIMEOUT_MS + ' ms');
    for (const check of plan) console.log('GET ' + check.path + (check.requiresAuth ? ' (Bearer requerido)' : ' (sin autenticación)'));
    return;
  }

  console.log('TallerConnect — Smoke tests de solo lectura');
  console.log('Gateway: ' + baseUrl);
  console.log('Token: configurado (valor oculto)\n');

  const results = [];
  for (const check of plan) results.push(await runCheck(baseUrl, check, token));

  console.table(results.map((item) => ({
    prueba: item.name, ruta: item.path, HTTP: item.status,
    clasificación: item.code, resultado: item.label, ms: item.elapsed,
    ok: item.ok ? 'Sí' : 'No',
  })));

  const failed = results.filter((item) => !item.ok);
  console.log('Resultado: ' + (results.length - failed.length) + '/' + results.length + ' comprobaciones correctas.');
  if (failed.length) {
    console.error('Hay comprobaciones pendientes. No se imprimieron cuerpos de error ni credenciales.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('No se ejecutó el smoke test: ' + error.message);
  process.exitCode = 2;
});
