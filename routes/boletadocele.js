const { Router } = require("express");
const { check, param } = require("express-validator");
const { getBoletaDocele, postBoletaDocele } = require("../controllers/boleta-docele");
const { ValidarCampos } = require("../middlewares/validarCampos");

const router = Router();
router.get(
  "/:folio?",
  [
    param("folio", "debe ingresar un folio en los parametros").not().isEmpty(),
    ValidarCampos,
  ],
  getBoletaDocele
);
router.post("/", postBoletaDocele); //path,middleware,callback

module.exports = router;
