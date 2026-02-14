const { cerrarAlertaSiActiva } = require("../services/notificationsService");

async function postCerrar(req, res, next) {
  try {
    const { id } = req.params;
    const result = await cerrarAlertaSiActiva(id);
    if (!result) return res.status(404).json({ error: "NOT_FOUND", message: "Alerta no encontrada" });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { postCerrar };
