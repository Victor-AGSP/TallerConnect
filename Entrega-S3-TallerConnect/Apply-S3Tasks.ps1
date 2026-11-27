$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $PSScriptRoot 'files'

if (-not (Test-Path (Join-Path $projectRoot 'package.json'))) { throw 'No encuentro package.json. Extrae el ZIP dentro de la raíz de TallerConnect.' }
if (-not (Test-Path (Join-Path $projectRoot '.git'))) { throw 'No encuentro .git. Ejecuta el instalador dentro de tu clon Git.' }
$branch = (& git -C $projectRoot branch --show-current).Trim()
if ($branch -ne 'Javier') { throw "Estás en '$branch'. Cambia a Javier. No se modificó nada." }
$status = @(& git -C $projectRoot status --porcelain)
if ($status.Count -gt 0) { throw 'El árbol de trabajo no está limpio. No se modificó nada; guarda tus cambios primero.' }

$relativeFiles = @(
 'src/config/env.ts','src/services/orders.service.ts','src/services/vehicles.service.ts',
 'src/services/providers.service.ts','src/services/parts.service.ts','src/services/notifications.service.ts',
 'src/services/evidence.service.ts','src/services/budgets.service.ts','src/services/admin-dashboard.service.ts',
 'src/services/api/retry.ts','src/mocks/budgets.mock.ts','src/mocks/parts.mock.ts',
 '__tests__/env-config.test.ts','__tests__/retry-policy.test.ts','scripts/smoke-api.mjs',
 'docs/smoke-tests-api-consulta.md','.env.example'
)
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $env:TEMP "TallerConnect-S3-backup-$timestamp"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
$testsPassed = $false
$envChanged = $false

try {
 foreach ($relative in $relativeFiles) {
  $source = Join-Path $sourceRoot $relative
  if (-not (Test-Path $source)) { throw "Falta archivo en el paquete: $relative" }
  $target = Join-Path $projectRoot $relative
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

 # No cambia .env ni migra la URL de API: conserva el endpoint que ya usa el proyecto.
 Write-Host "Archivos aplicados. Respaldo: $backupRoot" -ForegroundColor Green
 Write-Host 'Validando TypeScript...' -ForegroundColor Cyan
 & npm --prefix $projectRoot run typecheck
 if ($LASTEXITCODE -ne 0) { throw 'Falló typecheck.' }
 Write-Host 'Ejecutando pruebas focalizadas de entorno y reintentos...' -ForegroundColor Cyan
 & npm --prefix $projectRoot test -- --runInBand __tests__/env-config.test.ts __tests__/retry-policy.test.ts
 if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas focalizadas.' }
 $testsPassed = $true

 Write-Host 'Ejecutando smoke HTTP (GET solamente; token ficticio)...' -ForegroundColor Cyan
 & npm --prefix $projectRoot run smoke:api
 $smokeExit = $LASTEXITCODE

 & git -C $projectRoot add -- $relativeFiles
 if ($LASTEXITCODE -ne 0) { throw 'Falló git add.' }
 & git -C $projectRoot commit -m 'S3: separar mocks, excluir cancelaciones y verificar Gateway/MS2'
 if ($LASTEXITCODE -ne 0) { throw 'Falló el commit. Revisa el estado de Git.' }

 if ($smokeExit -ne 0) {
  Write-Warning 'El código y las pruebas locales quedaron commiteados, pero el Gateway/MS2 o la validación de token no respondió como se esperaba. No marques la verificación de backend como aprobada hasta obtener 2xx en salud y 401/403 para el token inválido.'
 } else {
  Write-Host 'Smoke HTTP correcto: salud Gateway/MS2 y rechazo del token inválido confirmados.' -ForegroundColor Green
 }
 Write-Host 'Correcciones aplicadas y commit creado en Javier.' -ForegroundColor Green
}
catch {
 Write-Error $_
 if (-not $testsPassed) {
  foreach ($relative in $relativeFiles) {
   $backup = Join-Path $backupRoot $relative
   $target = Join-Path $projectRoot $relative
   if (Test-Path $backup) { New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null; Copy-Item $backup $target -Force }
  }
  Write-Host 'Se restauraron los archivos porque falló la validación local.' -ForegroundColor Yellow
 } else {
  Write-Host 'Las validaciones locales pasaron; los cambios se mantienen para revisar el error de Git.' -ForegroundColor Yellow
 }
 Write-Host "Respaldo: $backupRoot" -ForegroundColor Yellow
 exit 1
}
