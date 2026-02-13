require('dotenv').config();

// Pool robusto: soporta exportar "pool" directo o { pool }
const poolMod = require('../src/db/pool.js');
const pool = poolMod.pool || poolMod;

const {
  createAlerta,
  findAlertaActivaByTipoEntidad,
  updateAlertaActivaReplace,
} = require('../src/repositories/alertasRepository.js');

const {
  buildDedupKey,
  findNotificacionPendienteByDedupKey,
  createNotificacion,
  updateNotificacionMensaje,
  setEstadoNotificacion,
} = require('../src/repositories/notificacionesRepository.js');

// Opción A + REPLACE: reutilizar una alerta ACTIVA por tipo+entidad,
// y si existe, actualizar su contexto (replace) y severidad.
async function getOrCreateAlertaActivaReplace({ tipo, severidad, idEntidad, contexto }) {
  const alertaActiva = await findAlertaActivaByTipoEntidad(tipo, idEntidad);

  if (alertaActiva) {
    const alertaUpd = await updateAlertaActivaReplace(alertaActiva.id_alerta, severidad, contexto);
    console.log('ALERTA: UPDATED (replace contexto)', alertaUpd.id_alerta);
    return alertaUpd;
  }

  const alertaNew = await createAlerta({ tipo, severidad, idEntidad, contexto });
  console.log('ALERTA: CREATED', alertaNew.id_alerta);
  return alertaNew;
}

async function main() {
  const tipo = 'VEHICULO_SIN_BATERIA';
  const severidad = 'CRITICAL';
  const idEntidad = 'vehiculo-123';
  const idConductor = 'conductor-9';

  // Cambia este valor y re-ejecuta para ver el REPLACE del contexto en la alerta
  const bateria = 3;

  // 1) ALERTA (Opción A + replace)
  const alerta = await getOrCreateAlertaActivaReplace({
    tipo,
    severidad,
    idEntidad,
    contexto: { bateria },
  });

  // 2) Dedup key (para NOTIFICACIÓN)
  const dedupKey = buildDedupKey({ tipo, idEntidad, idConductor });

  // 3) Crear o actualizar NOTIFICACIÓN PENDIENTE
  let notif = await findNotificacionPendienteByDedupKey(dedupKey);

  if (!notif) {
    notif = await createNotificacion({
      idAlerta: alerta.id_alerta,
      idConductor,
      mensaje: `Batería crítica (${bateria}%). Busca un punto de carga.`,
      dedupKey,
    });
    console.log('NOTIFICACIÓN: CREATED', notif.id_notificacion);
  } else {
    notif = await updateNotificacionMensaje(
      notif.id_notificacion,
      `UPDATE: batería aún más baja (${bateria}%). Urgente recargar.`
    );
    console.log('NOTIFICACIÓN: UPDATED', notif.id_notificacion);
  }

  
  // 4) ACK (opcional)
  // OJO: si haces ACK, en la siguiente ejecución NO habrá "PENDIENTE" y se creará una nueva notificación.
  // Si quieres ver "UPDATED" en ejecuciones consecutivas, comenta estas 2 líneas.
  const acked = await setEstadoNotificacion(notif.id_notificacion, 'ACK');
  console.log('NOTIFICACIÓN: ACK', acked.id_notificacion);

  console.log({
    alerta_id: alerta.id_alerta,
    alerta_estado: alerta.estado,
    alerta_contexto: alerta.contexto,
    notif_id: acked.id_notificacion,
    notif_estado: acked.estado,
    dedup_key: acked.dedup_key,
  });
}

main()
  .catch(console.error)
  .finally(() => pool.end());
