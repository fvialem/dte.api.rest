const { validationResult } = require("express-validator");

const ValidarCampos = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const primerError = errors.errors[0].msg;
    return res.status(400).json({ msg: primerError });
  }
  next();
};

module.exports = {
  ValidarCampos,
};
