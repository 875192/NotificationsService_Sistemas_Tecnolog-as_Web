#!/usr/bin/env bash
# ── Menú de control del notifications-service ──

REDIS_URL="redis://alumnos:STWeb2026@155.210.71.86:6380"
SERVICE_URL="http://localhost:3000"
VEHICULOS_CHANNEL="vehiculos/eventos"
NOTIF_CHANNEL="notifications-service/eventos"
DB_CONTAINER="notifications-postgres"
DB_NAME="notifications_db"
DB_USER="notifications_user"

# ID de vehículo fijo para la prueba (UUID reproducible)
TEST_VEHICULO_ID="test-vehiculo-menu-001"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

header() {
  echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}   notifications-service — panel de control${NC}"
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════${NC}\n"
}

menu() {
  echo -e "${BOLD}Elige una opción:${NC}"
  echo -e "  ${YELLOW}0${NC}) Arrancar el microservicio"
  echo -e "  ${YELLOW}1${NC}) Detener el microservicio"
  echo -e "  ${YELLOW}2${NC}) Prueba de health"
  echo -e "  ${YELLOW}3${NC}) Inyectar vehículo en Redis → verificar en BD"
  echo -e "  ${YELLOW}4${NC}) Escuchar canal ${NOTIF_CHANNEL}"
  echo -e "  ${YELLOW}q${NC}) Salir"
  echo ""
  read -rp "Opción: " OPT
}

# ── 0: Arrancar ──────────────────────────────────────────────────
arrancar() {
  echo -e "\n${CYAN}▶ Arrancando microservicio...${NC}"
  docker compose up -d --build
  echo -e "\n${GREEN}✔ Microservicio arrancado. Esperando health check...${NC}"

  local retries=15
  local i=0
  while [ $i -lt $retries ]; do
    if curl -sf "${SERVICE_URL}/health" > /dev/null 2>&1; then
      echo -e "${GREEN}✔ Health check OK — servicio listo en ${SERVICE_URL}${NC}"
      return
    fi
    echo -n "."
    sleep 2
    i=$((i + 1))
  done
  echo -e "\n${RED}✘ El servicio no respondió a tiempo. Revisa los logs:${NC}"
  echo "  docker compose logs -f notifications"
}

# ── 1: Detener ───────────────────────────────────────────────────
detener() {
  echo -e "\n${CYAN}■ Deteniendo microservicio...${NC}"
  docker compose down
  echo -e "${GREEN}✔ Microservicio detenido.${NC}"
}

# ── 2: Health check ──────────────────────────────────────────────
health() {
  echo -e "\n${CYAN}⚕ Comprobando health...${NC}"
  RESPONSE=$(curl -sf "${SERVICE_URL}/health" 2>&1)
  STATUS=$?
  if [ $STATUS -eq 0 ]; then
    echo -e "${GREEN}✔ Respuesta:${NC} $RESPONSE"
  else
    echo -e "${RED}✘ No se pudo conectar a ${SERVICE_URL}/health${NC}"
    echo -e "  ¿Está el servicio arrancado? (opción 0)"
  fi
}

# ── 3: Inyectar vehículo y verificar en BD ───────────────────────
inyectar_vehiculo() {
  echo -e "\n${CYAN}🚗 Inyectando evento de vehículo sin batería en Redis...${NC}"

  PAYLOAD=$(cat <<EOF
{
  "tipo": "VehiculoEstadoCambiado",
  "fecha": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "datos": {
    "idVehiculo": "${TEST_VEHICULO_ID}",
    "estadoNuevo": "SIN_BATERIA",
    "nivelBateria": 1
  }
}
EOF
)

  echo -e "${YELLOW}Payload:${NC} $PAYLOAD"
  redis-cli -u "$REDIS_URL" PUBLISH "$VEHICULOS_CHANNEL" "$PAYLOAD" 2>/dev/null
  echo -e "${GREEN}✔ Publicado en ${VEHICULOS_CHANNEL}${NC}"

  echo -e "\n${CYAN}⏳ Esperando 2s para que el servicio procese el evento...${NC}"
  sleep 2

  echo -e "\n${CYAN}🗄  Verificando en la base de datos (vía REST API)...${NC}"

  echo -e "\n${BOLD}— Alertas para ${TEST_VEHICULO_ID}:${NC}"
  ALERTAS=$(curl -sf "${SERVICE_URL}/api/alertas" 2>/dev/null)
  if [ $? -ne 0 ] || [ -z "$ALERTAS" ]; then
    echo -e "${RED}  ✘ No se pudo contactar con ${SERVICE_URL}/api/alertas. ¿Está el servicio arrancado?${NC}"
  else
    echo "$ALERTAS" | grep -o "{[^}]*\"${TEST_VEHICULO_ID}\"[^}]*}" | while read -r line; do
      echo "  $line"
    done
    echo "$ALERTAS" | grep -q "$TEST_VEHICULO_ID" \
      && echo -e "${GREEN}  ✔ Alerta encontrada en BD${NC}" \
      || echo -e "${YELLOW}  ⚠ No se encontró alerta para ${TEST_VEHICULO_ID} — puede que el evento no haya sido procesado${NC}"
  fi

  echo -e "\n${BOLD}— Notificaciones para ${TEST_VEHICULO_ID}:${NC}"
  NOTIFS=$(curl -sf "${SERVICE_URL}/api/notificaciones" 2>/dev/null)
  if [ $? -ne 0 ] || [ -z "$NOTIFS" ]; then
    echo -e "${RED}  ✘ No se pudo contactar con ${SERVICE_URL}/api/notificaciones.${NC}"
  else
    echo "$NOTIFS" | grep -q "$TEST_VEHICULO_ID" \
      && echo -e "${GREEN}  ✔ Notificación encontrada en BD${NC}" \
      || echo -e "${YELLOW}  ⚠ No se encontró notificación para ${TEST_VEHICULO_ID}${NC}"
  fi

  echo -e "\n${GREEN}✔ Prueba completada. Si aparecen filas arriba, el flujo funciona.${NC}"
  echo -e "  Para ver la notificación en Redis, usa la opción ${YELLOW}4${NC}."
}

# ── 4: Escuchar canal de notificaciones ──────────────────────────
escuchar_notificaciones() {
  echo -e "\n${CYAN}📡 Suscribiéndose a ${NOTIF_CHANNEL}...${NC}"
  echo -e "${YELLOW}(Ctrl+C para volver al menú)${NC}\n"
  redis-cli -u "$REDIS_URL" SUBSCRIBE "$NOTIF_CHANNEL" 2>/dev/null
}

# ── Bucle principal ──────────────────────────────────────────────
while true; do
  header
  menu
  case "$OPT" in
    0) arrancar ;;
    1) detener ;;
    2) health ;;
    3) inyectar_vehiculo ;;
    4) escuchar_notificaciones ;;
    q|Q) echo -e "\n${CYAN}Hasta luego.${NC}\n"; exit 0 ;;
    *) echo -e "${RED}Opción no válida.${NC}" ;;
  esac
  echo -e "\n${YELLOW}Pulsa Enter para continuar...${NC}"
  read -r
done
