var concessionariaModel = require("../models/concessionariaModel");

function cadastrar(req, res) {
    var nome_praca = req.body.nomePracaServer || req.body.nomePraca || req.body.nome_praca;
    var rodovia = req.body.rodoviaServer || req.body.rodovia;
    var km = req.body.kmServer || req.body.km;
    var cidade = req.body.cidadeServer || req.body.cidade;
    var uf = req.body.ufServer || req.body.uf;
    var fkEmpresa = req.body.empresaServer || req.body.fkEmpresa || req.body.fk_empresa;

    // Validação dos campos obrigatórios
    if (!nome_praca || !String(nome_praca).trim()) {
        return res.status(400).send("Informe o nome da praça de pedágio.");
    }

    if (!rodovia || !String(rodovia).trim()) {
        return res.status(400).send("Informe o nome da rodovia.");
    }

    if (km === undefined || km === null || String(km).trim() === "" || !Number.isFinite(Number(km)) || Number(km) < 0) {
        return res.status(400).send("Informe uma quilometragem válida.");
    }

    if (!cidade || !String(cidade).trim()) {
        return res.status(400).send("Informe a cidade.");
    }

    if (!uf || !String(uf).trim() || String(uf).trim().length !== 2) {
        return res.status(400).send("Informe o UF com 2 caracteres.");
    }

    if (fkEmpresa === undefined || fkEmpresa === null || String(fkEmpresa).trim() === "") {
        return res.status(400).send("Empresa não informada.");
    }

    // Conversão e organização dos dados
    nome_praca = String(nome_praca).trim();
    rodovia = String(rodovia).trim();
    km = Number(km);
    cidade = String(cidade).trim();
    uf = String(uf).trim().toUpperCase();
    fkEmpresa = Number(fkEmpresa);

    if (!Number.isInteger(fkEmpresa) || fkEmpresa <= 0) {
        return res.status(400).send("ID de empresa inválido.");
    }

    concessionariaModel.cadastrar(
        nome_praca,
        rodovia,
        km,
        cidade,
        uf,
        fkEmpresa
    )
    .then(function (resultado) {
        return res.status(201).json({
            mensagem: "Praça de pedágio cadastrada com sucesso!",
            id: resultado.insertId
        });
    })
    .catch(function (erro) {
        console.error("Erro ao cadastrar praça de pedágio:", erro);
        return res.status(500).send("Erro ao cadastrar praça de pedágio.");
    });
}

function listar(req, res) {
    concessionariaModel.listar()
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error("Erro ao listar concessionárias:", erro);
            return res.status(500).send("Erro ao listar concessionárias.");
        });
}

function listarPorEmpresa(req, res) {
    var fkEmpresa = req.params.fkEmpresa;

    if (!fkEmpresa || isNaN(Number(fkEmpresa))) {
        return res.status(400).send("ID da empresa inválido.");
    }

    concessionariaModel.listarPorEmpresa(Number(fkEmpresa))
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error("Erro ao listar concessionárias da empresa:", erro);
            return res.status(500).send("Erro ao listar concessionárias da empresa.");
        });
}

function buscarPorId(req, res) {
    var id = req.params.id;

    if (!id || isNaN(Number(id))) {
        return res.status(400).send("ID inválido.");
    }

    concessionariaModel.buscarPorId(Number(id))
        .then(function (resultado) {
            if (resultado.length === 0) {
                return res.status(404).send("Concessionária não encontrada.");
            }
            return res.status(200).json(resultado[0]);
        })
        .catch(function (erro) {
            console.error("Erro ao buscar concessionária:", erro);
            return res.status(500).send("Erro ao buscar concessionária.");
        });
}

function atualizar(req, res) {
    var id = req.params.id || req.body.id;
    var nome_praca = req.body.nomePracaServer || req.body.nomePraca || req.body.nome_praca;
    var rodovia = req.body.rodoviaServer || req.body.rodovia;
    var km = req.body.kmServer || req.body.km;
    var cidade = req.body.cidadeServer || req.body.cidade;
    var uf = req.body.ufServer || req.body.uf;

    if (!id || isNaN(Number(id))) {
        return res.status(400).send("ID da concessionária inválido.");
    }

    if (!nome_praca || !String(nome_praca).trim()) {
        return res.status(400).send("Informe o nome da concessionária/praça.");
    }

    if (!rodovia || !String(rodovia).trim()) {
        return res.status(400).send("Informe a rodovia.");
    }

    if (km === undefined || km === null || String(km).trim() === "" || !Number.isFinite(Number(km)) || Number(km) < 0) {
        return res.status(400).send("Informe uma quilometragem válida.");
    }

    if (!cidade || !String(cidade).trim()) {
        return res.status(400).send("Informe a cidade.");
    }

    if (!uf || !String(uf).trim() || String(uf).trim().length !== 2) {
        return res.status(400).send("Informe a UF com 2 caracteres.");
    }

    id = Number(id);
    nome_praca = String(nome_praca).trim();
    rodovia = String(rodovia).trim();
    km = Number(km);
    cidade = String(cidade).trim();
    uf = String(uf).trim().toUpperCase();

    concessionariaModel.atualizar(id, nome_praca, rodovia, km, cidade, uf)
        .then(function (resultado) {
            if (resultado.affectedRows === 0) {
                return res.status(404).send("Concessionária não encontrada.");
            }
            return res.status(200).json({
                mensagem: "Concessionária atualizada com sucesso!",
                id: id
            });
        })
        .catch(function (erro) {
            console.error("Erro ao atualizar concessionária:", erro);
            return res.status(500).send("Erro interno ao atualizar concessionária.");
        });
}

function excluir(req, res) {
    var id = req.params.id;

    if (!id || isNaN(Number(id))) {
        return res.status(400).send("ID da concessionária inválido.");
    }

    id = Number(id);

    concessionariaModel.excluir(id)
        .then(function (resultado) {
            if (resultado.affectedRows === 0) {
                return res.status(404).send("Concessionária não encontrada.");
            }
            return res.status(200).json({
                mensagem: "Concessionária excluída com sucesso!"
            });
        })
        .catch(function (erro) {
            console.error("Erro ao excluir concessionária:", erro);

            // Código MySQL 1451: ER_ROW_IS_REFERENCED_2 (chave estrangeira em servidor ou usuário)
            if (erro.code === "ER_ROW_IS_REFERENCED_2" || erro.errno === 1451) {
                return res.status(409).send("Não é possível excluir esta concessionária porque existem servidores ou usuários vinculados a ela.");
            }

            return res.status(500).send("Erro interno ao excluir concessionária.");
        });
}

module.exports = {
    cadastrar,
    listar,
    listarPorEmpresa,
    buscarPorId,
    atualizar,
    excluir
};
