const { cerrarAlertaSiActiva } = require("../services/notificationsService");
const { listAlertasActivas } = require("../repositories/alertasRepository");

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

async function getAll(req, res, next) {
  try {
    const rows = await listAlertasActivas();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { postCerrar, getAll };
