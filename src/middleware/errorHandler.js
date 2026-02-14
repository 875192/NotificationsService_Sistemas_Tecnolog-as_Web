function notFoundHandler(req, res) {
  res.status(404).json({ error: "NOT_FOUND", message: "Ruta no encontrada" });
}

function errorHandler(err, req, res, next) { // eslint-disable-line
  const status = Number(err.status || 500);

  const payload = {
    error: status === 400 ? "BAD_REQUEST" : "INTERNAL_ERROR",
    message: err.message || "Error inesperado",
  };

  if (err.details) payload.details = err.details;

  // Si viene de Postgres (pg) suele traer code (ej: 23505)
  if (err.code) payload.db = { code: err.code };

  res.status(status).json(payload);
}

module.exports = { notFoundHandler, errorHandler };
