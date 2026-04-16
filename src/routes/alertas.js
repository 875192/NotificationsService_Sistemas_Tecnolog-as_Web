const express = require("express");
const { postCerrar, getAll } = require("../controllers/alertasController");

const router = express.Router();

router.get("/", getAll);
router.post("/:id/cerrar", postCerrar);

module.exports = router;
