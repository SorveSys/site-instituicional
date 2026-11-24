var express = require("express");
var router = express.Router();

var monitoramentoController = require("../controllers/monitoramentoController");

router.get("/overview", function (req, res) {
    monitoramentoController.obterOverview(req, res);
});

router.get("/alertas", function (req, res) {
    monitoramentoController.listarAlertas(req, res);
});

router.get("/dashboard", function (req, res) {
    monitoramentoController.obterDashboard(req, res);
});

router.get("/dashboard/:idServidor", function (req, res) {
    monitoramentoController.obterDashboard(req, res);
});

module.exports = router;
