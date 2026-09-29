import fs from 'fs';
import path from 'path';
import { ENV } from '@/config/env';
import { apiClient } from '@/services/api/client';

describe('Auditoría de Arquitectura: Sin URLs directas hacia Microservicios', () => {
  it('garantiza que la URL base de la aplicación apunte a la API Gateway (/api)', () => {
    // La API Gateway centraliza todas las llamadas en el prefijo /api
    expect(ENV.API_URL).toMatch(/\/api\/?$/);
    expect(apiClient.defaults.baseURL).toMatch(/\/api\/?$/);
  });

  it('no contiene URLs absolutas con puertos internos de microservicios en el código fuente de src/', () => {
    const srcDirectory = path.resolve(__dirname, '../src');

    // Patrón que detecta URLs directas hacia puertos de microservicios internos (ej. :8001, :8002, :3000, :5000)
    // Excluyendo el puerto estándar de la API Gateway local (:8000)
    const forbiddenInternalPortPattern = /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0):(800[1-9]|80[1-9]\d|3\d{3}|5\d{3})/i;

    const filesToAudit: string[] = [];

    function scanFiles(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Omitir carpetas de pruebas de la auditoría interna si fuera necesario
          scanFiles(fullPath);
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          filesToAudit.push(fullPath);
        }
      }
    }

    scanFiles(srcDirectory);

    const violations: Array<{ file: string; match: string }> = [];

    for (const filePath of filesToAudit) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const match = content.match(forbiddenInternalPortPattern);
      if (match) {
        violations.push({
          file: path.relative(srcDirectory, filePath),
          match: match[0],
        });
      }
    }

    expect(violations).toEqual([]);
  });

  it('asegura que las llamadas en los servicios utilicen rutas relativas delegadas a la API Gateway', () => {
    const authServicePath = path.resolve(__dirname, '../src/services/auth.service.ts');
    const authContent = fs.readFileSync(authServicePath, 'utf-8');

    // Verifica que use rutas relativas como '/auth/login' y '/auth/me' en vez de URLs completas
    expect(authContent).toContain("'/auth/login'");
    expect(authContent).toContain("'/auth/me'");
    expect(authContent).not.toMatch(/https?:\/\/[^'"`]+\/auth\/login/);
    expect(authContent).not.toMatch(/https?:\/\/[^'"`]+\/auth\/me/);
  });
});
