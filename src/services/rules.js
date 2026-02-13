// ── Reglas puras de dominio (sin BD, sin I/O) ──
// Funciones deterministas que encapsulan decisiones de negocio.

// ─── Severidad ───
// Solo se puede escalar, nunca bajar.
const SEVERIDAD_ORDEN = { INFO: 0, WARNING: 1, CRITICAL: 2 };

function severidadMayor(actual, nueva) {
  return SEVERIDAD_ORDEN[nueva] > SEVERIDAD_ORDEN[actual] ? nueva : actual;
}

// ─── Estados de notificación ───
// PENDIENTE → ACK → RESUELTA (solo avanza, nunca retrocede)
const ESTADO_NOTIFICACION_ORDEN = { PENDIENTE: 0, ACK: 1, RESUELTA: 2 };

function puedeTransicionar(estadoActual, estadoDestino) {
  return ESTADO_NOTIFICACION_ORDEN[estadoDestino] > ESTADO_NOTIFICACION_ORDEN[estadoActual];
}

// ─── Deduplicación ───
// Clave única para detectar notificaciones equivalentes.
function buildDedupKey({ tipo, idEntidad, idConductor }) {
  return `${tipo}:${idEntidad}:${idConductor}`;
}

module.exports = {
  SEVERIDAD_ORDEN,
  severidadMayor,
  ESTADO_NOTIFICACION_ORDEN,
  puedeTransicionar,
  buildDedupKey,
};
