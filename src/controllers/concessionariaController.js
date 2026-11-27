var concessionariaModel = require("../models/concessionariaModel");
var escopoUsuario = require("../utils/escopoUsuario");

var UFS_VALIDAS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

function normalizarCamposConcessionaria(body) {
    var nomePraca = String(body.nome_praca || body.nomePraca || body.nomePracaServer || "").trim();
    var rodovia = String(body.rodovia || body.rodoviaServer || "").trim();
    var kmBruto = body.km !== undefined ? body.km : body.kmServer;
    var kmStr = String(kmBruto !== undefined && kmBruto !== null ? kmBruto : "").replace(",", ".").trim();
    var km = kmStr === "" ? NaN : Number(kmStr);
    var cidade = String(body.cidade || body.cidadeServer || "").trim();
    var uf = String(body.uf || body.ufServer || "").trim().toUpperCase();

    if (!nomePraca || !rodovia || kmStr === "" || !cidade || !uf) {
        return { erro: "Preencha todos os campos obrigatórios (Nome da Praça, Rodovia, Km, Cidade e UF)." };
    }

    if (nomePraca.length > 150) {
        return { erro: "O nome da praça deve ter no máximo 150 caracteres." };
    }

    if (rodovia.length > 100) {
        return { erro: "A rodovia deve ter no máximo 100 caracteres." };
    }

    if (isNaN(km) || km < 0 || km > 9999.99) {
        return { erro: "Informe uma quilometragem (Km) válida entre 0 e 9999.99." };
    }

    if (cidade.length > 100) {
        return { erro: "A cidade deve ter no máximo 100 caracteres." };
    }

    if (uf.length !== 2 || !/^[A-Z]{2}$/.test(uf) || UFS_VALIDAS.indexOf(uf) === -1) {
        return { erro: "Informe uma sigla de UF válida (ex: SP, RJ, MG)." };
    }

    return {
        dados: {
            nome_praca: nomePraca,
            rodovia: rodovia,
            km: Number(km.toFixed(2)),
            cidade: cidade,
            uf: uf
        }
    };
}

function listar(req, res) {
    var ctx = req.usuarioContexto;

    concessionariaModel.listarPorEscopo(ctx)
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error("Erro ao listar concessionárias:", erro);
            return res.status(500).json({
                mensagem: "Erro ao consultar concessionárias no banco de dados."
            });
        });
}

function cadastrar(req, res) {
    var ctx = req.usuarioContexto;

    if (!ctx.fk_empresa) {
        return res.status(400).json({
            mensagem: "Nenhuma empresa vinculada ao usuário autenticado."
        });
    }

    var validacao = normalizarCamposConcessionaria(req.body || {});
    if (validacao.erro) {
        return res.status(400).json({ mensagem: validacao.erro });
    }

    var d = validacao.dados;

    concessionariaModel.cadastrar(d.nome_praca, d.rodovia, d.km, d.cidade, d.uf, ctx.fk_empresa)
        .then(function (resultado) {
            return res.status(201).json({
                mensagem: "Concessionária cadastrada com sucesso!",
                id: resultado.insertId
            });
        })
        .catch(function (erro) {
            console.error("Erro ao cadastrar concessionária:", erro);
            return res.status(500).json({
                mensagem: "Erro ao cadastrar concessionária no banco de dados."
            });
        });
}

function atualizar(req, res) {
    var ctx = req.usuarioContexto;
    var id = escopoUsuario.inteiroPositivo(req.params.id);

    if (!id) {
        return res.status(400).json({ mensagem: "ID de concessionária inválido." });
    }

    var validacao = normalizarCamposConcessionaria(req.body || {});
    if (validacao.erro) {
        return res.status(400).json({ mensagem: validacao.erro });
    }

    var d = validacao.dados;

    concessionariaModel.buscarPorId(id)
        .then(function (encontradas) {
            if (!encontradas || encontradas.length === 0) {
                return res.status(404).json({ mensagem: "Concessionária não encontrada." });
            }

            if (!escopoUsuario.concessionariaNoEscopo(ctx, encontradas[0])) {
                return res.status(403).json({
                    mensagem: "Você não tem permissão para editar esta concessionária."
                });
            }

            return concessionariaModel.atualizar(id, d.nome_praca, d.rodovia, d.km, d.cidade, d.uf)
                .then(function () {
                    return concessionariaModel.buscarPorId(id);
                })
                .then(function (atualizada) {
                    return res.status(200).json({
                        mensagem: "Concessionária atualizada com sucesso!",
                        concessionaria: atualizada[0] || null
                    });
                });
        })
        .catch(function (erro) {
            console.error("Erro ao atualizar concessionária:", erro);
            if (!res.headersSent) {
                return res.status(500).json({
                    mensagem: "Erro ao atualizar concessionária no banco de dados."
                });
            }
        });
}

function excluir(req, res) {
    var ctx = req.usuarioContexto;
    var id = escopoUsuario.inteiroPositivo(req.params.id);

    if (!id) {
        return res.status(400).json({ mensagem: "ID de concessionária inválido." });
    }

    concessionariaModel.buscarPorId(id)
        .then(function (encontradas) {
            if (!encontradas || encontradas.length === 0) {
                return res.status(404).json({ mensagem: "Concessionária não encontrada." });
            }

            if (!escopoUsuario.concessionariaNoEscopo(ctx, encontradas[0])) {
                return res.status(403).json({
                    mensagem: "Você não tem permissão para excluir esta concessionária."
                });
            }

            return concessionariaModel.contarDependencias(id)
                .then(function (deps) {
                    var totalServidores = deps && deps[0] ? Number(deps[0].total_servidores) : 0;
                    var totalUsuarios = deps && deps[0] ? Number(deps[0].total_usuarios) : 0;

                    if (totalServidores > 0 || totalUsuarios > 0) {
                        var partes = [];
                        if (totalServidores > 0) partes.push(totalServidores + " servidor(es)");
                        if (totalUsuarios > 0) partes.push(totalUsuarios + " usuário(s)");
                        return res.status(409).json({
                            mensagem: "Não é possível excluir esta concessionária pois existem " + partes.join(" e ") + " vinculado(s) a ela."
                        });
                    }

                    return concessionariaModel.excluir(id).then(function () {
                        return res.status(200).json({
                            mensagem: "Concessionária removida com sucesso!"
                        });
                    });
                });
        })
        .catch(function (erro) {
            console.error("Erro ao excluir concessionária:", erro);
            if (erro.code === "ER_ROW_IS_REFERENCED_2") {
                return res.status(409).json({
                    mensagem: "Não é possível excluir esta concessionária pois há registros vinculados a ela."
                });
            }
            if (!res.headersSent) {
                return res.status(500).json({
                    mensagem: "Erro ao excluir concessionária no banco de dados."
                });
            }
        });
}

module.exports = {
    listar,
    cadastrar,
    atualizar,
    excluir
};
