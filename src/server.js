// ── Punto de entrada del microservicio ──
// Arranca REST + WebSocket en el mismo puerto.

const http = require("http");

const config = require("./config");
const app = require("./app");

const { attachWebSocketServer } = require("./ws/wsServer");

// Creamos servidor HTTP para compartir con WS
const httpServer = http.createServer(app);

// Adjuntamos WebSocket al mismo servidor/puerto
attachWebSocketServer(httpServer);

httpServer.listen(config.port, () => {
  console.log(`[${config.serviceName}] v${config.version} REST en http://localhost:${config.port}`);
  console.log(`[${config.serviceName}] v${config.version} WS   en ws://localhost:${config.port}/ws`);
});
