// ===== DADOS DEMONSTRATIVOS (trocar por fetch na API quando o back-end estiver pronto) =====
// cpu / ram / disco em %, temp em °C, lat em ms
var SERVIDORES = {
    "SRV-AU03": { desc: "Auditoria & Logs ANTT", ip: "192.168.10.47", cpu: 78.4, temp: 74.5, ram: 68.2, disco: 87.4, lat: 4.2, link: "Fibra Óptica" },
    "SRV-AU04": { desc: "Auditoria & Arquivo ANTT", ip: "192.168.10.99", cpu: 19.8, temp: 45.3, ram: 33.5, disco: 58.2, lat: 3.9, link: "Fibra Óptica" },
    "SRV-GW04": { desc: "Gateway Edge ANTT", ip: "192.168.10.48", cpu: 96.2, temp: 81.4, ram: 91.5, disco: 79.0, lat: 18.6, link: "Link Redundante" },
    "SRV-PG01": { desc: "TEF & Validador de TAGs", ip: "192.168.10.20", cpu: 28.5, temp: 48.9, ram: 44.0, disco: 31.8, lat: 2.8, link: "Fibra Óptica" },
    "SRV-PG02": { desc: "Pagamento • Cabines Manuais", ip: "192.168.10.22", cpu: 34.0, temp: 50.6, ram: 51.3, disco: 18.9, lat: 3.1, link: "Fibra Óptica" },
    "SRV-PG03": { desc: "Pagamento • TAG", ip: "192.168.10.25", cpu: 31.7, temp: 49.7, ram: 48.2, disco: 36.5, lat: 3.4, link: "Fibra Óptica" },
    "SRV-TR01": { desc: "Pista Free-Flow Pórtico 01", ip: "192.168.10.12", cpu: 41.2, temp: 53.2, ram: 38.6, disco: 22.4, lat: 4.6, link: "Fibra Óptica" },
    "SRV-TR02": { desc: "Pista Free-Flow Pórtico 09", ip: "192.168.10.14", cpu: 78.9, temp: 67.1, ram: 64.2, disco: 45.1, lat: 5.2, link: "Fibra Óptica" },
    "SRV-TR03": { desc: "Pista Free-Flow Pórtico 03", ip: "192.168.10.15", cpu: 22.1, temp: 46.8, ram: 29.4, disco: 15.0, lat: 3.7, link: "Fibra Óptica" }
};

var HORARIOS = ["13:15", "13:20", "13:25", "13:30", "13:35", "13:40", "13:45", "13:50", "13:55", "14:00", "14:05", "14:10", "14:15", "14:20"];
var HORARIOS_LAT = ["13:15", "13:30", "13:45", "14:00", "14:10", "14:15", "14:20"];

var RAM_TOTAL_GB = 16;
var NVME_TOTAL_GB = 512;
var LIMITE_CPU = 85;
var LIMITE_LATENCIA = 20;

var COR_LARANJA = "#ff9a1a";
var COR_TRILHA = "#e5e9f0";

var params = new URLSearchParams(window.location.search);
var nomeServidor = (params.get("srv") || "SRV-AU03").toUpperCase();

if (!SERVIDORES[nomeServidor]) {
    nomeServidor = "SRV-AU03";
}

var srv = SERVIDORES[nomeServidor];

var ramUsadaGb = srv.ram / 100 * RAM_TOTAL_GB;
var nvmeUsadoGb = srv.disco / 100 * NVME_TOTAL_GB;
var nvmeLivreGb = NVME_TOTAL_GB - nvmeUsadoGb;

function ruido(i, semente) {
    return Math.sin(i * 1.7 + semente);
}

function semente() {
    var s = 0;
    for (var i = 0; i < nomeServidor.length; i++) s += nomeServidor.charCodeAt(i);
    return s;
}

function arred(v, casas) {
    var f = Math.pow(10, casas);
    return Math.round(v * f) / f;
}

function gerarSerieCpu() {
    if (nomeServidor == "SRV-AU03") {
        return [27, 31, 34, 36, 41, 45, 50, 55, 60, 82, 75, 70, 68, 69];
    }
    var sm = semente();
    return HORARIOS.map(function (h, i) {
        var v = srv.cpu * (0.7 + 0.3 * i / 13) + 5 * ruido(i, sm);
        return arred(Math.max(5, Math.min(99, v)), 1);
    });
}

function gerarSerieRam() {
    var sm = semente();
    return HORARIOS.map(function (h, i) {
        var v = ramUsadaGb * (0.93 + 0.07 * i / 13) + 0.05 * ruido(i, sm);
        if (i == 13) v = ramUsadaGb;
        return arred(v, 1);
    });
}

function gerarSerieLatencia() {
    var l = srv.lat;
    if (nomeServidor == "SRV-AU03") {
        return [5, 5.5, 6, 22.4, 5, 5, 4.2];
    }
    return [l + 0.8, l + 1.0, l + 1.3, l + 0.5, l + 0.9, l + 0.6, l].map(function (v) { return arred(v, 1); });
}

var serieCpu = gerarSerieCpu();
var serieRam = gerarSerieRam();
var serieLat = gerarSerieLatencia();

function indiceMaximo(lista) {
    var idx = 0;
    lista.forEach(function (v, i) { if (v > lista[idx]) idx = i; });
    return idx;
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

document.title = "SorveSys | " + nomeServidor;
document.getElementById("bc_nome").innerHTML = nomeServidor;
document.getElementById("titulo_nome").innerHTML = nomeServidor;
document.getElementById("titulo_desc").innerHTML = srv.desc;
document.getElementById("titulo_ip").innerHTML = srv.ip;
document.getElementById("legenda_ram").innerHTML = "Ativa (" + arred(ramUsadaGb, 1) + " GB)";
document.getElementById("selo_latencia").innerHTML = "Média: " + srv.lat + " ms";

var mediaCpu = Math.round(srv.cpu * 0.54);
var picoCpu = Math.round(Math.min(100, srv.cpu * 1.046));

var gauges = [
    {
        id: "cpu", titulo: "CPU Total", badge: srv.cpu + "%", cor: COR_LARANJA,
        valor: srv.cpu, max: 100, centro: Math.round(srv.cpu) + "%",
        esq: "Média: " + mediaCpu + "%", dir: "<b>Pico: " + picoCpu + "%</b>"
    },
    {
        id: "temp", titulo: "Temp CPU", badge: srv.temp + "°C", cor: "#d97706",
        valor: srv.temp, max: 100, centro: Math.round(srv.temp) + "°C",
        esq: "Média: " + Math.round(srv.temp - 16.5) + "°C", dir: "<b>Máx: " + arred(srv.temp + 1.7, 1) + "°C</b>"
    },
    {
        id: "ram", titulo: "RAM Utilizada", badge: srv.ram + "%", cor: COR_LARANJA,
        valor: ramUsadaGb, max: RAM_TOTAL_GB, centro: arred(ramUsadaGb, 1) + "G",
        esq: "Livre: " + arred(RAM_TOTAL_GB - ramUsadaGb, 1) + " GB", dir: "<b>Total: " + RAM_TOTAL_GB + " GB</b>"
    },
    {
        id: "nvme", titulo: "NVMe Logs", badge: srv.disco + "%", cor: "#ea580c",
        valor: nvmeUsadoGb, max: NVME_TOTAL_GB, centro: Math.round(nvmeUsadoGb) + "G",
        esq: "Livre: " + arred(nvmeLivreGb, 1) + "G", dir: "<b>" + NVME_TOTAL_GB + " GB SSD</b>"
    },
    {
        id: "lat", titulo: "Latência CCO", badge: srv.lat + " ms", verde: true, cor: "#059669",
        valor: srv.lat, max: LIMITE_LATENCIA, centro: srv.lat + "ms", corCentro: "#059669",
        esq: "Jitter:<br>±0.8ms", dir: '<span class="verde">' + srv.link.replace(" ", "<br>") + "</span>"
    }
];

function montarGauges() {
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
        var restante = Math.max(0, g.max - g.valor);

        new Chart(document.getElementById("gauge_" + g.id), {
            type: "doughnut",
            data: {
                datasets: [{
                    data: [Math.min(g.valor, g.max), restante],
                    backgroundColor: [g.cor, COR_TRILHA],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "76%",
                animation: { duration: 900 },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false },
                    textoCentro: { texto: g.centro, cor: g.corCentro || "#0f172a", tamanho: 15 }
                }
            }
        });
    });
}

function fixarTooltip(grafico, indice) {
    grafico.setActiveElements([{ datasetIndex: 0, index: indice }]);
    var ponto = grafico.getDatasetMeta(0).data[indice];
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

function graficoCpu() {
    var idxPico = indiceMaximo(serieCpu);

    var g = new Chart(document.getElementById("grafico_cpu"), {
        type: "line",
        data: {
            labels: HORARIOS,
            datasets: [{
                label: "CPU",
                data: serieCpu,
                borderColor: COR_LARANJA,
                backgroundColor: "rgba(255, 154, 26, .16)",
                borderWidth: 2,
                fill: true,
                tension: 0.25,
                pointRadius: serieCpu.map(function (v, i) { return i == idxPico ? 4 : 2.5; }),
                pointBackgroundColor: COR_LARANJA,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "nearest", intersect: false },
            animation: {
                duration: 700,
                onComplete: function (e) {
                    if (e.chart._fixou) return;
                    e.chart._fixou = true;
                    fixarTooltip(e.chart, idxPico);
                }
            },
            scales: opcoesEixos(100, 25, "%"),
            plugins: {
                legend: { display: false },
                linhaLimite: { valor: LIMITE_CPU },
                tooltip: Object.assign(estiloTooltip(), {
                    callbacks: {
                        title: function (itens) {
                            var i = itens[0].dataIndex;
                            return itens[0].label + (i == idxPico ? " (Pico)" : "");
                        },
                        label: function (item) { return "CPU: " + item.parsed.y + "%"; }
                    }
                })
            }
        }
    });
    return g;
}

function graficoRam() {
    return new Chart(document.getElementById("grafico_ram"), {
        type: "line",
        data: {
            labels: HORARIOS,
            datasets: [{
                label: "RAM ativa",
                data: serieRam,
                borderColor: COR_LARANJA,
                backgroundColor: "rgba(255, 154, 26, .16)",
                borderWidth: 2,
                fill: true,
                tension: 0.2,
                pointRadius: serieRam.map(function (v, i) { return i == serieRam.length - 1 ? 3.5 : 0; }),
                pointBackgroundColor: COR_LARANJA,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "nearest", intersect: false },
            scales: opcoesEixos(RAM_TOTAL_GB, 4, " GB"),
            plugins: {
                legend: { display: false },
                tooltip: Object.assign(estiloTooltip(), {
                    callbacks: {
                        label: function (item) { return "RAM: " + item.parsed.y + " GB"; }
                    }
                })
            }
        }
    });
}

function graficoLatencia() {
    var idxPico = indiceMaximo(serieLat);
    var ultimo = serieLat.length - 1;

    var cores = serieLat.map(function (v, i) {
        if (v >= LIMITE_LATENCIA) return "#dc2626";
        if (i == ultimo) return "#059669";
        return COR_LARANJA;
    });

    return new Chart(document.getElementById("grafico_latencia"), {
        type: "line",
        data: {
            labels: HORARIOS_LAT,
            datasets: [{
                label: "Latência",
                data: serieLat,
                borderColor: COR_LARANJA,
                backgroundColor: "rgba(255, 154, 26, .14)",
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: serieLat.map(function (v) { return v >= LIMITE_LATENCIA ? 4 : 3; }),
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
                duration: 700,
                onComplete: function (e) {
                    if (e.chart._fixou) return;
                    e.chart._fixou = true;
                    if (serieLat[idxPico] >= LIMITE_LATENCIA) fixarTooltip(e.chart, idxPico);
                }
            },
            scales: opcoesEixos(30, 10, "ms"),
            plugins: {
                legend: { display: false },
                linhaLimite: { valor: LIMITE_LATENCIA },
                tooltip: Object.assign(estiloTooltip(), {
                    bodyColor: "#fca5a5",
                    callbacks: {
                        title: function () { return ""; },
                        label: function (item) {
                            var extra = item.parsed.y >= LIMITE_LATENCIA ? " (Rota L3)" : "";
                            return item.label + " • " + item.parsed.y + " ms" + extra;
                        }
                    }
                })
            }
        }
    });
}



function sair() {
    try { sessionStorage.clear(); } catch (e) { }
    window.location = "/login";
}

try {
    if (sessionStorage.NOME_USUARIO) {
        document.getElementById("nome_operador").innerHTML = sessionStorage.NOME_USUARIO;
    }
} catch (e) { }

montarGauges();
graficoCpu();
graficoRam();
graficoLatencia();