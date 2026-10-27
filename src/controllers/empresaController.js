var empresaModel = require("../models/empresaModel");

function buscarPorCnpj(req, res) {
    var cnpj = req.query.cnpj;

    if (!cnpj) {
        return res.status(400).json({
            mensagem: "Informe o CNPJ da empresa."
        });
    }

    empresaModel.buscarPorCnpj(cnpj)
        .then((resultado) => {
            return res.status(200).json(resultado);
        })
        .catch((erro) => {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao consultar empresa."
            });
        });
}

function listar(req, res) {
    empresaModel.listar()
        .then((resultado) => {
            return res.status(200).json(resultado);
        })
        .catch((erro) => {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao listar empresas."
            });
        });
}

function buscarPorId(req, res) {
    var id = req.params.id;

    if (!/^\d+$/.test(id)) {
        return res.status(400).json({
            mensagem: "ID inválido."
        });
    }

    empresaModel.buscarPorId(id)
        .then((resultado) => {
            if (resultado.length === 0) {
                return res.status(404).json({
                    mensagem: "Empresa não encontrada."
                });
            }

            return res.status(200).json(resultado[0]);
        })
        .catch((erro) => {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao consultar empresa."
            });
        });
}

function cadastrar(req, res) {
    var razaoSocial = String(req.body.razaoServer || req.body.razaoSocial || req.body.razao_social || "").trim();
    var cnpj = String(req.body.cnpjServer || req.body.cnpj || "").replace(/\D/g, "");
    var nomeFantasia = String(req.body.nomeFantasiaServer || req.body.nomeFantasia || req.body.nome_fantasia || req.body.fantasiaServer || "").trim();

    if (!razaoSocial || !cnpj) {
        return res.status(400).json({
            mensagem: "Preencha a razão social e o CNPJ."
        });
    }

    if (!nomeFantasia) {
        nomeFantasia = razaoSocial;
    }

    if (razaoSocial.length > 100 || nomeFantasia.length > 200) {
        return res.status(400).json({
            mensagem: "Um dos nomes ultrapassa o limite permitido."
        });
    }

    if (cnpj.length !== 14) {
        return res.status(400).json({
            mensagem: "CNPJ inválido. O CNPJ deve conter exatamente 14 dígitos numéricos."
        });
    }

    empresaModel.buscarPorCnpj(cnpj)
        .then((resultado) => {
            if (resultado.length > 0) {
                return res.status(409).json({
                    mensagem: "Esse CNPJ já foi cadastrado."
                });
            }

            return empresaModel.cadastrar(
                razaoSocial,
                cnpj,
                nomeFantasia
            );
        })
        .then((resultado) => {
            if (!resultado || res.headersSent) {
                return;
            }

            return res.status(201).json({
                mensagem: "Empresa cadastrada com sucesso.",
                id: resultado.insertId
            });
        })
        .catch((erro) => {
            console.error(erro);

            if (erro.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    mensagem: "Esse CNPJ já foi cadastrado."
                });
            }

            if (!res.headersSent) {
                return res.status(500).json({
                    mensagem: "Erro ao cadastrar empresa."
                });
            }
        });
}

module.exports = {
    buscarPorCnpj,
    buscarPorId,
    cadastrar,
    listar
};