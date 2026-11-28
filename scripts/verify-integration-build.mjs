#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outputDir = path.join(root, '.expo-integration-verification');
const officialGateway = 'https://api-tallerconnect.inf.uct.cl/api';

function collectFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else if (entry.isFile()) {
      // Inspecciona también bytecode Hermes (.hbc), bundles y cualquier
      // manifiesto/archivo adicional que Expo genere en futuras versiones.
      files.push(fullPath);
    }
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
  if (build.status !== 0) {
    throw new Error('Falló la exportación Android de integración.');
  }
  if (!fs.existsSync(outputDir)) {
    throw new Error('Expo terminó sin generar el directorio de exportación.');
  }

  const files = collectFiles(outputDir);
  if (files.length === 0) {
    throw new Error('Expo no generó archivos verificables.');
  }

  const forbidden = [
    { label: 'localhost', value: 'localhost' },
    { label: '10.0.2.2', value: '10.0.2.2' },
    { label: '127.0.0.1', value: '127.0.0.1' },
  ];
  const found = new Set();
  let officialGatewayFound = false;

  // Buffer permite inspeccionar también archivos binarios Hermes (.hbc)
  // sin depender de que su contenido sea UTF-8 válido.
  for (const file of files) {
    const content = fs.readFileSync(file);
    if (content.includes(Buffer.from(officialGateway, 'utf8'))) {
      officialGatewayFound = true;
    }
    for (const item of forbidden) {
      if (content.includes(Buffer.from(item.value, 'utf8'))) {
        found.add(item.label);
      }
    }
  }

  if (found.size > 0) {
    throw new Error(
      'La exportación contiene referencias locales: ' + [...found].join(', '),
    );
  }
  if (!officialGatewayFound) {
    throw new Error(
      'No se encontró la URL oficial de Gateway en los archivos exportados.',
    );
  }

  console.log('Integración Android: exportación completada y verificada.');
  console.log('Archivos inspeccionados (incluidos binarios): ' + files.length);
  console.log('Gateway oficial presente: sí.');
  console.log('Referencias locales (localhost / 10.0.2.2 / 127.0.0.1): ninguna.');
  console.log('Valores de variables y secretos: no mostrados.');
}

try {
  main();
} catch (error) {
  console.error('Verificación de integración fallida: ' + error.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
