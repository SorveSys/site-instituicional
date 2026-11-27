var https = require("https");
var chamadoModel = require("../models/chamadoModel");
var servidorModel = require("../models/servidorModel");
var escopoUsuario = require("../utils/escopoUsuario");

function enviarRequisicaoJira(caminho, metodo, corpo, callback) {
    var rawDomain = process.env.JIRA_DOMAIN || "https://sptech-team-ogkh9vns.atlassian.net";
    var hostname = rawDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    var email = process.env.JIRA_EMAIL;
    var token = process.env.JIRA_API_TOKEN;

    if (!email || !token) {
        return callback(new Error("Credenciais do Jira não configuradas no servidor."));
    }

    var auth = Buffer.from(email + ":" + token).toString("base64");
    var postData = corpo ? JSON.stringify(corpo) : "";

    var options = {
        hostname: hostname,
        port: 443,
        path: caminho,
        method: metodo,
        headers: {
            "Authorization": "Basic " + auth,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    };

    if (postData) {
        options.headers["Content-Length"] = Buffer.byteLength(postData);
    }

    var req = https.request(options, function (res) {
        var buffer = "";

        res.on("data", function (chunk) {
            buffer += chunk;
        });

        res.on("end", function () {
            var jsonResp = {};
            try {
                if (buffer) {
                    jsonResp = JSON.parse(buffer);
                }
            } catch (e) {
                jsonResp = { raw: buffer };
            }
            callback(null, res.statusCode, jsonResp);
        });
    });

    req.on("error", function (err) {
        callback(err);
    });

    if (postData) {
        req.write(postData);
    }
    req.end();
}

function abrirChamado(req, res) {
    var resumo = req.body.resumo;
    var descricao = req.body.descricao;
    var motivo = req.body.motivo;
    var servidor = req.body.servidor;
    var fkServidor = req.body.fkServidor || req.body.idServidor;
    var fkUsuario = req.body.fkUsuario || req.body.idUsuario;

    if (!resumo || !String(resumo).trim()) {
        return res.status(400).json({ mensagem: "Informe o resumo do chamado." });
    }

    if (!motivo || !String(motivo).trim()) {
        return res.status(400).json({ mensagem: "Informe o motivo da solicitação." });
    }

    motivo = String(motivo).trim();
    var motivosValidos = ["Inatividade", "Solicitar Troca", "Solicitar Análise"];
    if (!motivosValidos.includes(motivo)) {
        return res.status(400).json({
            mensagem: "Motivo inválido. Escolha entre: " + motivosValidos.join(", ")
        });
    }

    if (!servidor || !String(servidor).trim()) {
        return res.status(400).json({ mensagem: "Informe o servidor afetado." });
    }

    // Se fkServidor não foi passado explicitamente, tenta converter o valor do servidor caso seja numérico
    if (!fkServidor && !isNaN(Number(servidor))) {
        fkServidor = Number(servidor);
    } else {
        fkServidor = Number(fkServidor);
    }

    if (!fkServidor || isNaN(fkServidor)) {
        return res.status(400).json({ mensagem: "Informe o ID numérico do servidor afetado." });
    }

    fkUsuario = Number(fkUsuario);
    if (!fkUsuario || isNaN(fkUsuario)) {
        return res.status(400).json({ mensagem: "Informe o identificador do usuário responsável pela abertura do chamado." });
    }

    Promise.all([
        escopoUsuario.buscarContextoUsuarioPorId(fkUsuario),
        servidorModel.buscarPorId(fkServidor)
    ])
        .then(function (resultadosPermissao) {
            var ctxUsuario = resultadosPermissao[0];
            var servidoresEncontrados = resultadosPermissao[1];

            if (!ctxUsuario) {
                return res.status(401).json({
                    mensagem: "Usuário não autenticado ou não encontrado."
                });
            }

            if (!servidoresEncontrados || servidoresEncontrados.length === 0) {
                return res.status(404).json({
                    mensagem: "Servidor afetado não encontrado no banco de dados."
                });
            }

            var srv = servidoresEncontrados[0];
            var concAlvo = { id: srv.fk_concessionaria, fk_empresa: srv.fk_empresa };
            if (!escopoUsuario.concessionariaNoEscopo(ctxUsuario, concAlvo)) {
                return res.status(403).json({
                    mensagem: "Você não tem permissão para abrir chamado para este servidor."
                });
            }

            var projectKey = process.env.JIRA_PROJECT_KEY || "CS";
            var issueTypeId = process.env.JIRA_ISSUE_TYPE_ID || "10048";
            var fieldMotivo = process.env.JIRA_FIELD_MOTIVO || "customfield_10221";
            var fieldServidor = process.env.JIRA_FIELD_SERVIDOR || "customfield_10222";

            var fields = {
                project: { key: projectKey },
                summary: String(resumo).trim(),
                description: descricao && String(descricao).trim() ? String(descricao).trim() : "Sem descrição fornecida.",
                issuetype: { id: issueTypeId }
            };

            // customfield_10221 (Motivo da Solicitação - Select Option)
            fields[fieldMotivo] = { value: motivo };

            // customfield_10222 (Servidor Afetado - Text Field)
            fields[fieldServidor] = String(servidor).trim();

            var payload = { fields: fields };

            enviarRequisicaoJira("/rest/api/2/issue", "POST", payload, function (err, statusCode, data) {
                if (err) {
                    console.error("Erro na comunicação com o Jira:", err);
                    return res.status(500).json({
                        mensagem: "Erro ao comunicar com a API do Jira.",
                        erro: err.message
                    });
                }

                if (statusCode >= 200 && statusCode < 300 && data && data.key) {
                    var rawDomain = process.env.JIRA_DOMAIN || "https://sptech-team-ogkh9vns.atlassian.net";
                    var cleanDomain = rawDomain.replace(/\/+$/, "");
                    var linkJira = cleanDomain + "/browse/" + data.key;

                    var textoDescricaoBanco = resumo
                        ? ("[" + String(resumo).trim() + "] " + (descricao ? String(descricao).trim() : "")).trim()
                        : (descricao ? String(descricao).trim() : "Sem descrição.");

                    chamadoModel.cadastrar(data.key, motivo, textoDescricaoBanco, fkUsuario, fkServidor)
                        .then(function (resultadoBanco) {
                            console.log("Chamado " + data.key + " persistido com sucesso no banco de dados! ID:", resultadoBanco.insertId);
                            return res.status(201).json({
                                sucesso: true,
                                mensagem: "Chamado aberto com sucesso no Jira e registrado no banco de dados!",
                                chave: data.key,
                                idJira: data.id,
                                idChamadoBanco: resultadoBanco.insertId,
                                link: linkJira
                            });
                        })
                        .catch(function (erroBanco) {
                            console.error("Aviso: chamado criado no Jira (" + data.key + "), mas erro ao persistir no banco:", erroBanco);
                            return res.status(201).json({
                                sucesso: true,
                                aviso: "Chamado aberto no Jira, mas houve erro ao salvar no banco local.",
                                chave: data.key,
                                idJira: data.id,
                                link: linkJira,
                                erroBanco: erroBanco.sqlMessage || erroBanco.message
                            });
                        });
                    return;
                }

                console.error("Jira retornou erro:", statusCode, data);
                return res.status(statusCode).json({
                    mensagem: "Não foi possível criar o chamado no Jira.",
                    detalhes: data
                });
            });
        })
        .catch(function (erro) {
            console.error("Erro ao validar permissão para abrir chamado:", erro);
            if (!res.headersSent) {
                return res.status(500).json({
                    mensagem: "Erro ao validar permissão para abrir chamado."
                });
            }
        });
}

function listar(req, res) {
    chamadoModel.listar()
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error("Erro ao listar chamados:", erro);
            return res.status(500).json({
                mensagem: "Erro ao listar chamados.",
                erro: erro.sqlMessage || erro.message
            });
        });
}

function listarPorEmpresa(req, res) {
    var idEmpresa = req.params.idEmpresa;
    if (!idEmpresa) {
        return res.status(400).json({ mensagem: "Informe o ID da empresa." });
    }

    chamadoModel.listarPorEmpresa(idEmpresa)
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error("Erro ao listar chamados por empresa:", erro);
            return res.status(500).json({
                mensagem: "Erro ao listar chamados.",
                erro: erro.sqlMessage || erro.message
            });
        });
}

function listarPorServidor(req, res) {
    var idServidor = req.params.idServidor;
    if (!idServidor) {
        return res.status(400).json({ mensagem: "Informe o ID do servidor." });
    }

    chamadoModel.listarPorServidor(idServidor)
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error("Erro ao listar chamados por servidor:", erro);
            return res.status(500).json({
                mensagem: "Erro ao listar chamados.",
                erro: erro.sqlMessage || erro.message
            });
        });
}

function buscarPorChaveJira(req, res) {
    var chave = req.params.chave;
    if (!chave) {
        return res.status(400).json({ mensagem: "Informe a chave do Jira." });
    }

    chamadoModel.buscarPorChaveJira(chave)
        .then(function (resultado) {
            if (resultado.length > 0) {
                return res.status(200).json(resultado[0]);
            }
            return res.status(404).json({ mensagem: "Chamado não encontrado." });
        })
        .catch(function (erro) {
            console.error("Erro ao buscar chamado:", erro);
            return res.status(500).json({
                mensagem: "Erro ao buscar chamado.",
                erro: erro.sqlMessage || erro.message
            });
        });
}

module.exports = {
    abrirChamado,
    listar,
    listarPorEmpresa,
    listarPorServidor,
    buscarPorChaveJira
};
