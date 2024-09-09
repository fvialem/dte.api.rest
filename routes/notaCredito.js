const { Router } = require("express");
const { param } = require("express-validator");
const { getNotaCredito, postNotaCredito } = require("../controllers/notaCredito");
const { ValidarCampos } = require("../middlewares/validarCampos");

const router = Router();
router.get(
  "/:folio?",
  [
    param("folio", "debe ingresar un folio en los parametros").not().isEmpty(),
    ValidarCampos,
  ],
  getNotaCredito
);
router.post("/", postNotaCredito ); //path,middleware,callback

module.exports = router;
