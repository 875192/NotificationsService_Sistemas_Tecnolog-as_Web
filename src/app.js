const express = require("express");
const path = require("path");

const healthRoutes = require("./routes/health");
const notificacionesRoutes = require("./routes/notificaciones");
const alertasRoutes = require("./routes/alertas");

const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json());

// Enable CORS for frontend panel
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Servir frontend admin (archivos estáticos)
app.use(express.static(path.join(__dirname, "..", "public")));

// Rutas
app.use(healthRoutes); // expone GET /health
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/alertas", alertasRoutes);

// 404 + errores
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

