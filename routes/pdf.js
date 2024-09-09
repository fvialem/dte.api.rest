const { Router } = require("express");
const { check, param } = require("express-validator");
const { postBoleta, getBoleta } = require("../controllers/boleta");
const { ValidarCampos } = require("../middlewares/validarCampos");
const { postPDF } = require("../controllers/pdf");

const router = Router();

router.post("/", postPDF); //path,middleware,callback

module.exports = router;
