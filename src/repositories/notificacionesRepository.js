const pool = require('../db/pool');

async function findNotificacionPendienteByDedupKey(dedupKey) {
  const q = `
    SELECT * FROM notificaciones
    WHERE dedup_key = $1 AND estado = 'PENDIENTE'
    LIMIT 1;
  `;
  const { rows } = await pool.query(q, [dedupKey]);
  return rows[0] ?? null;
}

async function createNotificacion({ idAlerta, idConductor, mensaje, dedupKey }) {
  const q = `
    INSERT INTO notificaciones (id_alerta, id_conductor, mensaje, dedup_key)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const { rows } = await pool.query(q, [idAlerta, idConductor, mensaje, dedupKey]);
  return rows[0];
}

async function updateNotificacionMensaje(idNotificacion, mensaje) {
  const q = `
    UPDATE notificaciones
    SET mensaje = $2, fecha_actualizacion_notificacion = now()
    WHERE id_notificacion = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(q, [idNotificacion, mensaje]);
  return rows[0] ?? null;
}

async function setEstadoNotificacion(idNotificacion, estado) {
  const q = `
    UPDATE notificaciones
    SET estado = $2::estado_notificacion, fecha_actualizacion_notificacion = now()
    WHERE id_notificacion = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(q, [idNotificacion, estado]);
  return rows[0] ?? null;
}

async function listNotificacionesByConductor(idConductor, estado = null) {
  const q = estado
    ? `SELECT * FROM notificaciones WHERE id_conductor=$1 AND estado=$2::estado_notificacion ORDER BY fecha_actualizacion_notificacion DESC`
    : `SELECT * FROM notificaciones WHERE id_conductor=$1 ORDER BY fecha_actualizacion_notificacion DESC`;
  const params = estado ? [idConductor, estado] : [idConductor];
  const { rows } = await pool.query(q, params);
  return rows;
}

module.exports = {
  findNotificacionPendienteByDedupKey,
  createNotificacion,
  updateNotificacionMensaje,
  setEstadoNotificacion,
  listNotificacionesByConductor,
};
