var servidorModel = require("../models/servidorModel");

function cadastrar(req, res) {
    var tipo = req.body.tipoServer || req.body.tipo;
    var ip = req.body.ipServer || req.body.ip;
    var fkConcessionaria = req.body.concessionariaServer || req.body.fkConcessionaria || req.body.fk_concessionaria || req.body.empresaServer;

    if (!tipo || String(tipo).trim() === "") {
        return res.status(400).send("O tipo do servidor é obrigatório!");
    }
    if (!fkConcessionaria || String(fkConcessionaria).trim() === "") {
        return res.status(400).send("A praça / concessionária vinculada é obrigatória!");
    }

    tipo = String(tipo).trim().toLowerCase();
    fkConcessionaria = Number(fkConcessionaria);

    if (!['transito', 'pagamento', 'auditoria'].includes(tipo)) {
        return res.status(400).send("Tipo de servidor inválido! Escolha entre transito, pagamento ou auditoria.");
    }

    if (isNaN(fkConcessionaria) || !Number.isInteger(fkConcessionaria) || fkConcessionaria <= 0) {
        return res.status(400).send("ID da praça / concessionária inválido!");
    }

    if (ip && String(ip).trim() !== "") {
        ip = String(ip).trim();
        var partes = ip.split(".");
        var ipValido = partes.length === 4 && partes.every(function (p) {
            return /^\d{1,3}$/.test(p) && Number(p) <= 255;
        });

        if (!ipValido) {
            return res.status(400).send("Endereço IPv4 inválido!");
        }
    } else {
        ip = null;
    }

    var promiseValidacaoIp = ip ? servidorModel.buscarPorIp(ip) : Promise.resolve([]);

    return promiseValidacaoIp
        .then(function (servidoresComIp) {
            if (servidoresComIp && servidoresComIp.length > 0) {
                return res.status(409).send("Esse endereço IP já foi cadastrado para outro servidor!");
            }

            return servidorModel.cadastrar(tipo, ip, fkConcessionaria)
                .then(function (resultado) {
                    var idServidor = resultado.insertId;

                    // Vincula automaticamente componentes padrão (CPU, RAM, Disco, Rede) na tabela config
                    return servidorModel.vincularConfigComponentesPadrao(idServidor)
                        .then(function () {
                            return res.status(201).json({
                                mensagem: "Servidor cadastrado com sucesso!",
                                id: idServidor
                            });
                        })
                        .catch(function (erroConfig) {
                            console.log("Servidor cadastrado, mas aviso ao vincular componentes na tabela config:", erroConfig);
                            return res.status(201).json({
                                mensagem: "Servidor cadastrado com sucesso!",
                                id: idServidor
                            });
                        });
                });
        })
        .catch(function (erro) {
            console.error("\nHouve um erro ao realizar o cadastro do servidor! Erro: ", erro.sqlMessage || erro.message);

            if (erro.code === "ER_DUP_ENTRY") {
                return res.status(409).send("Esse endereço IP já foi cadastrado!");
            }

            if (!res.headersSent) {
                return res.status(500).send("Erro ao cadastrar servidor: " + (erro.sqlMessage || erro.message));
            }
        });
}

function listar(req, res) {
    servidorModel.listar()
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error("Erro ao listar servidores:", erro);
            return res.status(500).send("Erro ao listar servidores.");
        });
}

function listarPorEmpresa(req, res) {
    var idEmpresa = req.params.idEmpresa || req.params.fkEmpresa || req.query.idEmpresa;

    if (!idEmpresa || isNaN(Number(idEmpresa))) {
        return res.status(400).send("ID da empresa inválido!");
    }

    servidorModel.listarPorEmpresa(Number(idEmpresa))
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error("Erro ao listar servidores por empresa:", erro);
            return res.status(500).send("Erro ao listar servidores da empresa.");
        });
}

function buscarPorId(req, res) {
    var id = req.params.id;

    if (!id || isNaN(Number(id))) {
        return res.status(400).send("ID do servidor inválido!");
    }

    servidorModel.buscarPorId(Number(id))
        .then(function (resultado) {
            if (!resultado || resultado.length === 0) {
                return res.status(404).send("Servidor não encontrado.");
            }
            return res.status(200).json(resultado[0]);
        })
        .catch(function (erro) {
            console.error("Erro ao buscar servidor por ID:", erro);
            return res.status(500).send("Erro ao buscar servidor.");
        });
}

function buscarPorIp(req, res) {
    var ip = req.query.ip || req.params.ip;

    if (!ip) {
        return res.status(400).send("Informe o endereço IP do servidor!");
    }

    servidorModel.buscarPorIp(ip)
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error(erro);
            return res.status(500).send("Erro ao buscar servidor por IP.");
        });
}

function atualizar(req, res) {
    var id = req.params.id || req.body.id;
    var tipo = req.body.tipoServer || req.body.tipo;
    var ip = req.body.ipServer || req.body.ip;
    var fkConcessionaria = req.body.concessionariaServer || req.body.fkConcessionaria || req.body.fk_concessionaria;

    if (!id || isNaN(Number(id))) {
        return res.status(400).send("ID do servidor inválido!");
    }

    if (!tipo || String(tipo).trim() === "") {
        return res.status(400).send("O tipo do servidor é obrigatório!");
    }

    if (!fkConcessionaria || isNaN(Number(fkConcessionaria))) {
        return res.status(400).send("A praça / concessionária vinculada é obrigatória!");
    }

    id = Number(id);
    tipo = String(tipo).trim().toLowerCase();
    fkConcessionaria = Number(fkConcessionaria);

    if (!['transito', 'pagamento', 'auditoria'].includes(tipo)) {
        return res.status(400).send("Tipo de servidor inválido! Escolha entre transito, pagamento ou auditoria.");
    }

    if (ip && String(ip).trim() !== "") {
        ip = String(ip).trim();
        var partes = ip.split(".");
        var ipValido = partes.length === 4 && partes.every(function (p) {
            return /^\d{1,3}$/.test(p) && Number(p) <= 255;
        });

        if (!ipValido) {
            return res.status(400).send("Endereço IPv4 inválido!");
        }
    } else {
        ip = null;
    }

    // Validar se o IP já está em uso por outro servidor
    var promiseIp = ip ? servidorModel.buscarPorIp(ip) : Promise.resolve([]);

    promiseIp
        .then(function (servidoresComIp) {
            if (servidoresComIp && servidoresComIp.length > 0) {
                var outroServidor = servidoresComIp.find(function (s) { return s.id !== id; });
                if (outroServidor) {
                    return res.status(409).send("Esse endereço IP já está em uso por outro servidor.");
                }
            }

            return servidorModel.atualizar(id, tipo, ip, fkConcessionaria)
                .then(function (resultado) {
                    if (resultado.affectedRows === 0) {
                        return res.status(404).send("Servidor não encontrado.");
                    }
                    return res.status(200).json({
                        mensagem: "Servidor atualizado com sucesso!",
                        id: id
                    });
                });
        })
        .catch(function (erro) {
            console.error("Erro ao atualizar servidor:", erro);
            return res.status(500).send("Erro interno ao atualizar servidor: " + (erro.sqlMessage || erro.message));
        });
}

function excluir(req, res) {
    var id = req.params.id;

    if (!id || isNaN(Number(id))) {
        return res.status(400).send("ID do servidor inválido!");
    }

    id = Number(id);

    servidorModel.excluir(id)
        .then(function (resultado) {
            if (resultado.affectedRows === 0) {
                return res.status(404).send("Servidor não encontrado.");
            }
            return res.status(200).json({
                mensagem: "Servidor excluído com sucesso!"
            });
        })
        .catch(function (erro) {
            console.error("Erro ao excluir servidor:", erro);

            if (erro.code === "ER_ROW_IS_REFERENCED_2" || erro.errno === 1451) {
                return res.status(409).send("Não é possível excluir este servidor pois existem chamados de suporte vinculados a ele.");
            }

            return res.status(500).send("Erro ao excluir servidor: " + (erro.sqlMessage || erro.message));
        });
}

module.exports = {
    cadastrar,
    listar,
    listarPorEmpresa,
    buscarPorId,
    buscarPorIp,
    atualizar,
    excluir
};
