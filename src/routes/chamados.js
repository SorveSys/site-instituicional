var express = require("express");
var router = express.Router();

var chamadoController = require("../controllers/chamadoController");

router.post("/abrir", function (req, res) {
    chamadoController.abrirChamado(req, res);
});

router.get("/listar", function (req, res) {
    chamadoController.listar(req, res);
});

router.get("/listar/empresa/:idEmpresa", function (req, res) {
    chamadoController.listarPorEmpresa(req, res);
});

router.get("/listar/servidor/:idServidor", function (req, res) {
    chamadoController.listarPorServidor(req, res);
});

router.get("/buscar/:chave", function (req, res) {
    chamadoController.buscarPorChaveJira(req, res);
});

module.exports = router;
