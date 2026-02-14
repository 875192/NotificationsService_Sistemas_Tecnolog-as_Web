const express = require("express");

const healthRoutes = require("./routes/health");
const notificacionesRoutes = require("./routes/notificaciones");
const alertasRoutes = require("./routes/alertas");

const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json());

// Rutas
app.use(healthRoutes); // expone GET /health
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/alertas", alertasRoutes);

// 404 + errores
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
