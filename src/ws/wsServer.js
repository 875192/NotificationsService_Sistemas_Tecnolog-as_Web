const { WebSocketServer } = require("ws");
const { addClient, removeClient } = require("./hub");

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function attachWebSocketServer(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
  });

  wss.on("connection", (ws, req) => {
    // Registrar cliente admin
    addClient(ws);
    ws.send(JSON.stringify({ type: "CONNECTED", message: "Conectado al panel de administración" }));

    // Keepalive simple (ping/pong)
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });

    ws.on("message", (raw) => {
      const msg = safeJsonParse(raw.toString());
      if (!msg || typeof msg.type !== "string") {
        return ws.send(JSON.stringify({ type: "ERROR", message: "Mensaje inválido (JSON)" }));
      }

      if (msg.type === "PING") {
        return ws.send(JSON.stringify({ type: "PONG" }));
      }

      ws.send(JSON.stringify({ type: "ERROR", message: `type no soportado: ${msg.type}` }));
    });

    ws.on("close", () => {
      removeClient(ws);
    });

    ws.on("error", () => {
      removeClient(ws);
    });
  });

  // Intervalo de ping para limpiar sockets muertos
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  return wss;
}

module.exports = { attachWebSocketServer };
