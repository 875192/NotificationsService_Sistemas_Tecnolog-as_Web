const { createClient } = require("redis");
const config = require("../config");
const { handleRedisEvent } = require("./handlers");

let subClient = null;

async function startRedisSubscriber() {
  subClient = createClient({ url: config.redis.url });

  subClient.on("error", (err) => {
    console.error("[redis] error:", err.message);
  });

  subClient.on("reconnecting", () => {
    console.warn("[redis] reconnecting...");
  });

  await subClient.connect();
  console.log("[redis] connected:", config.redis.url);

  // Subscribe a varios canales
  for (const channel of config.redis.subscribeChannels) {
    await subClient.subscribe(channel, async (message) => {
      // Redis manda string; normalmente será JSON
      let payload;
      try {
        payload = JSON.parse(message);
      } catch (e) {
        console.warn(`[redis] JSON inválido en canal ${channel}:`, message);
        return;
      }

      try {
        await handleRedisEvent(channel, payload);
      } catch (err) {
        console.error(`[redis] handler fallo (${channel}):`, err);
      }
    });

    console.log(`[redis] subscribed: ${channel}`);
  }

  return subClient;
}

async function stopRedisSubscriber() {
  if (!subClient) return;
  try {
    await subClient.quit();
    console.log("[redis] subscriber stopped");
  } catch (e) {
    // fallback duro
    try { await subClient.disconnect(); } catch {}
  } finally {
    subClient = null;
  }
}

module.exports = { startRedisSubscriber, stopRedisSubscriber };
