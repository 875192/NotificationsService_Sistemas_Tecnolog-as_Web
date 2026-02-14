const {
  procesarEvento,
  ackNotificacion,
  resolverNotificacion,
} = require("../services/notificationsService");

const { requireString, requireObject, allowEnum } = require("../middleware/validate");

const { emitToConductor } = require("../ws/hub");

async function postEvento(req, res, next) {
  try {
    const b = req.body;

    requireString(b, "tipo");
    requireString(b, "severidad");
    requireString(b, "idEntidad");
    requireString(b, "idConductor");
    requireString(b, "mensaje");
    requireObject(b, "contexto");

    allowEnum(b, "severidad", ["INFO", "WARNING", "CRITICAL"]);
    // Si quieres validar tipo_alerta (enum), añade:
    // allowEnum(b, "tipo", ["VEHICULO_SIN_BATERIA", ...]);

    const result = await procesarEvento({
        tipo: b.tipo,
        severidad: b.severidad,
        idEntidad: b.idEntidad,
        idConductor: b.idConductor,
        contexto: b.contexto ?? {},
        mensaje: b.mensaje,
    });

    const status = result.notifCreada ? 201 : 200;

    // Opcional (REST): Location cuando se crea una notificación nueva
    if (result.notifCreada && result.notif?.id_notificacion) {
        res.setHeader("Location", `/api/notificaciones/${result.notif.id_notificacion}`);
    }

    const evenType = result.alertaCreada ? "NOTIFICACION_CREADA" : "NOTIFICACION_ACTUALIZADA";

    // Emitir evento al conductor vía WebSocket
    emitToConductor(result.notif.id_conductor, {
        type: evenType,
        data: {
            alerta: result.alerta,
            notificacion: result.notif,
            alertaCreada: result.alertaCreada,
            notifCreada: result.notifCreada,
        },
    });

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

    emitToConductor(result.id_conductor, {
        type: "NOTIFICACION_ACK",
        data: { notificacion: result },
    });


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

    emitToConductor(result.id_conductor, {
        type: "NOTIFICACION_RESUELTA",
        data: { notificacion: result },
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { postEvento, postAck, postResolver };
