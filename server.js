// ── Punto de entrada del microservicio ──
// Solo arranca el servidor. Toda la lógica está en src/.

const config = require("./src/config");
const server = require("./src/app");

server.listen(config.port, () => {
  console.log(`[${config.serviceName}] v${config.version} escuchando en http://localhost:${config.port}`);
});
