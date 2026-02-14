const { WebSocketServer } = require("ws");
const url = require("url");
const { subscribe, unsubscribe } = require("./hub");

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function attachWebSocketServer(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    // Recomendado: limitar a una ruta concreta
    path: "/ws",
  });

  wss.on("connection", (ws, req) => {
    // 1) Suscripción por query: ws://host:3000/ws?idConductor=conductor-9
    const parsed = url.parse(req.url, true);
    const idConductor = parsed.query.idConductor;

    if (idConductor) {
      subscribe(idConductor, ws);
      ws.send(JSON.stringify({ type: "SUBSCRIBED", idConductor }));
    } else {
      ws.send(JSON.stringify({
        type: "NEED_SUBSCRIBE",
        message: "Envía {type:'SUBSCRIBE', idConductor:'...'}",
      }));
    }

    // Keepalive simple (ping/pong)
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });

    ws.on("message", (raw) => {
      const msg = safeJsonParse(raw.toString());
      if (!msg || typeof msg.type !== "string") {
        return ws.send(JSON.stringify({ type: "ERROR", message: "Mensaje inválido (JSON)" }));
      }

      if (msg.type === "SUBSCRIBE") {
        if (!msg.idConductor || typeof msg.idConductor !== "string") {
          return ws.send(JSON.stringify({ type: "ERROR", message: "idConductor requerido" }));
        }
        // Si ya estaba suscrito a otro, limpiamos y re-suscribimos
        unsubscribe(ws);
        subscribe(msg.idConductor, ws);
        return ws.send(JSON.stringify({ type: "SUBSCRIBED", idConductor: msg.idConductor }));
      }

      if (msg.type === "PING") {
        return ws.send(JSON.stringify({ type: "PONG" }));
      }

      ws.send(JSON.stringify({ type: "ERROR", message: `type no soportado: ${msg.type}` }));
    });

    ws.on("close", () => {
      unsubscribe(ws);
    });

    ws.on("error", () => {
      unsubscribe(ws);
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
