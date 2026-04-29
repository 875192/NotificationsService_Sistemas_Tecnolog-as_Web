// Publica un evento de prueba en vehiculos/eventos
// Uso: node test/pub-vehiculo.js [nivelBateria]
// Ejemplo: node test/pub-vehiculo.js 5   → WARNING
//          node test/pub-vehiculo.js 2   → CRITICAL
//          node test/pub-vehiculo.js sin → SIN_BATERIA (CRITICAL)

const { createClient } = require("redis");

const REDIS_URL = process.env.REDIS_URL || "redis://alumnos:STWeb2026@155.210.71.86:6380";
const CHANNEL = "vehiculos/eventos";

const arg = process.argv[2] ?? "5";
const esSinBateria = arg === "sin";
const nivelBateria = esSinBateria ? 0 : parseInt(arg, 10);

const payload = {
  tipo: "VehiculoEstadoCambiado",
  fecha: new Date().toISOString(),
  datos: {
    idVehiculo: "v-test-001",
    nivelBateria: esSinBateria ? undefined : nivelBateria,
    estadoNuevo: esSinBateria ? "SIN_BATERIA" : "ACTIVO",
  },
};

(async () => {
  const client = createClient({ url: REDIS_URL });
  client.on("error", (e) => console.error("[redis] error:", e.message));

  await client.connect();
  console.log("[redis] conectado a", REDIS_URL);

  const msg = JSON.stringify(payload);
  await client.publish(CHANNEL, msg);

  console.log(`[pub] canal: ${CHANNEL}`);
  console.log("[pub] payload:", JSON.stringify(payload, null, 2));

  await client.quit();
  console.log("[redis] desconectado");
})();
