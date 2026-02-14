const express = require("express");
const { postCerrar } = require("../controllers/alertasController");

const router = express.Router();

router.post("/:id/cerrar", postCerrar);

module.exports = router;
