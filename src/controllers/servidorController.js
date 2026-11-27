var servidorModel = require("../models/servidorModel");
var concessionariaModel = require("../models/concessionariaModel");
var escopoUsuario = require("../utils/escopoUsuario");

var DESCRICAO_TIPO = {
    transito: "Captura de informações",
    pagamento: "Processamento de pagamentos",
    auditoria: "Armazenamento para auditoria"
};

var ROTULO_STATUS = {
    operacional: "Operacional",
    atencao: "Atenção",
    critico: "Crítico"
};

function paraNumero(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return null;
    }
    var n = Number(valor);
    return isNaN(n) ? null : n;
}

function gerarCodigoServidor(id, tipo) {
    var prefixos = {
        transito: "SRV-TR",
        pagamento: "SRV-PG",
        auditoria: "SRV-AU"
    };
    var chave = String(tipo || "").toLowerCase();
    var prefixo = prefixos[chave] || "SRV-ID";
    var num = Number(id);
    var sufixo = !isNaN(num) && num < 10 ? "0" + num : String(id);
    return prefixo + sufixo;
}

function calcularStatusServidor(row) {
    var alertaCat = String(row.alerta_recente_categoria || "").toLowerCase();
    var cpu = paraNumero(row.cpu_uso_atual);
    var temp = paraNumero(row.cpu_temp_atual);
    var ram = paraNumero(row.ram_uso_atual);
    var disco = paraNumero(row.disco_uso_atual);
    var lat = paraNumero(row.latencia_atual);
    var conectividade = paraNumero(row.status_conectividade);

    if (
        alertaCat === "critico" ||
        (conectividade !== null && conectividade === 0) ||
        (cpu !== null && cpu >= 85) ||
        (temp !== null && temp >= 85) ||
        (ram !== null && ram >= 85) ||
        (disco !== null && disco >= 85) ||
        (lat !== null && lat >= 20)
    ) {
        return "critico";
    }

    if (
        alertaCat === "moderado" ||
        (cpu !== null && cpu >= 70) ||
        (temp !== null && temp >= 70) ||
        (ram !== null && ram >= 70) ||
        (disco !== null && disco >= 70) ||
        (lat !== null && lat >= 15)
    ) {
        return "atencao";
    }

    return "operacional";
}

function normalizarServidor(row) {
    var tipo = String(row.tipo || "").toLowerCase();
    var id = Number(row.id);
    var codigo = gerarCodigoServidor(id, tipo);
    var status = calcularStatusServidor(row);

    return {
        id: id,
        codigo: codigo,
        nome: codigo,
        tipo: tipo,
        tipo_descricao: DESCRICAO_TIPO[tipo] || tipo,
        ip: row.ip || null,
        fk_concessionaria: paraNumero(row.fk_concessionaria),
        nome_praca: row.nome_praca || "",
        rodovia: row.rodovia || "",
        km: paraNumero(row.km),
        cidade: row.cidade || "",
        uf: row.uf || "",
        fk_empresa: paraNumero(row.fk_empresa),
        nome_fantasia: row.nome_fantasia || "",
        razao_social: row.razao_social || "",
        status: status,
        status_label: ROTULO_STATUS[status] || "Operacional",
        alerta_recente_categoria: row.alerta_recente_categoria || null,
        ultima_comunicacao: row.ultima_comunicacao || null
    };
}

function validarIpv4(ip) {
    var partes = String(ip).split(".");
    return partes.length === 4 && partes.every(function (p) {
        return /^\d{1,3}$/.test(p) && Number(p) <= 255;
    });
}

function cadastrar(req, res) {
    var ctx = req.usuarioContexto;
    var body = req.body || {};
    var tipo = body.tipoServer || body.tipo;
    var ip = body.ipServer !== undefined ? body.ipServer : body.ip;
    var fkConcessionaria = escopoUsuario.inteiroPositivo(
        body.fk_concessionaria || body.fkConcessionaria || body.concessionariaServer
    );

    if (!tipo || String(tipo).trim() === "") {
        return res.status(400).json({ mensagem: "O tipo do servidor é obrigatório!" });
    }
    if (!fkConcessionaria) {
        return res.status(400).json({ mensagem: "Selecione uma concessionária válida!" });
    }

    tipo = String(tipo).trim().toLowerCase();

    if (!["transito", "pagamento", "auditoria"].includes(tipo)) {
        return res.status(400).json({
            mensagem: "Tipo de servidor inválido! Escolha entre transito, pagamento ou auditoria."
        });
    }

    if (ip !== null && ip !== undefined && String(ip).trim() !== "") {
        ip = String(ip).trim();
        if (!validarIpv4(ip)) {
            return res.status(400).json({ mensagem: "Endereço IPv4 inválido! Utilize o formato ex: 192.168.1.10." });
        }
    } else {
        ip = null;
    }

    return Promise.all([
        concessionariaModel.buscarPorId(fkConcessionaria),
        ip ? servidorModel.buscarPorIp(ip) : Promise.resolve([])
    ])
        .then(function (resultados) {
            var concessionarias = resultados[0];
            var servidoresComIp = resultados[1];

            if (!concessionarias || concessionarias.length === 0) {
                return res.status(400).json({
                    mensagem: "A concessionária selecionada não foi encontrada no banco de dados."
                });
            }

            if (!escopoUsuario.concessionariaNoEscopo(ctx, concessionarias[0])) {
                return res.status(403).json({
                    mensagem: "Você não tem permissão para cadastrar servidores nesta concessionária."
                });
            }

            if (servidoresComIp && servidoresComIp.length > 0) {
                return res.status(409).json({
                    mensagem: "Esse endereço IP já foi cadastrado!"
                });
            }

            return servidorModel.cadastrar(tipo, ip, fkConcessionaria)
                .then(function (resultado) {
                    var idServidor = resultado.insertId;

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
            console.error(erro);
            console.error("\nHouve um erro ao realizar o cadastro do servidor! Erro: ", erro.sqlMessage || erro.message);

            if (erro.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    mensagem: "Esse endereço IP já foi cadastrado!"
                });
            }

            if (!res.headersSent) {
                return res.status(500).json({
                    mensagem: "Erro ao realizar o cadastro do servidor no banco de dados."
                });
            }
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
            return res.status(500).json(erro.sqlMessage || erro.message);
        });
}

function listar(req, res) {
    var ctx = req.usuarioContexto;

    servidorModel.listarPorEscopo(ctx)
        .then(function (resultado) {
            return res.status(200).json(resultado.map(normalizarServidor));
        })
        .catch(function (erro) {
            console.error("Erro ao listar servidores:", erro);
            return res.status(500).json({
                mensagem: "Erro ao consultar servidores no banco de dados."
            });
        });
}

function listarPorEmpresa(req, res) {
    var idEmpresa = req.params.idEmpresa || req.query.idEmpresa;

    if (!idEmpresa) {
        return res.status(400).send("ID da empresa não informado!");
    }

    servidorModel.listarPorEmpresa(idEmpresa)
        .then(function (resultado) {
            return res.status(200).json(resultado.map(normalizarServidor));
        })
        .catch(function (erro) {
            console.error(erro);
            return res.status(500).json(erro.sqlMessage || erro.message);
        });
}

function atualizar(req, res) {
    var ctx = req.usuarioContexto;
    var id = escopoUsuario.inteiroPositivo(req.params.id);

    if (!id) {
        return res.status(400).json({ mensagem: "ID de servidor inválido." });
    }

    var body = req.body || {};
    var tipo = String(body.tipo || body.tipoServer || "").trim().toLowerCase();
    var ipBruto = body.ip !== undefined ? body.ip : body.ipServer;
    var ip = (ipBruto !== null && ipBruto !== undefined && String(ipBruto).trim() !== "")
        ? String(ipBruto).trim()
        : null;
    var fkConcessionaria = escopoUsuario.inteiroPositivo(
        body.fk_concessionaria || body.fkConcessionaria || body.concessionariaServer
    );

    if (!["transito", "pagamento", "auditoria"].includes(tipo)) {
        return res.status(400).json({
            mensagem: "Tipo de servidor inválido. Escolha entre transito, pagamento ou auditoria."
        });
    }

    if (!fkConcessionaria) {
        return res.status(400).json({
            mensagem: "Selecione uma concessionária válida."
        });
    }

    if (ip && !validarIpv4(ip)) {
        return res.status(400).json({
            mensagem: "Endereço IPv4 inválido! Utilize o formato ex: 192.168.1.10."
        });
    }

    Promise.all([
        servidorModel.buscarPorId(id),
        concessionariaModel.buscarPorId(fkConcessionaria),
        ip ? servidorModel.buscarPorIp(ip) : Promise.resolve([])
    ])
        .then(function (resultados) {
            var encontrados = resultados[0];
            var concessionarias = resultados[1];
            var servidoresComIp = resultados[2];

            if (!encontrados || encontrados.length === 0) {
                return res.status(404).json({ mensagem: "Servidor não encontrado." });
            }

            var servidorAtual = encontrados[0];
            var concAtual = { id: servidorAtual.fk_concessionaria, fk_empresa: servidorAtual.fk_empresa };
            if (!escopoUsuario.concessionariaNoEscopo(ctx, concAtual)) {
                return res.status(403).json({
                    mensagem: "Você não tem permissão para editar este servidor."
                });
            }

            if (!concessionarias || concessionarias.length === 0) {
                return res.status(400).json({ mensagem: "Concessionária selecionada não encontrada." });
            }

            if (!escopoUsuario.concessionariaNoEscopo(ctx, concessionarias[0])) {
                return res.status(403).json({
                    mensagem: "A concessionária selecionada não pertence ao seu escopo de permissão."
                });
            }

            var ipEmUso = (servidoresComIp || []).some(function (s) {
                return Number(s.id) !== id;
            });
            if (ipEmUso) {
                return res.status(409).json({
                    mensagem: "Esse endereço IP já está vinculado a outro servidor."
                });
            }

            return servidorModel.atualizar(id, tipo, ip, fkConcessionaria)
                .then(function () {
                    return servidorModel.buscarPorId(id);
                })
                .then(function (atualizado) {
                    return res.status(200).json({
                        mensagem: "Servidor atualizado com sucesso!",
                        servidor: atualizado[0] ? normalizarServidor(atualizado[0]) : null
                    });
                });
        })
        .catch(function (erro) {
            console.error("Erro ao atualizar servidor:", erro);
            if (!res.headersSent) {
                return res.status(500).json({
                    mensagem: "Erro ao atualizar servidor no banco de dados."
                });
            }
        });
}

function excluir(req, res) {
    var ctx = req.usuarioContexto;
    var id = escopoUsuario.inteiroPositivo(req.params.id);

    if (!id) {
        return res.status(400).json({ mensagem: "ID de servidor inválido." });
    }

    servidorModel.buscarPorId(id)
        .then(function (encontrados) {
            if (!encontrados || encontrados.length === 0) {
                return res.status(404).json({ mensagem: "Servidor não encontrado." });
            }

            var servidorAtual = encontrados[0];
            var concAtual = { id: servidorAtual.fk_concessionaria, fk_empresa: servidorAtual.fk_empresa };
            if (!escopoUsuario.concessionariaNoEscopo(ctx, concAtual)) {
                return res.status(403).json({
                    mensagem: "Você não tem permissão para excluir este servidor."
                });
            }

            return servidorModel.contarChamadosPorServidor(id)
                .then(function (resChamados) {
                    var totalChamados = resChamados && resChamados[0] ? Number(resChamados[0].total) : 0;
                    if (totalChamados > 0) {
                        return res.status(409).json({
                            mensagem: "Não é possível excluir este servidor pois existem " + totalChamados + " chamado(s) vinculado(s) a ele."
                        });
                    }

                    return servidorModel.excluirComDependencias(id).then(function () {
                        return res.status(200).json({
                            mensagem: "Servidor removido com sucesso!"
                        });
                    });
                });
        })
        .catch(function (erro) {
            console.error("Erro ao excluir servidor:", erro);
            if (erro.code === "ER_ROW_IS_REFERENCED_2") {
                return res.status(409).json({
                    mensagem: "Não é possível excluir este servidor pois existem registros vinculados a ele."
                });
            }
            if (!res.headersSent) {
                return res.status(500).json({
                    mensagem: "Erro ao excluir servidor no banco de dados."
                });
            }
        });
}

module.exports = {
    cadastrar,
    buscarPorIp,
    listar,
    listarPorEmpresa,
    atualizar,
    excluir
};
