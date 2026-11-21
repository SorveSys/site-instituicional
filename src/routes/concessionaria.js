var express = require("express");
var router = express.Router();

var concessionariaController = require("../controllers/concessionariaController");

// Método POST para cadastrar a concessionária / praça de pedágio
router.post("/cadastrar", function (req, res) {
    concessionariaController.cadastrar(req, res);
});

// Método GET para listar todas as concessionárias
router.get("/listar", function (req, res) {
    concessionariaController.listar(req, res);
});

// Métodos GET para listar concessionárias de uma empresa
router.get("/empresa/:fkEmpresa", function (req, res) {
    concessionariaController.listarPorEmpresa(req, res);
});

router.get("/listarPorEmpresa/:fkEmpresa", function (req, res) {
    concessionariaController.listarPorEmpresa(req, res);
});

// Método GET para buscar concessionária por id
router.get("/buscar/:id", function (req, res) {
    concessionariaController.buscarPorId(req, res);
});

// Métodos PUT e POST para editar / atualizar a concessionária
router.put("/editar/:id", function (req, res) {
    concessionariaController.atualizar(req, res);
});

router.put("/atualizar/:id", function (req, res) {
    concessionariaController.atualizar(req, res);
});

router.post("/editar/:id", function (req, res) {
    concessionariaController.atualizar(req, res);
});

// Métodos DELETE e POST para excluir a concessionária
router.delete("/excluir/:id", function (req, res) {
    concessionariaController.excluir(req, res);
});

router.delete("/deletar/:id", function (req, res) {
    concessionariaController.excluir(req, res);
});

router.post("/excluir/:id", function (req, res) {
    concessionariaController.excluir(req, res);
});

module.exports = router;
