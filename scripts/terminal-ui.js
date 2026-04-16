require('dotenv').config();
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const WS_URL = `ws://localhost:${PORT}/ws`;

console.log('=======================================================');
console.log(` Iniciando Terminal Monitor en: ${WS_URL}`);
console.log('=======================================================');

function connect() {
  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    // Verde solo para la conexión establecida
    console.log('\x1b[32m%s\x1b[0m', '[WebSocket] Conexión establecida a Notification Service.\n');
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      
      if (msg.type === 'CONNECTED') {
        console.log(`> ${msg.message}\n`);
        return;
      }
      
      if (msg.type === 'NOTIFICACION_CREADA' || msg.type === 'NOTIFICACION_ACTUALIZADA') {
        const { alerta, notificacion } = msg.data;

        console.log(`  EVENTO: [${alerta.severidad}] - ${alerta.tipo}`);
        console.log(`   Entidad: ${alerta.id_entidad} | Estado: ${notificacion.estado}`);
        console.log('---\n');
      } 
      else if (msg.type === 'NOTIFICACION_ACK' || msg.type === 'NOTIFICACION_RESUELTA') {
        const { notificacion, alerta } = msg.data;
        
        console.log(`  ACTUALIZACIÓN -> ${notificacion.estado}`);
        console.log(`   Entidad: ${alerta?.id_entidad || 'N/A'}`);
        console.log('---\n');
      }
    } catch (err) {
      console.error('Error procesando mensaje WebSocket:', err.message);
    }
  });

  ws.on('close', () => {
    // Rojo solo para la caída de conexión
    console.log('\x1b[31m%s\x1b[0m', '  [WebSocket] Desconectado. Reintentando en 3 segundos...');
    setTimeout(connect, 3000);
  });

  ws.on('error', (err) => {
    if (err.code !== 'ECONNREFUSED') {
      // Rojo para los errores de conexión
      console.log('\x1b[31m%s\x1b[0m', `  Error en la conexión: ${err.message}`);
    }
  });
}

connect();
