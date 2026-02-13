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
};

module.exports = config;
