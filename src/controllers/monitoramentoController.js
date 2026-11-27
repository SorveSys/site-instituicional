var monitoramentoModel = require("../models/monitoramentoModel");

var DESCRICAO_TIPO = {
    transito: "Captura de informações",
    pagamento: "Processamento de pagamentos",
    auditoria: "Armazenamento para auditoria"
};

function paraNumero(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return null;
    }
    var n = Number(valor);
    return isNaN(n) ? null : n;
}

function inteiroPositivo(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return null;
    }
    var n = Number(valor);
    return Number.isInteger(n) && n > 0 ? n : null;
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
    var tipo = String(row.tipo_servidor || "").toLowerCase();
    var id = Number(row.id_servidor);
    var codigo = gerarCodigoServidor(id, tipo);

    return {
        id: id,
        nome: codigo,
        tipo: tipo,
        tipo_descricao: DESCRICAO_TIPO[tipo] || tipo,
        ip: row.ip || "Sem IP",
        fk_concessionaria: paraNumero(row.fk_concessionaria),
        nome_praca: row.nome_praca || "",
        rodovia: row.rodovia || "",
        km: paraNumero(row.km),
        cidade: row.cidade || "",
        uf: row.uf || "",
        fk_empresa: paraNumero(row.fk_empresa),
        nome_fantasia: row.nome_fantasia || "",
        razao_social: row.razao_social || "",
        status: calcularStatusServidor(row),
        alerta_recente_categoria: row.alerta_recente_categoria || null,
        cpu: paraNumero(row.cpu_uso_atual),
        temp: paraNumero(row.cpu_temp_atual),
        ram: paraNumero(row.ram_uso_atual),
        disco: paraNumero(row.disco_uso_atual),
        disco_livre: paraNumero(row.disco_livre_atual),
        latencia: paraNumero(row.latencia_atual),
        cpu_media: paraNumero(row.cpu_media),
        cpu_pico: paraNumero(row.cpu_pico),
        temp_media: paraNumero(row.temp_media),
        temp_max: paraNumero(row.temp_max),
        ram_media: paraNumero(row.ram_media),
        ram_pico: paraNumero(row.ram_pico),
        latencia_media: paraNumero(row.latencia_media),
        latencia_max: paraNumero(row.latencia_max),
        latencia_jitter: paraNumero(row.latencia_jitter),
        status_conectividade: paraNumero(row.status_conectividade),
        status_rede: paraNumero(row.status_rede),
        ultima_comunicacao: row.ultima_comunicacao || null
    };
}

function normalizarAlerta(row) {
    var cat = String(row.categoria || "").toLowerCase();
    var nivel = "atencao";
    if (cat === "critico") nivel = "critico";
    else if (cat === "normal") nivel = "resolvido";

    var idServidor = Number(row.id_servidor);
    var tipoServidor = String(row.tipo_servidor || "").toLowerCase();

    return {
        id: Number(row.id_alerta),
        categoria: row.categoria,
        nivel: nivel,
        descricao: row.descricao,
        valor: paraNumero(row.valor),
        dt_hora: row.dt_hora,
        horario_formatado: row.horario_formatado,
        data_hora_formatada: row.data_hora_formatada,
        id_metrica: paraNumero(row.id_metrica),
        tipo_metrica: row.tipo_metrica || "",
        componente: row.componente || "",
        id_servidor: idServidor,
        servidor_nome: gerarCodigoServidor(idServidor, tipoServidor),
        tipo_servidor: tipoServidor,
        ip: row.ip || "Sem IP",
        nome_praca: row.nome_praca || "",
        rodovia: row.rodovia || "",
        km: paraNumero(row.km),
        fk_empresa: paraNumero(row.fk_empresa),
        nome_fantasia: row.nome_fantasia || ""
    };
}

function extrairFiltrosEscopo(req) {
    return {
        idEmpresa: inteiroPositivo(req.query.idEmpresa),
        idConcessionaria: inteiroPositivo(req.query.idConcessionaria),
        idServidor: inteiroPositivo(req.query.idServidor)
    };
}

function obterOverview(req, res) {
    var filtros = extrairFiltrosEscopo(req);

    monitoramentoModel.listarServidoresOverview(filtros)
        .then(function (linhas) {
            var servidores = linhas.map(normalizarServidor);
            var operacionais = 0;
            var atencao = 0;
            var criticos = 0;

            servidores.forEach(function (s) {
                if (s.status === "critico") criticos++;
                else if (s.status === "atencao") atencao++;
                else operacionais++;
            });

            return res.status(200).json({
                servidores: servidores,
                kpis: {
                    total: servidores.length,
                    operacionais: operacionais,
                    atencao: atencao,
                    criticos: criticos
                },
                atualizadoEm: new Date().toISOString()
            });
        })
        .catch(function (erro) {
            console.error("Erro ao carregar overview:", erro);
            return res.status(500).json({
                mensagem: "Erro ao consultar dados de overview no banco de dados.",
                erro: erro.sqlMessage || erro.message
            });
        });
}

function listarAlertas(req, res) {
    var filtros = extrairFiltrosEscopo(req);
    var limiteBruto = req.query.limite;

    if (limiteBruto && String(limiteBruto).toLowerCase() !== "todos") {
        var limiteNum = inteiroPositivo(limiteBruto);
        if (limiteNum) {
            filtros.limite = Math.min(limiteNum, 200);
        }
    } else if (!limiteBruto) {
        filtros.limite = 20;
    }

    monitoramentoModel.listarAlertas(filtros)
        .then(function (linhas) {
            return res.status(200).json({
                alertas: linhas.map(normalizarAlerta),
                total: linhas.length,
                atualizadoEm: new Date().toISOString()
            });
        })
        .catch(function (erro) {
            console.error("Erro ao listar alertas:", erro);
            return res.status(500).json({
                mensagem: "Erro ao consultar alertas no banco de dados.",
                erro: erro.sqlMessage || erro.message
            });
        });
}

function resolverIdServidor(identificador, filtros) {
    if (!identificador) {
        return monitoramentoModel.buscarPrimeiroServidor(filtros).then(function (res) {
            return res.length > 0 ? Number(res[0].id) : null;
        });
    }

    var texto = String(identificador).trim();
    var numerico = inteiroPositivo(texto);
    if (numerico) {
        return Promise.resolve(numerico);
    }

    // Compatibilidade com formato SRV-TR01 / SRV-PG02 / SRV-AU03
    var matchCodigo = /^SRV-[A-Z]{2}0*(\d+)$/i.exec(texto);
    if (matchCodigo) {
        return Promise.resolve(Number(matchCodigo[1]));
    }

    // Compatibilidade com busca por IP
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(texto)) {
        return monitoramentoModel.buscarIdPorIp(texto).then(function (res) {
            return res.length > 0 ? Number(res[0].id) : null;
        });
    }

    return Promise.resolve(null);
}

function obterDashboard(req, res) {
    var identificador = req.params.idServidor || req.query.id || req.query.srv || null;
    var limiteHistorico = inteiroPositivo(req.query.limite) || 20;
    var filtros = extrairFiltrosEscopo(req);

    resolverIdServidor(identificador, filtros)
        .then(function (idServidor) {
            if (!idServidor) {
                return res.status(404).json({
                    mensagem: "Servidor não encontrado."
                });
            }

            return Promise.all([
                monitoramentoModel.buscarDashboardServidor(idServidor),
                monitoramentoModel.buscarHistoricoServidor(idServidor, limiteHistorico),
                monitoramentoModel.listarAlertas({ idServidor: idServidor, limite: 10 }),
                monitoramentoModel.contarServidores(filtros)
            ]).then(function (resultados) {
                var linhasServidor = resultados[0];
                var linhasHistorico = resultados[1];
                var linhasAlertas = resultados[2];
                var linhasContagem = resultados[3];

                if (!linhasServidor || linhasServidor.length === 0) {
                    return res.status(404).json({
                        mensagem: "Servidor não encontrado."
                    });
                }

                var servidor = normalizarServidor(linhasServidor[0]);

                if (
                    (filtros.idConcessionaria && servidor.fk_concessionaria !== filtros.idConcessionaria) ||
                    (!filtros.idConcessionaria && filtros.idEmpresa && servidor.fk_empresa !== filtros.idEmpresa)
                ) {
                    return res.status(403).json({
                        mensagem: "Você não tem permissão para visualizar este servidor."
                    });
                }
                var historico = linhasHistorico.map(function (h) {
                    return {
                        dt_hora: h.dt_hora,
                        horario_label: h.horario_label,
                        data_horario_label: h.data_horario_label,
                        cpu_uso_percent: paraNumero(h.cpu_uso_percent),
                        ram_uso_percent: paraNumero(h.ram_uso_percent),
                        latencia_ms: paraNumero(h.latencia_ms),
                        limite_critico_cpu: paraNumero(h.limite_critico_cpu) || 85,
                        limite_critico_latencia: paraNumero(h.limite_critico_latencia) || 20
                    };
                });

                var totalServidores = (linhasContagem && linhasContagem[0])
                    ? Number(linhasContagem[0].total)
                    : 0;

                return res.status(200).json({
                    servidor: servidor,
                    historico: historico,
                    alertas: linhasAlertas.map(normalizarAlerta),
                    totalServidores: totalServidores,
                    atualizadoEm: new Date().toISOString()
                });
            });
        })
        .catch(function (erro) {
            console.error("Erro ao carregar dashboard do servidor:", erro);
            if (!res.headersSent) {
                return res.status(500).json({
                    mensagem: "Erro ao consultar dados da dashboard no banco de dados.",
                    erro: erro.sqlMessage || erro.message
                });
            }
        });
}

module.exports = {
    obterOverview,
    listarAlertas,
    obterDashboard
};
