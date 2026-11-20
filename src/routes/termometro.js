var express = require("express");
var router = express.Router();
var termometroController = require("../controllers/termometroController");

router.get("/kpis", function (req, res) {
    termometroController.obterKpis(req, res);
});

router.get("/historico", function (req, res) {
    termometroController.obterHistorico(req, res);
});

router.get("/dispersao", function (req, res) {
    termometroController.obterDispersao(req, res);
});

router.get("/ranking", function (req, res) {
    termometroController.obterRanking(req, res);
});

router.get("/servidores", function (req, res) {
    termometroController.listarServidoresTabela(req, res);
});

router.get("/filtros", function (req, res) {
    termometroController.obterFiltros(req, res);
});

module.exports = router;
