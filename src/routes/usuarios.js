var express = require("express");
var router = express.Router();

var usuarioController = require("../controllers/usuarioController");

// Método POST para cadastrar usuário
router.post("/cadastrar", function (req, res) {
    usuarioController.cadastrar(req, res);
});

// Método POST para login / autenticação
router.post("/autenticar", function (req, res) {
    usuarioController.autenticar(req, res);
});

// Método GET para listar todos os usuários
router.get("/listar", function (req, res) {
    usuarioController.listar(req, res);
});

// Métodos GET para listar perfis disponíveis
router.get("/perfis", function (req, res) {
    usuarioController.listarPerfis(req, res);
});

router.get("/listar-perfis", function (req, res) {
    usuarioController.listarPerfis(req, res);
});

// Métodos GET para listar usuários por empresa
router.get("/empresa/:id", function (req, res) {
    usuarioController.listarPorEmpresa(req, res);
});

router.get("/empresa/:fkEmpresa", function (req, res) {
    usuarioController.listarPorEmpresa(req, res);
});

// Método GET para buscar usuário por ID
router.get("/buscar/:id", function (req, res) {
    usuarioController.buscarPorId(req, res);
});

// Métodos PUT e POST para editar / atualizar usuário
router.put("/editar/:id", function (req, res) {
    usuarioController.atualizar(req, res);
});

router.put("/atualizar/:id", function (req, res) {
    usuarioController.atualizar(req, res);
});

router.post("/editar/:id", function (req, res) {
    usuarioController.atualizar(req, res);
});

// Métodos DELETE e POST para excluir usuário
router.delete("/excluir/:id", function (req, res) {
    usuarioController.excluir(req, res);
});

router.delete("/deletar/:id", function (req, res) {
    usuarioController.excluir(req, res);
});

router.post("/excluir/:id", function (req, res) {
    usuarioController.excluir(req, res);
});

module.exports = router;
