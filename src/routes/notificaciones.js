const express = require("express");
const { postEvento, postAck, postResolver, getAll } = require("../controllers/notificacionesController");

const router = express.Router();

router.get("/", getAll);
router.post("/evento", postEvento);
router.post("/:id/ack", postAck);
router.post("/:id/resolver", postResolver);

module.exports = router;
