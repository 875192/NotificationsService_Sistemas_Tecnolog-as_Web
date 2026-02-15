// ── Punto de entrada del microservicio ──
// Arranca REST + WebSocket en el mismo puerto.

const http = require("http");

const config = require("./config");
const app = require("./app");
 
const { attachWebSocketServer } = require("./ws/wsServer");

// Arrancamos el subscriber de Redis (escucha eventos del orquestador)
const { startRedisSubscriber, stopRedisSubscriber } = require("./redis/subscriber");

// Creamos servidor HTTP para compartir con WS
const httpServer = http.createServer(app);

// Adjuntamos WebSocket al mismo servidor/puerto
attachWebSocketServer(httpServer);

httpServer.listen(config.port, async /* <-- cambiar esto */ () => {
  console.log(`[${config.serviceName}] v${config.version} REST en http://localhost:${config.port}`);
  console.log(`[${config.serviceName}] v${config.version} WS   en ws://localhost:${config.port}/ws`);

  //QUITAR ESTO AHORA
  console.log("[redis] starting subscriber...");
  try {
    await startRedisSubscriber();
    console.log("[redis] subscriber READY");
  } catch (e) {
    console.error("[redis] subscriber FAILED:", e.message);
  }
});

//QUITAR ESTO AHORA
async function shutdown() {
  await stopRedisSubscriber();
  httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);


