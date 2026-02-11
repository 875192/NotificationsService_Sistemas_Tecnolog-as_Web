// ── GET /health ──
// Devuelve el estado del microservicio.
// Útil para Docker healthcheck y monitorización.

const config = require("../config");

function handleHealth(req, res) {
  const payload = {
    status: "ok",
    service: config.serviceName,
    version: config.version,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

module.exports = handleHealth;
