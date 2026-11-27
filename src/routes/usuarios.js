var express = require("express");
var router = express.Router();

var usuarioController = require("../controllers/usuarioController");
var escopoUsuario = require("../utils/escopoUsuario");

router.post("/cadastrar", function (req, res) {
    usuarioController.cadastrar(req, res);
});

router.post("/autenticar", function (req, res) {
    usuarioController.autenticar(req, res);
});

router.get("/perfis", function (req, res) {
    usuarioController.listarPerfis(req, res);
});

router.get("/listar-perfis", function (req, res) {
    usuarioController.listarPerfis(req, res);
});

router.get("/listar", escopoUsuario.exigirUsuarioAutenticado, function (req, res) {
    usuarioController.listar(req, res);
});

router.get("/empresa/:id", function (req, res) {
    usuarioController.listarPorEmpresa(req, res);
});

router.put("/:id", escopoUsuario.exigirUsuarioAutenticado, escopoUsuario.exigirGestor, function (req, res) {
    usuarioController.atualizar(req, res);
});

router.delete("/:id", escopoUsuario.exigirUsuarioAutenticado, escopoUsuario.exigirGestor, function (req, res) {
    usuarioController.excluir(req, res);
});

module.exports = router;
