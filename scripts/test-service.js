// ── Test del orquestador notificationsService.js ──
// Prueba: deduplicación, severidad, transiciones de estado, idempotencia.

require("dotenv").config();

const pool = require("../src/db/pool");
const {
  procesarEvento,
  ackNotificacion,
  resolverNotificacion,
  cerrarAlertaSiActiva,
} = require("../src/services/notificationsService");

async function main() {
  console.log("══════ TEST notificationsService.js ══════\n");

  // ── PASO 1: procesarEvento (CREAR) ──
  console.log("── PASO 1: procesarEvento (debería CREAR alerta + notificación) ──");
  const r1 = await procesarEvento({
    tipo: "VEHICULO_SIN_BATERIA",
    severidad: "WARNING",
    idEntidad: "vehiculo-test-001",
    idConductor: "conductor-test-001",
    contexto: { bateria: 8 },
    mensaje: "Batería baja (8%). Busca un punto de carga.",
  });

  console.log("  alertaCreada:", r1.alertaCreada);     // true
  console.log("  notifCreada:", r1.notifCreada);        // true
  console.log("  alerta.severidad:", r1.alerta.severidad);  // WARNING
  console.log("  notif.estado:", r1.notif.estado);      // PENDIENTE
  console.log("  notif.id:", r1.notif.id_notificacion);

  // ── PASO 2: procesarEvento mismo evento (DEDUPLICACIÓN + SEVERIDAD) ──
  console.log("\n── PASO 2: procesarEvento mismo evento (debería ACTUALIZAR, no duplicar) ──");
  const r2 = await procesarEvento({
    tipo: "VEHICULO_SIN_BATERIA",       // mismo tipo
    severidad: "CRITICAL",               // mayor severidad
    idEntidad: "vehiculo-test-001",      // misma entidad
    idConductor: "conductor-test-001",   // mismo conductor
    contexto: { bateria: 2 },
    mensaje: "Batería crítica (2%). Urgente recargar.",
  });

  console.log("  alertaCreada:", r2.alertaCreada);      // false (reutilizó)
  console.log("  notifCreada:", r2.notifCreada);         // false (reutilizó)
  console.log("  alerta.severidad:", r2.alerta.severidad); // CRITICAL (escaló)
  console.log("  mismo alerta ID?", r1.alerta.id_alerta === r2.alerta.id_alerta); // true
  console.log("  mismo notif ID?", r1.notif.id_notificacion === r2.notif.id_notificacion); // true

  // ── PASO 3: ackNotificacion ──
  console.log("\n── PASO 3: ACK notificación (PENDIENTE → ACK) ──");
  const acked = await ackNotificacion(r2.notif.id_notificacion, r2.notif.estado);
  console.log("  nuevo estado:", acked ? acked.estado : "sin cambio");  // ACK

  // ── PASO 4: ackNotificacion de nuevo (IDEMPOTENCIA) ──
  console.log("\n── PASO 4: ACK de nuevo (debería no hacer nada — idempotente) ──");
  const acked2 = await ackNotificacion(r2.notif.id_notificacion, "ACK");
  console.log("  resultado:", acked2);   // null (ya estaba en ACK)

  // ── PASO 5: resolverNotificacion ──
  console.log("\n── PASO 5: Resolver notificación (ACK → RESUELTA) ──");
  const resuelta = await resolverNotificacion(r2.notif.id_notificacion, "ACK");
  console.log("  nuevo estado:", resuelta ? resuelta.estado : "sin cambio");  // RESUELTA

  // ── PASO 6: cerrarAlertaSiActiva ──
  console.log("\n── PASO 6: Cerrar alerta (ACTIVA → CERRADA) ──");
  const cerrada = await cerrarAlertaSiActiva(r2.alerta.id_alerta, r2.alerta.estado);
  console.log("  nuevo estado:", cerrada ? cerrada.estado : "sin cambio");  // CERRADA

  // ── PASO 7: cerrar de nuevo (IDEMPOTENCIA) ──
  console.log("\n── PASO 7: Cerrar alerta de nuevo (debería no hacer nada) ──");
  const cerrada2 = await cerrarAlertaSiActiva(r2.alerta.id_alerta, "CERRADA");
  console.log("  resultado:", cerrada2);  // null

  console.log("\n══════ TEST COMPLETADO ══════");
}

main()
  .catch(console.error)
  .finally(() => pool.end());
