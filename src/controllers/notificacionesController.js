const {
  procesarEvento,
  ackNotificacion,
  resolverNotificacion,
} = require("../services/notificationsService");

const { requireString, requireObject, allowEnum } = require("../middleware/validate");
const { broadcast } = require("../ws/hub");
const { publishEvent } = require("../redis/publisher");
const { listAllNotificaciones } = require("../repositories/notificacionesRepository");
const { getAlertaById } = require("../repositories/alertasRepository");

async function postEvento(req, res, next) {
  try {
    const b = req.body;

    requireString(b, "tipo");
    requireString(b, "severidad");
    requireString(b, "idEntidad");

    requireString(b, "mensaje");
    requireObject(b, "contexto");

    allowEnum(b, "severidad", ["INFO", "WARNING", "CRITICAL"]);

    const result = await procesarEvento({
      tipo: b.tipo,
      severidad: b.severidad,
      idEntidad: b.idEntidad,
      contexto: b.contexto ?? {},
      mensaje: b.mensaje,
    });

    const status = result.notifCreada ? 201 : 200;

    if (result.notifCreada && result.notif?.id_notificacion) {
      res.setHeader("Location", `/api/notificaciones/${result.notif.id_notificacion}`);
    }

    const eventType = result.notifCreada ? "NOTIFICACION_CREADA" : "NOTIFICACION_ACTUALIZADA";

    // Emitir evento al panel admin vía WebSocket (broadcast)
    broadcast({
      type: eventType,
      data: {
        alerta: result.alerta,
        notificacion: result.notif,
        alertaCreada: result.alertaCreada,
        notifCreada: result.notifCreada,
      },
    });

    // Alertas
    if (result.alertaCreada) {
      await publishEvent("AlertaCreada", result.alerta);
    } else {
      await publishEvent("AlertaActualizada", result.alerta);
    }

    // Notificaciones
    if (result.notifCreada) {
      await publishEvent("NotificacionCreada", result.notif);
    } else {
      await publishEvent("NotificacionActualizada", result.notif);
    }

    res.status(status).json(result);
  } catch (err) {
    next(err);
  }
}

async function postAck(req, res, next) {
  try {
    const { id } = req.params;

    const result = await ackNotificacion(id);
    if (!result) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Notificación no encontrada" });
    }

    const alerta = await getAlertaById(result.id_alerta);

    broadcast({
      type: "NOTIFICACION_ACK",
      data: { notificacion: result, alerta },
    });

    await publishEvent("NotificacionActualizada", result);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function postResolver(req, res, next) {
  try {
    const { id } = req.params;

    const result = await resolverNotificacion(id);
    if (!result) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Notificación no encontrada" });
    }

    const alerta = await getAlertaById(result.id_alerta);

    broadcast({
      type: "NOTIFICACION_RESUELTA",
      data: { notificacion: result, alerta },
    });

    await publishEvent("NotificacionActualizada", result);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getAll(req, res, next) {
  try {
    const estado = req.query.estado || null;
    const rows = await listAllNotificaciones(estado);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { postEvento, postAck, postResolver, getAll };
