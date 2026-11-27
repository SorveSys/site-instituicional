var express = require("express");
var router = express.Router();

var servidorController = require("../controllers/servidorController");
var escopoUsuario = require("../utils/escopoUsuario");

router.post("/cadastrar", escopoUsuario.exigirUsuarioAutenticado, escopoUsuario.exigirGestor, function (req, res) {
    servidorController.cadastrar(req, res);
});

router.get("/buscar-por-ip", function (req, res) {
    servidorController.buscarPorIp(req, res);
});

router.get("/listar", escopoUsuario.exigirUsuarioAutenticado, function (req, res) {
    servidorController.listar(req, res);
});

router.get("/listar/:idEmpresa", function (req, res) {
    servidorController.listarPorEmpresa(req, res);
});

router.put("/:id", escopoUsuario.exigirUsuarioAutenticado, escopoUsuario.exigirGestor, function (req, res) {
    servidorController.atualizar(req, res);
});

router.delete("/:id", escopoUsuario.exigirUsuarioAutenticado, escopoUsuario.exigirGestor, function (req, res) {
    servidorController.excluir(req, res);
});

module.exports = router;
