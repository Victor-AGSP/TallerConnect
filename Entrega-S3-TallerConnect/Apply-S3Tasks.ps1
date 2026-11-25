$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $PSScriptRoot 'files'

if (-not (Test-Path (Join-Path $projectRoot 'package.json'))) {
  throw 'No encuentro package.json. Extrae S3-TallerConnect.zip dentro de la carpeta raíz de TallerConnect.'
}
if (-not (Test-Path (Join-Path $projectRoot '.git'))) {
  throw 'No encuentro .git. Ejecuta este script dentro de tu clon Git de TallerConnect.'
}
$branch = (& git -C $projectRoot branch --show-current).Trim()
if ($branch -ne 'Javier') {
  throw "Estás en la rama '$branch'. Cambia a Javier antes de aplicar estas tareas. No se modificó ningún archivo."
}
$status = @(& git -C $projectRoot status --porcelain)
if ($status.Count -gt 0) {
  throw 'Tu árbol de trabajo no está limpio. Guarda o respalda tus cambios antes de aplicar. No se modificó ningún archivo.'
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $env:TEMP "TallerConnect-S3-backup-$timestamp"
$testsPassed = $false
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
$relativeFiles = @(
  'src/config/env.ts',
  'src/services/orders.service.ts',
  'src/services/vehicles.service.ts',
  'src/services/providers.service.ts',
  'src/services/parts.service.ts',
  'src/services/notifications.service.ts',
  'src/services/evidence.service.ts',
  'src/services/budgets.service.ts',
  'src/services/admin-dashboard.service.ts',
  'src/services/api/retry.ts',
  'src/mocks/budgets.mock.ts',
  'src/mocks/parts.mock.ts',
  '__tests__/env-config.test.ts',
  '__tests__/retry-policy.test.ts',
  'scripts/smoke-api.mjs',
  'docs/smoke-tests-api-consulta.md',
  '.env.example'
)

try {
  foreach ($relative in $relativeFiles) {
    $target = Join-Path $projectRoot $relative
    $source = Join-Path $sourceRoot $relative
    if (-not (Test-Path $source)) { throw "Falta archivo del paquete: $relative" }
    if (Test-Path $target) {
      $backup = Join-Path $backupRoot $relative
      New-Item -ItemType Directory -Path (Split-Path -Parent $backup) -Force | Out-Null
      Copy-Item $target $backup -Force
    }
  }
  foreach ($relative in $relativeFiles) {
    $target = Join-Path $projectRoot $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item (Join-Path $sourceRoot $relative) $target -Force
  }

  # Actualiza .env local solo si todavía apunta exactamente al Gateway antiguo.
  $localEnv = Join-Path $projectRoot '.env'
  if (Test-Path $localEnv) {
    $content = Get-Content $localEnv -Raw
    $updated = $content -replace '(?m)^EXPO_PUBLIC_API_URL=https://tallerconect\.vercel\.app/api\s*$', 'EXPO_PUBLIC_API_URL=https://api-tallerconnect.inf.uct.cl/api'
    if ($updated -ne $content) {
      Copy-Item $localEnv (Join-Path $backupRoot '.env') -Force
      Set-Content -Path $localEnv -Value $updated -NoNewline -Encoding utf8
      Write-Host '.env: Gateway antigua reemplazada por la Gateway institucional.' -ForegroundColor Cyan
    }
  }

  Write-Host "Archivos actualizados. Respaldo: $backupRoot" -ForegroundColor Green
  Write-Host 'Ejecutando typecheck...' -ForegroundColor Cyan
  & npm --prefix $projectRoot run typecheck
  if ($LASTEXITCODE -ne 0) { throw 'Falló typecheck.' }

  Write-Host 'Ejecutando pruebas de configuración y reintentos...' -ForegroundColor Cyan
  & npm --prefix $projectRoot test -- --runInBand __tests__/env-config.test.ts __tests__/retry-policy.test.ts
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas focalizadas.' }
  $testsPassed = $true

  Write-Host 'Ejecutando smoke HTTP (solo GET; no usa JWT real)...' -ForegroundColor Cyan
  & npm --prefix $projectRoot run smoke:api
  $smokeExit = $LASTEXITCODE

  $pathsToCommit = @(
    'src/config/env.ts', 'src/services/orders.service.ts', 'src/services/vehicles.service.ts',
    'src/services/providers.service.ts', 'src/services/parts.service.ts', 'src/services/notifications.service.ts',
    'src/services/evidence.service.ts', 'src/services/budgets.service.ts', 'src/services/admin-dashboard.service.ts',
    'src/services/api/retry.ts', 'src/mocks/budgets.mock.ts', 'src/mocks/parts.mock.ts',
    '__tests__/env-config.test.ts', '__tests__/retry-policy.test.ts', 'scripts/smoke-api.mjs',
    'docs/smoke-tests-api-consulta.md', '.env.example'
  )
  & git -C $projectRoot add -- $pathsToCommit
  if ($LASTEXITCODE -ne 0) { throw 'Falló git add.' }
  & git -C $projectRoot commit -m 'S3: separar mocks, blindar reintentos y smoke Gateway/MS2'
  if ($LASTEXITCODE -ne 0) { throw 'Falló el commit. Los archivos están aplicados y preparados para revisar.' }

  if ($smokeExit -ne 0) {
    Write-Warning 'El código quedó commiteado, pero el smoke HTTP no confirmó todos los checks. Revisa los HTTP/timeout mostrados arriba; no marques Gateway/MS2 como saludable sin 2xx y rechazo 401/403.'
  } else {
    Write-Host 'Smoke HTTP correcto: Gateway/MS2 respondieron y el token inválido fue rechazado.' -ForegroundColor Green
  }
  Write-Host 'Commit creado en Javier.' -ForegroundColor Green
}
catch {
  Write-Error $_
  if (-not $testsPassed) {
    foreach ($relative in $relativeFiles) {
      $backup = Join-Path $backupRoot $relative
      $target = Join-Path $projectRoot $relative
      if (Test-Path $backup) {
        New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
        Copy-Item $backup $target -Force
      }
    }
    $envBackup = Join-Path $backupRoot '.env'
    if (Test-Path $envBackup) { Copy-Item $envBackup (Join-Path $projectRoot '.env') -Force }
    Write-Host 'Se restauraron los archivos originales porque falló typecheck o una prueba.' -ForegroundColor Yellow
  } else {
    Write-Host 'Las pruebas locales pasaron; los cambios se mantienen para que puedas revisar el error de Git.' -ForegroundColor Yellow
  }
  Write-Host "Respaldo guardado en: $backupRoot" -ForegroundColor Yellow
  exit 1
}
