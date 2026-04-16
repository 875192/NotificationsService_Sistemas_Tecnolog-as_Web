// ── Hub WebSocket (broadcast a todos los admin) ──
// Mantiene un Set global de conexiones WebSocket admin.

const clients = new Set(); // Set<WebSocket>

function addClient(ws) {
  clients.add(ws);
  console.log(`[ws-hub] client connected (total: ${clients.size})`);
}

function removeClient(ws) {
  clients.delete(ws);
  console.log(`[ws-hub] client disconnected (total: ${clients.size})`);
}

function broadcast(payload) {
  if (clients.size === 0) return 0;

  const msg = JSON.stringify(payload);
  let sent = 0;

  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(msg);
      sent++;
    }
  }
  return sent;
}

module.exports = {
  addClient,
  removeClient,
  broadcast,
};
