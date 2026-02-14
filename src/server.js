// ── Punto de entrada del microservicio ──
// Solo arranca el servidor. Toda la lógica está en src/.

const config = require("./config");
const app = require("./app");

app.listen(config.port, () => {
  console.log(`[${config.serviceName}] v${config.version} escuchando en http://localhost:${config.port}`);
});
