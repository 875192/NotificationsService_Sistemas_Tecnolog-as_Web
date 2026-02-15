const { createClient } = require("redis");
const config = require("../config");

let pubClient = null;

async function getPublisher() {
  if (!pubClient) {
    pubClient = createClient({ url: config.redis.url });
    pubClient.on("error", (e) => console.error("[redis][pub] error:", e.message));
    await pubClient.connect();
    console.log("[redis][pub] connected:", config.redis.url);
  }
  return pubClient;
}

async function publishEvent(tipo, datos) {
  const client = await getPublisher();

  const msg = JSON.stringify({
    tipo,
    fecha: new Date().toISOString(),
    datos,
  });

  await client.publish(config.redis.publishChannel, msg);
}

async function stopPublisher() {
  if (!pubClient) return;
  try {
    await pubClient.quit();
    console.log("[redis][pub] stopped");
  } finally {
    pubClient = null;
  }
}

module.exports = { publishEvent, stopPublisher };
