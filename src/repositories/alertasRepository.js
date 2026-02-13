// src/repositories/alertasRepository.js

const poolMod = require('../db/pool');     // puede exportar pool directo o { pool }
const pool = poolMod.pool || poolMod;      // <- robusto

async function findAlertaActivaByTipoEntidad(tipo, idEntidad) {
  const q = `
    SELECT *
    FROM alertas
    WHERE tipo = $1::tipo_alerta
      AND id_entidad = $2
      AND estado = 'ACTIVA'
    ORDER BY fecha_creacion_alerta DESC
    LIMIT 1;
  `;
  const { rows } = await pool.query(q, [tipo, idEntidad]);
  return rows[0] ?? null;
}

// Replace del contexto (y severidad)
async function updateAlertaActivaReplace(idAlerta, severidad, contexto) {
  const q = `
    UPDATE alertas
    SET severidad = $2::severidad_alerta,
        contexto = $3::jsonb,
        fecha_actualizacion_alerta = now()
    WHERE id_alerta = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(q, [idAlerta, severidad, JSON.stringify(contexto ?? {})]);
  return rows[0] ?? null;
}

async function createAlerta({ tipo, severidad, idEntidad, contexto }) {
  const q = `
    INSERT INTO alertas (tipo, severidad, id_entidad, contexto)
    VALUES ($1::tipo_alerta, $2::severidad_alerta, $3, $4::jsonb)
    RETURNING *;
  `;
  const { rows } = await pool.query(q, [tipo, severidad, idEntidad, JSON.stringify(contexto ?? {})]);
  return rows[0];
}

async function getAlertaById(idAlerta) {
  const { rows } = await pool.query(
    `SELECT * FROM alertas WHERE id_alerta = $1`,
    [idAlerta]
  );
  return rows[0] ?? null;
}

async function listAlertasActivas() {
  const { rows } = await pool.query(
    `SELECT * FROM alertas WHERE estado = 'ACTIVA' ORDER BY fecha_creacion_alerta DESC`
  );
  return rows;
}

async function cerrarAlerta(idAlerta) {
  const q = `
    UPDATE alertas
    SET estado = 'CERRADA',
        fecha_actualizacion_alerta = now()
    WHERE id_alerta = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(q, [idAlerta]);
  return rows[0] ?? null;
}

module.exports = {
  findAlertaActivaByTipoEntidad,
  updateAlertaActivaReplace,
  createAlerta,
  getAlertaById,
  listAlertasActivas,
  cerrarAlerta,
};
