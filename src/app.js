// ── Aplicación HTTP ──
// Crea el servidor HTTP y enruta las peticiones.
// Separado de server.js para mantener responsabilidades claras.

const http = require("http");
const handleHealth = require("./routes/health");

// Helper para enviar respuestas JSON
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

// Router principal
function onRequest(req, res) {
  // GET /health
  if (req.method === "GET" && req.url === "/health") {
    return handleHealth(req, res);
  }

  // 404 — ruta no encontrada
  sendJSON(res, 404, { error: "Not Found" });
}

// Crear y exportar el servidor
const server = http.createServer(onRequest);

module.exports = server;
