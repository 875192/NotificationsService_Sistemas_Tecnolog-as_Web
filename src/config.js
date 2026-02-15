// ── Configuración centralizada del microservicio ──
// Todas las variables de entorno y constantes se leen aquí.
// El resto del código importa desde este módulo.

require("dotenv").config();

const config = {
  // Servidor
  port: parseInt(process.env.PORT, 10) || 3000,

  // Metadatos del servicio
  serviceName: "notifications-service",
  version: "1.0.0",

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",

    // Canales que consume notifications-service (sub)
    subscribeChannels: [
      "vehiculos.eventos",
      "zonas.eventos",
      "postes.eventos",
    ],
  }
};

module.exports = config;
