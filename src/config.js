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
    url: process.env.REDIS_URL || "redis://alumnos:STWeb2026@155.210.71.86:6380",

    // Canales que consume notifications-service (sub) - formato: servicio/evento o nombre-servicio
    subscribeChannels: [
      "vehiculos/eventos",   // microservicio de vehículos
      "zonas-service",       // microservicio de zonas
      "postes-service",      // microservicio de postes
    ],

    // canal para emitir eventos (pub) - formato: nombreServicio/canal
    publishChannel: process.env.REDIS_NOTIF_CHANNEL || "notifications-service/eventos",
  }
};

module.exports = config;