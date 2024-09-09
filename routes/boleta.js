const { Router } = require("express");
const { check, param } = require("express-validator");
const { postBoleta, getBoleta } = require("../controllers/boleta");
const { ValidarCampos } = require("../middlewares/validarCampos");

const router = Router();
router.get(
  "/:folio?",
  [
    param("folio", "debe ingresar un folio en los parametros").not().isEmpty(),
    ValidarCampos,
  ],
  getBoleta
);
router.post("/", postBoleta); //path,middleware,callback

module.exports = router;
