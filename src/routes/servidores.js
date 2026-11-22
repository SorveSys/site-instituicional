var express = require("express");
var router = express.Router();

var servidorController = require("../controllers/servidorController");

// Método POST para cadastrar servidor
router.post("/cadastrar", function (req, res) {
    servidorController.cadastrar(req, res);
});

// Método GET para listar todos os servidores
router.get("/listar", function (req, res) {
    servidorController.listar(req, res);
});

// Métodos GET para listar servidores por empresa
router.get("/empresa/:idEmpresa", function (req, res) {
    servidorController.listarPorEmpresa(req, res);
});

router.get("/listar/:idEmpresa", function (req, res) {
    servidorController.listarPorEmpresa(req, res);
});

// Método GET para buscar servidor por ID
router.get("/buscar/:id", function (req, res) {
    servidorController.buscarPorId(req, res);
});

// Método GET para buscar por IP
router.get("/buscar-por-ip", function (req, res) {
    servidorController.buscarPorIp(req, res);
});

// Métodos PUT e POST para editar / atualizar servidor
router.put("/editar/:id", function (req, res) {
    servidorController.atualizar(req, res);
});

router.put("/atualizar/:id", function (req, res) {
    servidorController.atualizar(req, res);
});

router.post("/editar/:id", function (req, res) {
    servidorController.atualizar(req, res);
});

// Métodos DELETE e POST para excluir servidor
router.delete("/excluir/:id", function (req, res) {
    servidorController.excluir(req, res);
});

router.delete("/deletar/:id", function (req, res) {
    servidorController.excluir(req, res);
});

router.post("/excluir/:id", function (req, res) {
    servidorController.excluir(req, res);
});

module.exports = router;
