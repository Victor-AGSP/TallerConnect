#!/usr/bin/env bash
# Comprobación previa a la demo (SCRUM-166). Solo GET anónimos: sin token, sin
# cookies, sin escrituras. Imprime el estado de la Gateway y de cada microservicio.
#
# Uso: scripts/demo-preflight.sh [URL_BASE_GATEWAY]
#   URL_BASE_GATEWAY por defecto: https://api-tallerconnect.inf.uct.cl
set -u

BASE="${1:-https://api-tallerconnect.inf.uct.cl}"
BASE="${BASE%/}"
BASE="${BASE%/api}"
status=0

check() {
  local label="$1" path="$2" expected="$3" code
  code=$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "$BASE$path" 2>/dev/null) || code="000"
  if [ "$code" = "$expected" ]; then
    printf 'OK    %-34s %s (esperado %s)\n' "$label" "$code" "$expected"
  else
    printf 'FALLA %-34s %s (esperado %s)\n' "$label" "$code" "$expected"
    status=1
  fi
}

echo "Gateway: $BASE  ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
check "Gateway /api/health" "/api/health" 200
for service in ms1_auth ms2_taller ms3_presupuestos ms4_evidencias; do
  check "Servicio $service" "/api/health/servicios/$service" 200
done
check "MS4 exige autenticación" "/api/evidencias?orden_id=1" 401
check "MS1 exige autenticación" "/api/auth/me" 401

if [ "$status" -eq 0 ]; then
  echo "Resultado: listo para la demo con backend real."
else
  echo "Resultado: hay servicios no disponibles. Aplicar la contingencia de docs/sprint-3/semana-4/SCRUM-166.md."
fi
exit "$status"
