// ── Redis handlers (modo acción) ──
// Convierte eventos Redis (vehículos/zonas/postes) -> procesarEvento()
// y emite por WebSocket al panel de administración (broadcast).

const { procesarEvento } = require("../services/notificationsService");
const { broadcast } = require("../ws/hub");
const { publishEvent } = require("../redis/publisher");

// --- Helpers ---
function unwrap(payload) {
  // Formato envoltorio: { tipo, fecha, datos, ... }
  if (payload && typeof payload === "object" && payload.tipo && payload.datos) {
    return { eventType: payload.tipo, data: payload.datos, raw: payload };
  }
  // Formato plano
  return { eventType: null, data: payload, raw: payload };
}



function isNumber(x) {
  return typeof x === "number" && !Number.isNaN(x);
}

const VEHICULO_SERVICE_URL = process.env.VEHICULO_SERVICE_URL || "http://155.210.71.158:3000";

async function getConductorIdByVehiculo(idVehiculo) {
  try {
    const res = await fetch(`${VEHICULO_SERVICE_URL}/api/vehículos/${idVehiculo}`);
    if (!res.ok) return null;
    const body = await res.json();
    return body?.idConductor ?? null;
  } catch {
    return null;
  }
}

// --- Mapeos por canal ---
// 1) vehiculos.eventos  (ej: VehiculoEstadoCambiado con idVehiculo + nivelBateria)
function mapVehiculos(data) {
  const idVehiculo = data?.idVehiculo;
  const nivelBateria = data?.nivelBateria;
  const estadoNuevo = data?.estadoNuevo;

  if (!idVehiculo) return null;

  let severidad = null;

  if (estadoNuevo === "SIN_BATERIA") severidad = "CRITICAL";
  else if (isNumber(nivelBateria) && nivelBateria <= 2) severidad = "CRITICAL";
  else if (isNumber(nivelBateria) && nivelBateria <= 10) severidad = "WARNING";

  if (!severidad) return null;

  return {
    tipo: "VEHICULO_SIN_BATERIA",
    severidad,
    idEntidad: idVehiculo,
    contexto: { nivelBateria, estadoNuevo },
    mensaje:
      severidad === "CRITICAL"
        ? `Batería crítica en ${idVehiculo} (${nivelBateria ?? "?"}).`
        : `Batería baja en ${idVehiculo} (${nivelBateria ?? "?"}).`,
  };
}

// 2) zonas.eventos (formato envoltorio + motivo en raw, ej RESERVA_FINALIZADA)
function mapZonas(eventType, raw) {
  if (eventType !== "RESERVA_FINALIZADA") return null;
  if (raw?.motivo !== "EXPIRACION_TIEMPO") return null;

  const datos = raw?.datos || {};
  const idReserva = datos?.idReserva;
  if (!idReserva) return null;

  return {
    tipo: "RESERVA_EXPIRADA",
    severidad: "INFO",
    idEntidad: idReserva,
    contexto: { ...datos, motivo: raw.motivo },
    mensaje: `La reserva ${idReserva} ha expirado por tiempo.`,
  };
}

// 3) postes.eventos (puede venir con envoltorio {tipo, datos} o plano)
function mapPostes(eventType, data, raw) {
  const evt = eventType || raw?.tipo || null;

  const idPoste = data?.idPoste || raw?.idPoste;
  const estado = (data?.estado || raw?.estado || "").toUpperCase();

  if (!idPoste) return null;

  const problematico =
    evt === "PosteNoDisponible" ||
    evt === "PosteMantenimiento" ||
    evt === "POSTE_NO_DISPONIBLE" ||
    evt === "POSTE_MANTENIMIENTO" ||
    ["MANTENIMIENTO", "AVERIADO", "OFFLINE", "NO_DISPONIBLE"].includes(estado);

  if (!problematico) return null;

  return {
    tipo: "POSTE_AVERIADO",
    severidad: "WARNING",
    idEntidad: idPoste,
    contexto: { evento: evt, ...data },
    mensaje: `Poste ${idPoste} no disponible (${evt || estado || "estado desconocido"}).`,
  };
}

// --- Handler principal ---
async function handleRedisEvent(channel, payload) {
  const { eventType, data, raw } = unwrap(payload);

  // 1) Mapear a evento de negocio (si aplica)
  let evt = null;

  let conductorId = null;

  switch (channel) {
    case "vehiculos.eventos":
      evt = mapVehiculos(data);
      if (evt) conductorId = await getConductorIdByVehiculo(data?.idVehiculo);
      break;

    case "zonas.eventos":
      evt = mapZonas(eventType, raw);
      break;

    case "postes.eventos":
      // si viene envoltorio, data=payload.datos; si plano, data=payload
      evt = mapPostes(eventType, data, raw);
      break;

    default:
      // canal que no nos interesa
      return;
  }

  // Si no hay condición de alerta/notificación, ignoramos sin error
  if (!evt) {
    // si quieres, deja un log suave:
    console.log("[redis] ignored", channel, eventType || "");
    return;
  }

  // 2) Ejecutar lógica (dedup, replace, etc.)
  const result = await procesarEvento(evt);
  
  // 3) Publicar notificación a Redis para la Interfaz de Usuario
  const tipoEvento = result.notifCreada ? "NotificacionCreada" : "NotificacionActualizada";
  await publishEvent(tipoEvento, {
    ...result.notif,
    conductorId,
    tipo: result.alerta.tipo,
    severidad: result.alerta.severidad,
    estado: result.alerta.estado,
  });

  // 4) Emitir por WebSocket al panel admin (broadcast)
  const wsType = result.notifCreada ? "NOTIFICACION_CREADA" : "NOTIFICACION_ACTUALIZADA";
  broadcast({
    type: wsType,
    data: {
      source: `redis:${channel}`,
      alerta: result.alerta,
      notificacion: result.notif,
      alertaCreada: result.alertaCreada,
      notifCreada: result.notifCreada,
      conductorId,
    },
  });

  // 5) Log final (para ver que ya está actuando)
  console.log("[redis] processed", {
    channel,
    businessTipo: evt.tipo,
    alertaCreada: result.alertaCreada,
    notifCreada: result.notifCreada,
  });

  return result;
}

module.exports = { handleRedisEvent };
