var express = require("express");
var router = express.Router();

var concessionariaController = require("../controllers/concessionariaController");
var escopoUsuario = require("../utils/escopoUsuario");

router.get("/listar", escopoUsuario.exigirUsuarioAutenticado, escopoUsuario.exigirGestor, function (req, res) {
    concessionariaController.listar(req, res);
});

router.post("/cadastrar", escopoUsuario.exigirUsuarioAutenticado, escopoUsuario.exigirGestor, function (req, res) {
    concessionariaController.cadastrar(req, res);
});

router.put("/:id", escopoUsuario.exigirUsuarioAutenticado, escopoUsuario.exigirGestor, function (req, res) {
    concessionariaController.atualizar(req, res);
});

router.delete("/:id", escopoUsuario.exigirUsuarioAutenticado, escopoUsuario.exigirGestor, function (req, res) {
    concessionariaController.excluir(req, res);
});

module.exports = router;
