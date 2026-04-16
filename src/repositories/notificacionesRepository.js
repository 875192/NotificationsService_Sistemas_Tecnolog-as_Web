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

async function createNotificacion({ idAlerta, mensaje, dedupKey }) {
  const q = `
    INSERT INTO notificaciones (id_alerta, mensaje, dedup_key)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const { rows } = await pool.query(q, [idAlerta, mensaje, dedupKey]);
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

async function getNotificacionById(idNotificacion) {
  const { rows } = await pool.query(
    `SELECT * FROM notificaciones WHERE id_notificacion = $1`,
    [idNotificacion]
  );
  return rows[0] ?? null;
} 



async function listAllNotificaciones(estado = null) {
  const q = estado
    ? `SELECT n.*, a.tipo AS tipo_alerta, a.severidad, a.id_entidad
       FROM notificaciones n
       JOIN alertas a ON a.id_alerta = n.id_alerta
       WHERE n.estado = $1::estado_notificacion
       ORDER BY n.fecha_creacion_notificacion DESC`
    : `SELECT n.*, a.tipo AS tipo_alerta, a.severidad, a.id_entidad
       FROM notificaciones n
       JOIN alertas a ON a.id_alerta = n.id_alerta
       ORDER BY n.fecha_creacion_notificacion DESC`;
  const params = estado ? [estado] : [];
  const { rows } = await pool.query(q, params);
  return rows;
}

module.exports = {
  findNotificacionPendienteByDedupKey,
  createNotificacion,
  updateNotificacionMensaje,
  setEstadoNotificacion,
  getNotificacionById,
  listAllNotificaciones,
};
