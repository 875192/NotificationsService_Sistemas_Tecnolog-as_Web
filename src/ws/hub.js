// Mantiene un mapa: idConductor -> Set(conexiones WebSocket)

const subscribers = new Map(); // Map<string, Set<WebSocket>>

function subscribe(idConductor, ws) {
  if (!idConductor) return;

  let set = subscribers.get(idConductor);
  if (!set) {
    set = new Set();
    subscribers.set(idConductor, set);
  }
  set.add(ws);

  // Guardamos para poder limpiar en close
  ws.__idConductor = idConductor;
}

function unsubscribe(ws) {
  const idConductor = ws.__idConductor;
  if (!idConductor) return;

  const set = subscribers.get(idConductor);
  if (!set) return;

  set.delete(ws);
  if (set.size === 0) subscribers.delete(idConductor);

  ws.__idConductor = undefined;
}

function emitToConductor(idConductor, payload) {
  const set = subscribers.get(idConductor);
  if (!set || set.size === 0) return 0;

  const msg = JSON.stringify(payload);
  let sent = 0;

  for (const ws of set) {
    if (ws.readyState === ws.OPEN) {
      ws.send(msg);
      sent++;
    }
  }
  return sent;
}

module.exports = {
  subscribe,
  unsubscribe,
  emitToConductor,
};
