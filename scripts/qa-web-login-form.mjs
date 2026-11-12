// Real Firefox/Expo Web interactions for the shared anonymous form only.
// No credentials, tokens, authentication stubs or backend writes are used.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const appUrl = new URL(process.env.TALLERCONNECT_FORM_URL ?? 'http://127.0.0.1:8093/login');
const socketUrl = new URL(process.env.TALLERCONNECT_BIDI_URL ?? 'ws://127.0.0.1:9237/session');
if (![appUrl, socketUrl].every((url) =>
  ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) &&
  !url.username && !url.password && !url.search && !url.hash)) {
  throw new Error('Este control de formulario solo admite servicios locales aislados.');
}
const output = resolve(process.env.TALLERCONNECT_FORM_OUTPUT ?? '/tmp/tallerconnect-validacion-real/form');
await mkdir(output, { recursive: true });
const ws = new WebSocket(socketUrl);
const pending = new Map();
let sequence = 0;
let context;
let loginRequests = 0;
let privateApiRequests = 0;
ws.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'network.beforeRequestSent' && message.params.context === context) {
    const request = message.params.request;
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname.endsWith('/auth/login')) loginRequests++;
    if (url.origin === 'http://127.0.0.1:8000' && url.pathname.startsWith('/api/')) privateApiRequests++;
  }
  if (!pending.has(message.id)) return;
  const task = pending.get(message.id);
  clearTimeout(task.timer);
  pending.delete(message.id);
  if (message.type === 'error') task.reject(new Error(`BiDi ${message.error}`));
  else task.resolve(message.result);
});
await new Promise((accept, reject) => {
  ws.addEventListener('open', accept, { once: true });
  ws.addEventListener('error', () => reject(new Error('Navegador local no disponible')), { once: true });
});
function call(method, params = {}) {
  return new Promise((accept, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout ${method}`)); }, 45000);
    pending.set(id, { resolve: accept, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call('script.evaluate', { expression, target: { context }, awaitPromise: true });
  if (result.type !== 'success') throw new Error('Falló evaluación del formulario local');
  return result.result.value;
}
async function waitUntil(condition) {
  const passed = await evaluate(`new Promise(resolve => {
    const end = Date.now() + 20000;
    const poll = () => { if (${condition}) resolve(true); else if(Date.now() > end) resolve(false); else setTimeout(poll, 100); };
    poll();
  })`);
  if (!passed) throw new Error('El formulario no alcanzó el estado esperado');
}
const report = { kind: 'REAL_EXPO_WEB_UI', started_at_utc: new Date().toISOString(),
  scope: 'Formulario anónimo compartido: tres repeticiones, ninguna sesión autenticada por rol.',
  platform: 'Expo Web / Firefox real mediante WebDriver BiDi', app_url: appUrl.href,
  api_url: 'http://127.0.0.1:8000/api (sin backend local disponible)',
  mock_auth: false, mock_services: false, dotenv_loaded: false, cases: [], anonymous_routes: [] };
try {
  const session = await call('session.new', { capabilities: {} });
  report.browser_version = session.capabilities.browserVersion;
  ({ context } = await call('browsingContext.create', { type: 'tab' }));
  await call('session.subscribe', { events: ['network.beforeRequestSent'], contexts: [context] });
  await call('browsingContext.setViewport', { context, viewport: { width: 1280, height: 1000 } });
  for (const id of ['AUTH-C-03', 'AUTH-M-03', 'AUTH-A-03']) {
    const item = { id, state: 'FAIL', anonymous_shared_form: true };
    report.cases.push(item);
    await call('browsingContext.navigate', { context, url: appUrl.href, wait: 'complete' });
    await waitUntil(`document.querySelector('[data-testid="login-submit"]')?.innerText.includes('Iniciar sesión')`);
    await evaluate(`(() => {
      const email = document.querySelector('[data-testid="login-email"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(email, '@');
      email.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await evaluate(`document.querySelector('[data-testid="login-submit"]').click()`);
    await waitUntil(`document.body.innerText.includes('Ingresa un correo válido') && document.body.innerText.includes('La contraseña debe tener al menos 6 caracteres')`);
    item.invalid_email_rejected = true;
    await evaluate(`(() => {
      const email = document.querySelector('[data-testid="login-email"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(email, '');
      email.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await evaluate(`document.querySelector('[data-testid="login-submit"]').click()`);
    await waitUntil(`document.body.innerText.includes('El correo es obligatorio') && document.body.innerText.includes('La contraseña debe tener al menos 6 caracteres')`);
    const screenshot = await call('browsingContext.captureScreenshot', { context, origin: 'document' });
    await writeFile(resolve(output, `${id}.png`), Buffer.from(screenshot.data, 'base64'));
    item.empty_fields_rejected = true;
    item.stayed_on_login = await evaluate(`location.pathname === '/login'`);
    item.login_requests_observed = loginRequests;
    item.screenshot = `${id}.png`;
    item.state = item.stayed_on_login && loginRequests === 0 ? 'PASS' : 'FAIL';
  }
  for (const path of ['/cliente', '/mecanico', '/administrador']) {
    const before = privateApiRequests;
    await call('browsingContext.navigate', { context, url: appUrl.origin + path, wait: 'complete' });
    await waitUntil(`location.pathname === '/login' && document.querySelector('[data-testid="login-submit"]')?.innerText.includes('Iniciar sesión')`);
    const noSession = await evaluate(`localStorage.getItem('tc_auth_token') === null && localStorage.getItem('tallerconnect.auth.session') === null`);
    const privateRequests = privateApiRequests - before;
    report.anonymous_routes.push({ requested_path: path, observed_path: '/login',
      no_stored_session: noSession, private_api_requests_observed: privateRequests,
      state: noSession && privateRequests === 0 ? 'PASS' : 'FAIL' });
  }
} catch (error) {
  report.error = error instanceof Error ? error.message : 'Error de ejecución UI';
  process.exitCode = 1;
} finally {
  report.ended_at_utc = new Date().toISOString();
  await writeFile(resolve(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  await call('session.end').catch(() => undefined);
  ws.close();
}
console.log(JSON.stringify({ cases: report.cases.map(({ id, state }) => ({ id, state })), anonymous_routes: report.anonymous_routes, error: report.error ?? null }));
if (report.cases.length !== 3 || report.anonymous_routes.length !== 3 ||
  [...report.cases, ...report.anonymous_routes].some(({ state }) => state !== 'PASS')) process.exitCode = 1;
