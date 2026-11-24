var API_BASE = window.location.protocol === "file:" ? "http://localhost:3333" : "";

var LIMITE_CPU_PADRAO = 85;
var LIMITE_LATENCIA_PADRAO = 20;

var COR_LARANJA = "#ff9a1a";
var COR_TRILHA = "#e5e9f0";

var dadosDashboardAtual = null;
var chartsGauges = [];
var chartCpu = null;
var chartRam = null;
var chartLatencia = null;
var carregandoDashboard = false;

function escaparHtml(texto) {
    if (texto === null || texto === undefined) return "";
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function numeroValido(v) {
    return v !== null && v !== undefined && !isNaN(Number(v));
}

function formatarNumero(v, casas) {
    if (!numeroValido(v)) return "--";
    return Number(v).toFixed(casas);
}

function indiceMaximo(lista) {
    var idx = -1;
    var maior = -Infinity;
    lista.forEach(function (v, i) {
        if (numeroValido(v) && Number(v) > maior) {
            maior = Number(v);
            idx = i;
        }
    });
    return idx;
}

function corPorPercentual(valor, corPadrao) {
    if (!numeroValido(valor)) return "#94a3b8";
    var num = Number(valor);
    if (num >= 85) return "#dc2626";
    if (num >= 70) return "#ea580c";
    return corPadrao || COR_LARANJA;
}

var pluginTextoCentro = {
    id: "textoCentro",
    afterDraw: function (chart, args, opcoes) {
        if (!opcoes || !opcoes.texto) return;
        var ctx = chart.ctx;
        var a = chart.chartArea;
        ctx.save();
        ctx.font = "700 " + (opcoes.tamanho || 15) + "px 'Space Grotesk', sans-serif";
        ctx.fillStyle = opcoes.cor || "#0f172a";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(opcoes.texto, (a.left + a.right) / 2, (a.top + a.bottom) / 2);
        ctx.restore();
    }
};

var pluginLimite = {
    id: "linhaLimite",
    afterDatasetsDraw: function (chart, args, opcoes) {
        if (!opcoes || opcoes.valor == null) return;
        var ctx = chart.ctx;
        var a = chart.chartArea;
        var y = chart.scales.y.getPixelForValue(opcoes.valor);

        if (y < a.top || y > a.bottom) return;

        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(a.left, y);
        ctx.lineTo(a.right, y);
        ctx.stroke();

        ctx.setLineDash([]);
        var largura = 50;
        ctx.fillStyle = "rgba(220, 38, 38, .12)";
        ctx.fillRect(a.right - largura, y, largura, 15);
        ctx.fillStyle = "#dc2626";
        ctx.font = "500 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Crítico", a.right - largura / 2, y + 8);
        ctx.restore();
    }
};

Chart.register(pluginTextoCentro, pluginLimite);
Chart.defaults.font.family = "'JetBrains Mono', monospace";
Chart.defaults.color = "#64748b";

function preencherDadosOperador() {
    try {
        var nome = sessionStorage.NOME_USUARIO;
        var perfil = sessionStorage.PERFIL_USUARIO;
        var empresa = sessionStorage.EMPRESA_USUARIO;
        var praca = sessionStorage.NOME_PRACA;

        if (nome) {
            document.getElementById("nome_operador").textContent = nome;
            var partes = nome.trim().split(/\s+/);
            var iniciais = partes.length >= 2
                ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
                : nome.slice(0, 2).toUpperCase();
            var elAvatar = document.getElementById("avatar_operador");
            if (elAvatar) elAvatar.textContent = iniciais;
        }

        var elPerfil = document.getElementById("perfil_operador");
        if (elPerfil && (perfil || empresa || praca)) {
            var detalhe = praca || empresa || "";
            elPerfil.textContent = perfil ? (detalhe ? perfil + " • " + detalhe : perfil) : detalhe;
        }
    } catch (e) { }
}

function obterParametrosEscopo() {
    var params = new URLSearchParams();
    try {
        if (sessionStorage.FK_CONCESSIONARIA) {
            params.set("idConcessionaria", sessionStorage.FK_CONCESSIONARIA);
        } else if (sessionStorage.FK_EMPRESA) {
            params.set("idEmpresa", sessionStorage.FK_EMPRESA);
        }
    } catch (e) { }
    return params;
}

function montarUrlDashboard() {
    var urlParams = new URLSearchParams(window.location.search);
    var idParam = urlParams.get("id");
    var srvParam = urlParams.get("srv");
    var identificador = idParam || srvParam;

    var query = obterParametrosEscopo();
    query.set("limite", "20");

    var caminho = identificador
        ? "/monitoramento/dashboard/" + encodeURIComponent(identificador)
        : "/monitoramento/dashboard";

    return API_BASE + caminho + "?" + query.toString();
}

function destruirGraficos() {
    chartsGauges.forEach(function (c) {
        if (c) c.destroy();
    });
    chartsGauges = [];

    if (chartCpu) { chartCpu.destroy(); chartCpu = null; }
    if (chartRam) { chartRam.destroy(); chartRam = null; }
    if (chartLatencia) { chartLatencia.destroy(); chartLatencia = null; }
}

function garantirCanvas(idCanvas) {
    var canvas = document.getElementById(idCanvas);
    if (canvas) {
        canvas.style.display = "block";
        var aviso = canvas.parentElement.querySelector(".grafico-vazio");
        if (aviso) aviso.remove();
    }
    return canvas;
}

function mostrarEstadoVazioGrafico(idCanvas, mensagem) {
    var canvas = document.getElementById(idCanvas);
    if (!canvas) return;
    canvas.style.display = "none";

    var container = canvas.parentElement;
    var aviso = container.querySelector(".grafico-vazio");
    if (!aviso) {
        aviso = document.createElement("div");
        aviso.className = "grafico-vazio";
        aviso.style.cssText = "display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-family:'Inter',sans-serif;font-size:13px;text-align:center;padding:16px;";
        container.appendChild(aviso);
    }
    aviso.textContent = mensagem;
}

function atualizarCabecalho(srv, totalServidores) {
    var descricao = srv.tipo_descricao || srv.tipo || "Servidor monitorado";
    if (srv.nome_praca) {
        descricao += " • " + srv.nome_praca;
    }
    if (srv.rodovia) {
        descricao += " (" + srv.rodovia + (numeroValido(srv.km) ? ", km " + Number(srv.km).toFixed(1) : "") + ")";
    }

    document.title = "SorveSys | " + srv.nome;
    document.getElementById("bc_nome").textContent = srv.nome;
    document.getElementById("titulo_nome").textContent = srv.nome;
    document.getElementById("titulo_desc").textContent = descricao;
    document.getElementById("titulo_ip").textContent = srv.ip || "Sem IP";

    var elNavTotal = document.getElementById("nav_total");
    if (elNavTotal && numeroValido(totalServidores)) {
        elNavTotal.textContent = totalServidores;
    }

    document.getElementById("legenda_ram").textContent = numeroValido(srv.ram)
        ? "Ativa (" + Number(srv.ram).toFixed(1) + "%)"
        : "Sem leituras";

    document.getElementById("selo_latencia").textContent = numeroValido(srv.latencia_media)
        ? "Média: " + Number(srv.latencia_media).toFixed(1) + " ms"
        : (numeroValido(srv.latencia) ? "Atual: " + Number(srv.latencia).toFixed(1) + " ms" : "Sem leituras");
}

function montarGauges(srv, animar) {
    var cpuAtual = numeroValido(srv.cpu) ? Number(srv.cpu) : null;
    var tempAtual = numeroValido(srv.temp) ? Number(srv.temp) : null;
    var ramAtual = numeroValido(srv.ram) ? Number(srv.ram) : null;
    var discoAtual = numeroValido(srv.disco) ? Number(srv.disco) : null;
    var discoLivre = numeroValido(srv.disco_livre)
        ? Number(srv.disco_livre)
        : (discoAtual !== null ? Math.max(0, 100 - discoAtual) : null);
    var ramLivre = ramAtual !== null ? Math.max(0, 100 - ramAtual) : null;
    var latAtual = numeroValido(srv.latencia) ? Number(srv.latencia) : null;

    var statusRedeTexto = "Aguardando<br>telemetria";
    if (numeroValido(srv.status_conectividade)) {
        statusRedeTexto = Number(srv.status_conectividade) > 0 ? "Conectado" : "Offline";
    } else if (latAtual !== null) {
        statusRedeTexto = latAtual >= LIMITE_LATENCIA_PADRAO ? "Latência<br>Alta" : "Link<br>Estável";
    }

    var latCritica = latAtual !== null && latAtual >= LIMITE_LATENCIA_PADRAO;

    var gauges = [
        {
            id: "cpu",
            titulo: "CPU Total",
            badge: cpuAtual !== null ? cpuAtual.toFixed(1) + "%" : "--",
            cor: corPorPercentual(cpuAtual, COR_LARANJA),
            valor: cpuAtual !== null ? cpuAtual : 0,
            max: 100,
            centro: cpuAtual !== null ? Math.round(cpuAtual) + "%" : "--",
            esq: "Média: " + (numeroValido(srv.cpu_media) ? Number(srv.cpu_media).toFixed(1) + "%" : "--"),
            dir: "<b>Pico: " + (numeroValido(srv.cpu_pico) ? Number(srv.cpu_pico).toFixed(1) + "%" : "--") + "</b>"
        },
        {
            id: "temp",
            titulo: "Temp CPU",
            badge: tempAtual !== null ? tempAtual.toFixed(1) + "°C" : "--",
            cor: corPorPercentual(tempAtual, "#d97706"),
            valor: tempAtual !== null ? tempAtual : 0,
            max: 100,
            centro: tempAtual !== null ? Math.round(tempAtual) + "°C" : "--",
            esq: "Média: " + (numeroValido(srv.temp_media) ? Number(srv.temp_media).toFixed(1) + "°C" : "--"),
            dir: "<b>Máx: " + (numeroValido(srv.temp_max) ? Number(srv.temp_max).toFixed(1) + "°C" : "--") + "</b>"
        },
        {
            id: "ram",
            titulo: "RAM Utilizada",
            badge: ramAtual !== null ? ramAtual.toFixed(1) + "%" : "--",
            cor: corPorPercentual(ramAtual, COR_LARANJA),
            valor: ramAtual !== null ? ramAtual : 0,
            max: 100,
            centro: ramAtual !== null ? Math.round(ramAtual) + "%" : "--",
            esq: "Livre: " + (ramLivre !== null ? ramLivre.toFixed(1) + "%" : "--"),
            dir: "<b>Pico: " + (numeroValido(srv.ram_pico) ? Number(srv.ram_pico).toFixed(1) + "%" : "--") + "</b>"
        },
        {
            id: "nvme",
            titulo: "Uso de Disco",
            badge: discoAtual !== null ? discoAtual.toFixed(1) + "%" : "--",
            cor: corPorPercentual(discoAtual, "#ea580c"),
            valor: discoAtual !== null ? discoAtual : 0,
            max: 100,
            centro: discoAtual !== null ? Math.round(discoAtual) + "%" : "--",
            esq: "Livre: " + (discoLivre !== null ? discoLivre.toFixed(1) + "%" : "--"),
            dir: "<b>Uso: " + (discoAtual !== null ? discoAtual.toFixed(1) + "%" : "--") + "</b>"
        },
        {
            id: "lat",
            titulo: "Latência CCO",
            badge: latAtual !== null ? latAtual.toFixed(1) + " ms" : "Sem dados",
            verde: latAtual !== null && !latCritica,
            cor: latAtual === null ? "#94a3b8" : (latCritica ? "#dc2626" : "#059669"),
            valor: latAtual !== null ? latAtual : 0,
            max: Math.max(LIMITE_LATENCIA_PADRAO, latAtual || 0),
            centro: latAtual !== null ? latAtual.toFixed(1) + "ms" : "--",
            corCentro: latAtual === null ? "#64748b" : (latCritica ? "#dc2626" : "#059669"),
            esq: numeroValido(srv.latencia_jitter)
                ? "Jitter:<br>±" + Number(srv.latencia_jitter).toFixed(1) + "ms"
                : "Média:<br>" + (numeroValido(srv.latencia_media) ? Number(srv.latencia_media).toFixed(1) + "ms" : "--"),
            dir: '<span class="' + (latCritica ? "" : "verde") + '">' + statusRedeTexto + "</span>"
        }
    ];

    var html = "";
    gauges.forEach(function (g) {
        html += '<article class="gauge">' +
            '<div class="gauge-topo">' +
            '<span class="gauge-titulo">' + g.titulo + '</span>' +
            '<span class="gauge-badge ' + (g.verde ? "verde" : "") + '">' + g.badge + '</span>' +
            '</div>' +
            '<div class="gauge-canvas"><canvas id="gauge_' + g.id + '"></canvas></div>' +
            '<div class="gauge-rodape"><span>' + g.esq + '</span><span>' + g.dir + '</span></div>' +
            '</article>';
    });

    document.getElementById("gauges").innerHTML = html;

    gauges.forEach(function (g) {
        var preenchido = Math.max(0, Math.min(g.valor, g.max));
        var restante = Math.max(0, g.max - preenchido);

        var instancia = new Chart(document.getElementById("gauge_" + g.id), {
            type: "doughnut",
            data: {
                datasets: [{
                    data: [preenchido, restante],
                    backgroundColor: [g.cor, COR_TRILHA],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "76%",
                animation: { duration: animar ? 900 : 0 },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false },
                    textoCentro: { texto: g.centro, cor: g.corCentro || "#0f172a", tamanho: 15 }
                }
            }
        });
        chartsGauges.push(instancia);
    });
}

function fixarTooltip(grafico, indice) {
    if (indice < 0) return;
    var meta = grafico.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data[indice]) return;
    grafico.setActiveElements([{ datasetIndex: 0, index: indice }]);
    var ponto = meta.data[indice];
    grafico.tooltip.setActiveElements([{ datasetIndex: 0, index: indice }], { x: ponto.x, y: ponto.y });
    grafico.update();
}

function estiloTooltip() {
    return {
        backgroundColor: "#0b1324",
        titleColor: "#94a3b8",
        bodyColor: "#ff9a1a",
        titleFont: { family: "'JetBrains Mono', monospace", size: 10, weight: "400" },
        bodyFont: { family: "'JetBrains Mono', monospace", size: 11, weight: "600" },
        padding: 10,
        cornerRadius: 6,
        displayColors: false,
        caretPadding: 8
    };
}

function opcoesEixos(yMax, passo, sufixo) {
    return {
        x: {
            grid: { display: false },
            border: { display: false },
            ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6, font: { size: 11 } }
        },
        y: {
            min: 0,
            max: yMax,
            grid: { color: "#eef1f5" },
            border: { display: false },
            ticks: {
                stepSize: passo,
                font: { size: 11 },
                callback: function (v) { return v + sufixo; }
            }
        }
    };
}

function renderizarGraficoCpu(historico, animar) {
    var pontos = historico.filter(function (h) { return numeroValido(h.cpu_uso_percent); });
    if (pontos.length === 0) {
        mostrarEstadoVazioGrafico("grafico_cpu", "Sem leituras históricas de CPU registradas para este servidor.");
        return;
    }

    var canvas = garantirCanvas("grafico_cpu");
    var labels = pontos.map(function (h) { return h.horario_label || "--"; });
    var valores = pontos.map(function (h) { return Number(h.cpu_uso_percent); });
    var limite = numeroValido(pontos[0].limite_critico_cpu) ? Number(pontos[0].limite_critico_cpu) : LIMITE_CPU_PADRAO;
    var idxPico = indiceMaximo(valores);

    chartCpu = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "CPU",
                data: valores,
                borderColor: COR_LARANJA,
                backgroundColor: "rgba(255, 154, 26, .16)",
                borderWidth: 2,
                fill: true,
                tension: 0.25,
                pointRadius: valores.map(function (v, i) { return i === idxPico || valores.length === 1 ? 4 : 2.5; }),
                pointBackgroundColor: COR_LARANJA,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "nearest", intersect: false },
            animation: {
                duration: animar ? 700 : 0,
                onComplete: function (e) {
                    if (e.chart._fixou) return;
                    e.chart._fixou = true;
                    fixarTooltip(e.chart, idxPico);
                }
            },
            scales: opcoesEixos(100, 25, "%"),
            plugins: {
                legend: { display: false },
                linhaLimite: { valor: limite },
                tooltip: Object.assign(estiloTooltip(), {
                    callbacks: {
                        title: function (itens) {
                            var i = itens[0].dataIndex;
                            return itens[0].label + (i === idxPico ? " (Pico)" : "");
                        },
                        label: function (item) { return "CPU: " + item.parsed.y.toFixed(1) + "%"; }
                    }
                })
            }
        }
    });
}

function renderizarGraficoRam(historico, animar) {
    var pontos = historico.filter(function (h) { return numeroValido(h.ram_uso_percent); });
    if (pontos.length === 0) {
        mostrarEstadoVazioGrafico("grafico_ram", "Sem leituras históricas de memória RAM registradas para este servidor.");
        return;
    }

    var canvas = garantirCanvas("grafico_ram");
    var labels = pontos.map(function (h) { return h.horario_label || "--"; });
    var valores = pontos.map(function (h) { return Number(h.ram_uso_percent); });

    chartRam = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "RAM ativa",
                data: valores,
                borderColor: COR_LARANJA,
                backgroundColor: "rgba(255, 154, 26, .16)",
                borderWidth: 2,
                fill: true,
                tension: 0.2,
                pointRadius: valores.map(function (v, i) { return i === valores.length - 1 ? 4 : 2; }),
                pointBackgroundColor: COR_LARANJA,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "nearest", intersect: false },
            animation: { duration: animar ? 700 : 0 },
            scales: opcoesEixos(100, 25, "%"),
            plugins: {
                legend: { display: false },
                tooltip: Object.assign(estiloTooltip(), {
                    callbacks: {
                        label: function (item) { return "RAM: " + item.parsed.y.toFixed(1) + "%"; }
                    }
                })
            }
        }
    });
}

function renderizarGraficoLatencia(historico, animar) {
    var pontos = historico.filter(function (h) { return numeroValido(h.latencia_ms); });
    if (pontos.length === 0) {
        mostrarEstadoVazioGrafico("grafico_latencia", "Sem leituras históricas de latência registradas para este servidor.");
        return;
    }

    var canvas = garantirCanvas("grafico_latencia");
    var labels = pontos.map(function (h) { return h.horario_label || "--"; });
    var valores = pontos.map(function (h) { return Number(h.latencia_ms); });
    var limite = numeroValido(pontos[0].limite_critico_latencia) ? Number(pontos[0].limite_critico_latencia) : LIMITE_LATENCIA_PADRAO;
    var idxPico = indiceMaximo(valores);
    var ultimo = valores.length - 1;
    var maiorValor = idxPico >= 0 ? valores[idxPico] : 0;
    var yMax = Math.max(30, Math.ceil((maiorValor + 5) / 10) * 10);

    var cores = valores.map(function (v, i) {
        if (v >= limite) return "#dc2626";
        if (i === ultimo) return "#059669";
        return COR_LARANJA;
    });

    chartLatencia = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Latência",
                data: valores,
                borderColor: COR_LARANJA,
                backgroundColor: "rgba(255, 154, 26, .14)",
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: valores.map(function (v) { return v >= limite ? 4 : 3; }),
                pointBackgroundColor: cores,
                pointBorderColor: cores,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "nearest", intersect: false },
            animation: {
                duration: animar ? 700 : 0,
                onComplete: function (e) {
                    if (e.chart._fixou) return;
                    e.chart._fixou = true;
                    if (idxPico >= 0 && valores[idxPico] >= limite) fixarTooltip(e.chart, idxPico);
                }
            },
            scales: opcoesEixos(yMax, Math.max(10, Math.round(yMax / 3)), "ms"),
            plugins: {
                legend: { display: false },
                linhaLimite: { valor: limite },
                tooltip: Object.assign(estiloTooltip(), {
                    bodyColor: "#fca5a5",
                    callbacks: {
                        title: function () { return ""; },
                        label: function (item) {
                            var extra = item.parsed.y >= limite ? " (Acima do limite)" : "";
                            return item.label + " • " + item.parsed.y.toFixed(1) + " ms" + extra;
                        }
                    }
                })
            }
        }
    });
}

function carregarDashboard(primeiraCarga) {
    if (carregandoDashboard) return;
    carregandoDashboard = true;

    var url = montarUrlDashboard();

    fetch(url)
        .then(function (res) {
            return res.json().then(function (json) {
                return { ok: res.ok, status: res.status, json: json };
            });
        })
        .then(function (resultado) {
            if (!resultado.ok || !resultado.json || !resultado.json.servidor) {
                var msg = (resultado.json && resultado.json.mensagem)
                    ? resultado.json.mensagem
                    : "Servidor não encontrado no banco de dados.";
                document.getElementById("bc_nome").textContent = "Não encontrado";
                document.getElementById("titulo_nome").textContent = "Servidor não encontrado";
                document.getElementById("titulo_desc").textContent = msg;
                document.getElementById("titulo_ip").textContent = "--";
                document.getElementById("gauges").innerHTML = "";
                mostrarEstadoVazioGrafico("grafico_cpu", msg);
                mostrarEstadoVazioGrafico("grafico_ram", msg);
                mostrarEstadoVazioGrafico("grafico_latencia", msg);
                return;
            }

            dadosDashboardAtual = resultado.json;
            var srv = dadosDashboardAtual.servidor;
            var historico = Array.isArray(dadosDashboardAtual.historico) ? dadosDashboardAtual.historico : [];

            destruirGraficos();
            atualizarCabecalho(srv, dadosDashboardAtual.totalServidores);
            montarGauges(srv, primeiraCarga);
            renderizarGraficoCpu(historico, primeiraCarga);
            renderizarGraficoRam(historico, primeiraCarga);
            renderizarGraficoLatencia(historico, primeiraCarga);
        })
        .catch(function (erro) {
            console.error("Erro ao carregar dashboard:", erro);
            if (!dadosDashboardAtual) {
                document.getElementById("titulo_nome").textContent = "Erro de conexão";
                document.getElementById("titulo_desc").textContent = "Não foi possível carregar os dados do banco de dados.";
            }
        })
        .finally(function () {
            carregandoDashboard = false;
        });
}

function exportarDados() {
    if (!dadosDashboardAtual || !dadosDashboardAtual.servidor) {
        alert("Aguarde o carregamento dos dados antes de exportar.");
        return;
    }

    var srv = dadosDashboardAtual.servidor;
    var historico = Array.isArray(dadosDashboardAtual.historico) ? dadosDashboardAtual.historico : [];

    var linhas = [
        "Servidor;Tipo;IP;Praca;Rodovia;Status;CPU_Atual(%);Temp_Atual(C);RAM_Atual(%);Disco_Uso(%);Disco_Livre(%);Latencia_Atual(ms)",
        [
            srv.nome,
            srv.tipo_descricao || srv.tipo,
            srv.ip,
            srv.nome_praca || "",
            srv.rodovia || "",
            srv.status,
            formatarNumero(srv.cpu, 1),
            formatarNumero(srv.temp, 1),
            formatarNumero(srv.ram, 1),
            formatarNumero(srv.disco, 1),
            formatarNumero(srv.disco_livre, 1),
            formatarNumero(srv.latencia, 1)
        ].join(";"),
        "",
        "Data_Hora;Horario;CPU_Uso(%);RAM_Uso(%);Latencia(ms)"
    ];

    historico.forEach(function (h) {
        linhas.push([
            h.dt_hora || "",
            h.horario_label || "",
            formatarNumero(h.cpu_uso_percent, 2),
            formatarNumero(h.ram_uso_percent, 2),
            formatarNumero(h.latencia_ms, 2)
        ].join(";"));
    });

    var blob = new Blob(["\uFEFF" + linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    var agora = new Date();
    var carimbo = agora.getFullYear() +
        String(agora.getMonth() + 1).padStart(2, "0") +
        String(agora.getDate()).padStart(2, "0") + "-" +
        String(agora.getHours()).padStart(2, "0") +
        String(agora.getMinutes()).padStart(2, "0");

    link.href = url;
    link.download = "sorvesys-" + (srv.nome || "servidor").toLowerCase() + "-" + carimbo + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function sair() {
    try { sessionStorage.clear(); } catch (e) { }
    window.location = "/login";
}

// ===== INÍCIO =====
preencherDadosOperador();
carregarDashboard(true);
setInterval(function () { carregarDashboard(false); }, 15000);
