#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outputDir = path.join(root, '.expo-integration-verification');
const officialGateway = 'https://tallerconect.vercel.app/api';

function collectFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(fullPath));
    else if (/\.(?:js|json|map)$/i.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function main() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith('EXPO_PUBLIC_')) delete env[key];
  }
  env.EXPO_PUBLIC_APP_ENV = 'integration';
  env.EXPO_PUBLIC_API_URL = officialGateway;
  env.EXPO_PUBLIC_USE_MOCK_AUTH = 'false';
  env.EXPO_PUBLIC_USE_MOCK_SERVICES = 'false';

  fs.rmSync(outputDir, { recursive: true, force: true });
  const cli = path.join(root, 'node_modules', 'expo', 'bin', 'cli');
  const build = spawnSync(process.execPath, [
    cli, 'export', '--platform', 'android', '--output-dir', outputDir,
  ], { cwd: root, env, stdio: 'inherit' });

  if (build.error) throw build.error;
  if (build.status !== 0) throw new Error('Falló la exportación Android de integración.');

  const files = collectFiles(outputDir);
  if (files.length === 0) throw new Error('Expo no generó archivos verificables.');
  const bundle = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

  const forbidden = [
    { label: 'localhost', pattern: /localhost/i },
    { label: '10.0.2.2', pattern: /10\.0\.2\.2/ },
    { label: '127.0.0.1', pattern: /127\.0\.0\.1/ },
  ];
  const found = forbidden.filter((item) => item.pattern.test(bundle)).map((item) => item.label);
  if (found.length) {
    throw new Error('El bundle de integración contiene referencias locales: ' + found.join(', '));
  }
  if (!bundle.includes(officialGateway)) {
    throw new Error('No se encontró la URL oficial de Gateway en el bundle exportado.');
  }

  console.log('Integración Android: bundle exportado y verificado.');
  console.log('Gateway oficial presente: sí.');
  console.log('Referencias localhost / 10.0.2.2 / 127.0.0.1: ninguna.');
  console.log('Variables públicas y secretos: valores no mostrados.');
}

try {
  main();
} catch (error) {
  console.error('Verificación de integración fallida: ' + error.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
