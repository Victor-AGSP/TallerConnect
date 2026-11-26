declare const require: (id: string) => any;
declare const __dirname: string;

const fs = require('fs');
const path = require('path');
import { ENV } from '@/config/env';
import { apiClient } from '@/services/api/client';

const SRC_DIRECTORY = path.resolve(__dirname, '../src');

function collectSourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectSourceFiles(fullPath));
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

describe('Auditoría de Arquitectura: API Gateway y seguridad de URLs', () => {
  const sourceFiles = collectSourceFiles(SRC_DIRECTORY);
  const sourceContents = sourceFiles.map((file) => ({
    file: path.relative(SRC_DIRECTORY, file),
    content: fs.readFileSync(file, 'utf-8') as string,
  }));

  it('garantiza que la URL base termine en /api y el cliente use esa misma base', () => {
    expect(ENV.API_URL).toMatch(/\/api$/);
    expect(apiClient.defaults.baseURL).toBe(ENV.API_URL);
    if (ENV.APP_ENV === 'integration' || ENV.APP_ENV === 'production') {
      expect(ENV.API_URL).toMatch(/^https:\/\//i);
      expect(ENV.IS_SECURE_GATEWAY).toBe(true);
    }
  });

  it('no contiene URLs absolutas hacia OpenAPI ni endpoints de negocio', () => {
    const forbiddenPatterns = [
      /https?:\/\/(?!storage\.tallerconect\.vercel\.app\/)[^\s'\x60)]+\/(?:ms[1-4])(?:\/|[?#]|$)/i,
      /https?:\/\/(?!storage\.tallerconect\.vercel\.app\/)[^\s'\x60)]+\/(?:api\/)?(?:auth|vehiculos|ordenes|presupuestos|repuestos|proveedores|evidencias|notificaciones)(?:\/|[?#]|$)/i,
    ];
    const violations = sourceContents.flatMap(({ file, content }) =>
      forbiddenPatterns.flatMap((pattern) => {
        const match = content.match(pattern);
        return match ? [{ file, match: match[0] }] : [];
      })
    );
    expect(violations).toEqual([]);
  });

  it('no contiene URLs directas a puertos internos de microservicios', () => {
    const internalHostPattern =
      /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}):(\d+)/i;
    const violations = sourceContents.flatMap(({ file, content }) => {
      const matches = [...content.matchAll(new RegExp(internalHostPattern.source, 'gi'))];
      return matches.filter((match) => Number(match[1]) !== 8000)
        .map((match) => ({ file, match: match[0] }));
    });
    expect(violations).toEqual([]);
  });

  it('no contiene cadenas de conexión ni protocolos de bases de datos', () => {
    const databaseUrlPattern =
      /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqp|amqps):\/\//i;
    const violations = sourceContents.flatMap(({ file, content }) => {
      const match = content.match(databaseUrlPattern);
      return match ? [{ file, match: match[0] }] : [];
    });
    expect(violations).toEqual([]);
  });

  it('centraliza la creación de clientes HTTP en api/client.ts y no usa fetch directo', () => {
    const clientFactories = sourceContents.flatMap(({ file, content }) =>
      (content.match(/axios\.create\s*\(/g) ?? []).map(() => file)
    );
    const directFetches = sourceContents.flatMap(({ file, content }) =>
      (content.match(/\bfetch\s*\(/g) ?? []).map(() => file)
    );
    expect(clientFactories).toEqual(['services/api/client.ts']);
    expect(directFetches).toEqual([]);
  });

  it('documenta todas las variables EXPO_PUBLIC sin incluir secretos', () => {
    const example = fs.readFileSync(path.resolve(__dirname, '../.env.example'), 'utf-8') as string;
    const assignedVariables = [...example.matchAll(/^\s*(EXPO_PUBLIC_[A-Z0-9_]+)=/gm)]
      .map((match) => match[1]).sort();
    expect(assignedVariables).toEqual([
      'EXPO_PUBLIC_API_TIMEOUT_MS', 'EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_APP_ENV',
      'EXPO_PUBLIC_ENABLE_NOTIFICATIONS_API', 'EXPO_PUBLIC_EVIDENCE_MAX_BYTES',
      'EXPO_PUBLIC_UPLOAD_TIMEOUT_MS', 'EXPO_PUBLIC_USE_MOCK_AUTH',
      'EXPO_PUBLIC_USE_MOCK_SERVICES',
    ].sort());
    expect(example).not.toMatch(/^\s*(?:DATABASE_URL|POSTGRES_URL|DB_PASSWORD|API_SECRET|JWT_SECRET|PRIVATE_KEY|ACCESS_TOKEN)=/m);
  });

  it('mantiene el archivo .env local fuera del control de versiones', () => {
    const gitignore = fs.readFileSync(path.resolve(__dirname, '../.gitignore'), 'utf-8') as string;
    expect(gitignore).toMatch(/^\.env$/m);
    expect(gitignore).toMatch(/^\.env\.\*$/m);
    expect(gitignore).toMatch(/^!\.env\.example$/m);
  });
});
