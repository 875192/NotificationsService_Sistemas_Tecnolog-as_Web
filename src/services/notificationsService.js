// ── Orquestador de notificaciones ──
// Usa reglas puras (rules.js) + repositorios (BD).
// Las rutas REST y los listeners de Redis llaman aquí.

const { severidadMayor, puedeTransicionar, buildDedupKey } = require("./rules");

const {
  findAlertaActivaByTipoEntidad,
  updateAlertaActivaReplace,
  createAlerta,
  cerrarAlerta,
} = require("../repositories/alertasRepository");

const {
  findNotificacionPendienteByDedupKey,
  createNotificacion,
  updateNotificacionMensaje,
  setEstadoNotificacion,
} = require("../repositories/notificacionesRepository");

// ─── Procesamiento principal (idempotente) ───
// Garantiza:
//   1. No duplica alertas: reutiliza ACTIVA del mismo tipo+entidad.
//   2. No duplica notificaciones: reutiliza PENDIENTE con misma dedupKey.
//   3. Severidad solo escala, nunca baja.
//   4. Llamar 2 veces con el mismo evento da el mismo resultado.

async function procesarEvento({ tipo, severidad, idEntidad, idConductor, contexto, mensaje }) {
  // ── 1. Alerta: buscar ACTIVA o crear ──
  let alerta = await findAlertaActivaByTipoEntidad(tipo, idEntidad);
  let alertaCreada = false;

  if (alerta) {
    const nuevaSeveridad = severidadMayor(alerta.severidad, severidad);
    alerta = await updateAlertaActivaReplace(alerta.id_alerta, nuevaSeveridad, contexto);
  } else {
    alerta = await createAlerta({ tipo, severidad, idEntidad, contexto });
    alertaCreada = true;
  }

  // ── 2. Notificación: deduplicar por tipo+entidad+conductor ──
  const dedupKey = buildDedupKey({ tipo, idEntidad, idConductor });
  let notif = await findNotificacionPendienteByDedupKey(dedupKey);
  let notifCreada = false;

  if (notif) {
    notif = await updateNotificacionMensaje(notif.id_notificacion, mensaje);
  } else {
    notif = await createNotificacion({
      idAlerta: alerta.id_alerta,
      idConductor,
      mensaje,
      dedupKey,
    });
    notifCreada = true;
  }

  return { alerta, alertaCreada, notif, notifCreada };
}

// ─── Transiciones de estado (notificación) ───

async function ackNotificacion(idNotificacion, estadoActual) {
  if (!puedeTransicionar(estadoActual, "ACK")) return null;
  return await setEstadoNotificacion(idNotificacion, "ACK");
}

async function resolverNotificacion(idNotificacion, estadoActual) {
  if (!puedeTransicionar(estadoActual, "RESUELTA")) return null;
  return await setEstadoNotificacion(idNotificacion, "RESUELTA");
}

// ─── Cerrar alerta ───

async function cerrarAlertaSiActiva(idAlerta, estadoActual) {
  if (estadoActual === "CERRADA") return null;
  return await cerrarAlerta(idAlerta);
}

module.exports = {
  procesarEvento,
  ackNotificacion,
  resolverNotificacion,
  cerrarAlertaSiActiva,
};
