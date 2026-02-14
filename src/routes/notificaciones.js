const express = require("express");
const { postEvento, postAck, postResolver } = require("../controllers/notificacionesController");

const router = express.Router();

router.post("/evento", postEvento);
router.post("/:id/ack", postAck);
router.post("/:id/resolver", postResolver);

module.exports = router;
