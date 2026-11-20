var express = require("express");
var router = express.Router();

var usuarioController = require("../controllers/usuarioController");

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

router.get("/empresa/:id", function (req, res) {
    usuarioController.listarPorEmpresa(req, res);
});

module.exports = router;