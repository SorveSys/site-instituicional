var express = require("express");
var router = express.Router();

var empresaController = require("../controllers/empresaController");

router.post("/cadastrar", empresaController.cadastrar);

router.get("/buscar", empresaController.buscarPorCnpj);

router.get("/buscar/:id", empresaController.buscarPorId);

router.get("/listar", empresaController.listar);

module.exports = router;