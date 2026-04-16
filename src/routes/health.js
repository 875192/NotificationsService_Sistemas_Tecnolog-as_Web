const express = require("express");
const config = require("../config");
const pool = require("../db/pool");
const { getPublisher } = require("../redis/publisher");
const { broadcast } = require("../ws/hub");

const router = express.Router();

let lastStatus = null; // 'ok' | 'degraded' — para emitir solo cuando cambia

router.get("/health", async (req, res) => {
  const checks = { postgres: "ok", redis: "ok" };
  let httpStatus = 200;

  try {
    await pool.query("SELECT 1");
  } catch {
    checks.postgres = "error";
    httpStatus = 503;
  }

  try {
    const redisClient = await getPublisher();
    await redisClient.ping();
  } catch {
    checks.redis = "error";
    httpStatus = 503;
  }

  const currentStatus = httpStatus === 200 ? "ok" : "degraded";

  if (currentStatus !== lastStatus) {
    lastStatus = currentStatus;
    broadcast({
      type: currentStatus === "ok" ? "SERVICE_OK" : "SERVICE_DEGRADED",
      checks,
      timestamp: new Date().toISOString(),
    });
  }

  res.status(httpStatus).json({
    status: currentStatus,
    service: config.serviceName,
    version: config.version,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  });
});

module.exports = router;
