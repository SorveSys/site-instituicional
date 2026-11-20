/* ============================================================
   SORVESYS NOC - DASHBOARD TERMÔMETRO DE ESTRESSE DOS SERVIDORES
   Lógica e Integração com API / Banco de Dados
============================================================ */

let chartTempInstance = null;
let chartCpuInstance = null;
let chartDispersaoInstance = null;

let periodoSelecionado = "1h";
let pracaSelecionada = "todas";
let servidorSelecionado = "todos";
let pollingTimer = null;
let cacheServidoresTabela = [];

document.addEventListener("DOMContentLoaded", function () {
    inicializarGraficos();
    carregarFiltros();
    atualizarDashboard();

    // Auto-polling a cada 5 segundos (IPMI / SNMP Trap)
    pollingTimer = setInterval(function () {
        atualizarDashboard(true);
    }, 5000);

    configurarEventos();
});

function configurarEventos() {
    // Filtro Praça
    const selectPraca = document.getElementById("select_praca");
    if (selectPraca) {
        selectPraca.addEventListener("change", function (e) {
            pracaSelecionada = e.target.value;
            atualizarDashboard();
        });
    }

    // Filtro Servidor / Foco Crítico
    const selectServidor = document.getElementById("select_servidor");
    if (selectServidor) {
        selectServidor.addEventListener("change", function (e) {
            servidorSelecionado = e.target.value;
            atualizarDashboard();
        });
    }

    // Toggle Período (1h, 6h, 24h, 7d)
    const botoesPeriodo = document.querySelectorAll(".period-btn");
    botoesPeriodo.forEach(function (btn) {
        btn.addEventListener("click", function () {
            botoesPeriodo.forEach(b => b.classList.remove("ativo"));
            this.classList.add("ativo");
            periodoSelecionado = this.getAttribute("data-periodo");
            atualizarHistorico();
        });
    });

    // Busca rápida na tabela
    const inputBusca = document.getElementById("input_busca_tabela");
    if (inputBusca) {
        inputBusca.addEventListener("input", function (e) {
            filtrarTabelaLocal(e.target.value);
        });
    }

    // Exportar Relatório
    const btnExportar = document.getElementById("btn_exportar");
    if (btnExportar) {
        btnExportar.addEventListener("click", function () {
            window.print();
        });
    }
}

/* ============================================================
   CARREGAMENTO DE FILTROS DINÂMICOS
============================================================ */
function carregarFiltros() {
    fetch("/termometro/filtros")
        .then(res => res.json())
        .then(data => {
            const selectPraca = document.getElementById("select_praca");
            const selectServidor = document.getElementById("select_servidor");

            if (selectPraca && data.pracas) {
                selectPraca.innerHTML = "";
                data.pracas.forEach(p => {
                    const opt = document.createElement("option");
                    opt.value = p.id;
                    opt.textContent = p.nome;
                    selectPraca.appendChild(opt);
                });
            }

            if (selectServidor && data.servidores) {
                selectServidor.innerHTML = "";
                data.servidores.forEach(s => {
                    const opt = document.createElement("option");
                    opt.value = s.id;
                    opt.textContent = s.nome;
                    if (s.nome.includes("Foco Crítico")) {
                        opt.selected = true;
                        servidorSelecionado = s.id;
                    }
                    selectServidor.appendChild(opt);
                });
            }
        })
        .catch(err => {
            console.error("Erro ao carregar opções de filtros:", err);
        });
}

/* ============================================================
   INICIALIZAÇÃO DOS GRÁFICOS (CHART.JS)
============================================================ */
function inicializarGraficos() {
    // 1. Gráfico Histórico de Temperatura
    const ctxTemp = document.getElementById("chart_temperatura")?.getContext("2d");
    if (ctxTemp) {
        const gradienteTemp = ctxTemp.createLinearGradient(0, 0, 0, 220);
        gradienteTemp.addColorStop(0, "rgba(249, 115, 22, 0.25)");
        gradienteTemp.addColorStop(1, "rgba(249, 115, 22, 0.0)");

        chartTempInstance = new Chart(ctxTemp, {
            type: "line",
            data: {
                labels: ["13:50", "13:55", "13:58", "14:00 (Pico 92°C)", "14:05", "14:10", "Agora (14:22)"],
                datasets: [
                    {
                        label: "Temperatura (°C)",
                        data: [55.0, 58.0, 62.0, 92.0, 75.0, 82.0, 92.0],
                        borderColor: "#f97316",
                        backgroundColor: gradienteTemp,
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2.5,
                        pointBackgroundColor: function (context) {
                            const val = context.raw;
                            return val >= 85 ? "#ef4444" : "#f97316";
                        },
                        pointBorderColor: "#ffffff",
                        pointBorderWidth: 2,
                        pointRadius: function (context) {
                            const val = context.raw;
                            return val >= 85 ? 6 : 4;
                        },
                        pointHoverRadius: 7
                    },
                    {
                        label: "Limite Crítico (85°C)",
                        data: [85, 85, 85, 85, 85, 85, 85],
                        borderColor: "#ef4444",
                        borderDash: [5, 4],
                        borderWidth: 1.5,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#0f172a",
                        titleFont: { family: "Inter", size: 12 },
                        bodyFont: { family: "JetBrains Mono", size: 12 },
                        callbacks: {
                            label: function (ctx) {
                                return ` ${ctx.dataset.label}: ${ctx.raw}°C`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: "rgba(226, 232, 240, 0.6)" },
                        ticks: { font: { family: "JetBrains Mono", size: 10 }, color: "#64748b" }
                    },
                    y: {
                        min: 40,
                        max: 100,
                        grid: { color: "rgba(226, 232, 240, 0.6)" },
                        ticks: {
                            font: { family: "JetBrains Mono", size: 10 },
                            color: "#64748b",
                            callback: function (val) { return val + "°"; }
                        }
                    }
                }
            }
        });
    }

    // 2. Gráfico Histórico de CPU
    const ctxCpu = document.getElementById("chart_cpu")?.getContext("2d");
    if (ctxCpu) {
        const gradienteCpu = ctxCpu.createLinearGradient(0, 0, 0, 220);
        gradienteCpu.addColorStop(0, "rgba(2, 132, 199, 0.25)");
        gradienteCpu.addColorStop(1, "rgba(2, 132, 199, 0.0)");

        chartCpuInstance = new Chart(ctxCpu, {
            type: "line",
            data: {
                labels: ["13:50", "13:55", "13:58", "14:00 (Pico 92%)", "14:05", "14:10", "Agora (14:22)"],
                datasets: [
                    {
                        label: "Utilização CPU (%)",
                        data: [42.0, 48.0, 55.0, 92.0, 68.0, 74.0, 82.0],
                        borderColor: "#0284c7",
                        backgroundColor: gradienteCpu,
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2.5,
                        pointBackgroundColor: "#0284c7",
                        pointBorderColor: "#ffffff",
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 7
                    },
                    {
                        label: "Alerta Carga (80%)",
                        data: [80, 80, 80, 80, 80, 80, 80],
                        borderColor: "#f59e0b",
                        borderDash: [5, 4],
                        borderWidth: 1.5,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#0f172a",
                        titleFont: { family: "Inter", size: 12 },
                        bodyFont: { family: "JetBrains Mono", size: 12 },
                        callbacks: {
                            label: function (ctx) {
                                return ` ${ctx.dataset.label}: ${ctx.raw}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: "rgba(226, 232, 240, 0.6)" },
                        ticks: { font: { family: "JetBrains Mono", size: 10 }, color: "#64748b" }
                    },
                    y: {
                        min: 20,
                        max: 100,
                        grid: { color: "rgba(226, 232, 240, 0.6)" },
                        ticks: {
                            font: { family: "JetBrains Mono", size: 10 },
                            color: "#64748b",
                            callback: function (val) { return val + "%"; }
                        }
                    }
                }
            }
        });
    }

    // 3. Gráfico de Dispersão (Temperatura vs Uso de CPU)
    const ctxDisp = document.getElementById("chart_dispersao")?.getContext("2d");
    if (ctxDisp) {
        chartDispersaoInstance = new Chart(ctxDisp, {
            type: "scatter",
            data: {
                datasets: [
                    {
                        label: "Servidores Monitorados",
                        data: [
                            { x: 46.0, y: 58.0, host: "SRV-MG01", status: "Normal" },
                            { x: 55.0, y: 64.0, host: "SRV-PR04", status: "Normal" },
                            { x: 66.0, y: 74.0, host: "SRV-RJ02", status: "Normal" },
                            { x: 75.0, y: 78.0, host: "SRV-SP01", status: "Atenção" },
                            { x: 82.0, y: 92.0, host: "SRV-AU03", status: "Crítico" }
                        ],
                        backgroundColor: function (ctx) {
                            const raw = ctx.raw;
                            if (!raw) return "#10b981";
                            if (raw.y >= 85) return "#ef4444";
                            if (raw.y >= 70) return "#f59e0b";
                            return "#10b981";
                        },
                        borderColor: "#ffffff",
                        borderWidth: 2,
                        pointRadius: 7,
                        pointHoverRadius: 9
                    },
                    {
                        label: "Curva Linear de Carga (Regressão)",
                        type: "line",
                        data: [
                            { x: 40, y: 55 },
                            { x: 60, y: 68 },
                            { x: 80, y: 81 },
                            { x: 95, y: 90 }
                        ],
                        borderColor: "#94a3b8",
                        borderDash: [4, 4],
                        borderWidth: 1.5,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: "Limite Crítico (85°C)",
                        type: "line",
                        data: [
                            { x: 30, y: 85 },
                            { x: 100, y: 85 }
                        ],
                        borderColor: "#ef4444",
                        borderDash: [6, 4],
                        borderWidth: 1.5,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#0f172a",
                        callbacks: {
                            label: function (ctx) {
                                const pt = ctx.raw;
                                if (pt.host) {
                                    return ` ${pt.host}: ${pt.y}°C / CPU ${pt.x}% (${pt.status})`;
                                }
                                return ` ${ctx.dataset.label}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        min: 30,
                        max: 100,
                        title: { display: true, text: "Uso de CPU (%)", font: { size: 10, family: "JetBrains Mono" }, color: "#64748b" },
                        grid: { color: "rgba(226, 232, 240, 0.6)" },
                        ticks: {
                            font: { family: "JetBrains Mono", size: 10 },
                            color: "#64748b",
                            callback: function (val) { return val + "%"; }
                        }
                    },
                    y: {
                        min: 40,
                        max: 100,
                        title: { display: true, text: "Temperatura (°C)", font: { size: 10, family: "JetBrains Mono" }, color: "#64748b" },
                        grid: { color: "rgba(226, 232, 240, 0.6)" },
                        ticks: {
                            font: { family: "JetBrains Mono", size: 10 },
                            color: "#64748b",
                            callback: function (val) { return val + "°C"; }
                        }
                    }
                }
            }
        });
    }
}

/* ============================================================
   ATUALIZAÇÃO GERAL DA DASHBOARD
============================================================ */
function atualizarDashboard(silencioso = false) {
    atualizarKpis();
    atualizarHistorico();
    atualizarDispersao();
    atualizarRanking();
    atualizarTabelaServidores();

    // Atualiza relógio de sincronização
    const agora = new Date();
    const horaFormatada = agora.toLocaleTimeString("pt-BR");
    const elSync = document.getElementById("hora_sync");
    const elAtualizado = document.getElementById("hora_atualizado");

    if (elSync) elSync.textContent = `SYNC ${horaFormatada} BRT`;
    if (elAtualizado) elAtualizado.textContent = horaFormatada;
}

/* 1. ATUALIZAR KPIS E BARRA IET */
function atualizarKpis() {
    const params = new URLSearchParams({
        concessionaria: pracaSelecionada,
        servidor: servidorSelecionado
    });

    fetch(`/termometro/kpis?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
            // KPI 1: Temperatura Média Frota
            const elTempMedia = document.getElementById("kpi_temp_media");
            const barTempMedia = document.getElementById("bar_temp_media");
            if (elTempMedia) elTempMedia.textContent = data.tempMedia.toFixed(1);
            if (barTempMedia) barTempMedia.style.width = Math.min(100, (data.tempMedia / 100) * 100) + "%";

            // KPI 2: Temperatura Máxima Detectada
            const elTempMax = document.getElementById("kpi_temp_maxima");
            const barTempMax = document.getElementById("bar_temp_maxima");
            const elPicoHost = document.getElementById("kpi_pico_host");
            const elPicoHorario = document.getElementById("kpi_pico_horario");
            if (elTempMax) elTempMax.textContent = data.tempMaxima.toFixed(1);
            if (barTempMax) barTempMax.style.width = Math.min(100, (data.tempMaxima / 100) * 100) + "%";
            if (elPicoHost) elPicoHost.textContent = data.picoHost;
            if (elPicoHorario) elPicoHorario.textContent = data.picoHorario;

            // KPI 3: Uso Médio CPU Total
            const elCpuMedia = document.getElementById("kpi_cpu_media");
            const barCpuMedia = document.getElementById("bar_cpu_media");
            if (elCpuMedia) elCpuMedia.textContent = data.cpuMedia.toFixed(1);
            if (barCpuMedia) barCpuMedia.style.width = data.cpuMedia + "%";

            // KPI 4: Servidores em Alerta
            const elAlerta = document.getElementById("kpi_servidores_alerta");
            const elSubAlerta = document.getElementById("kpi_sub_alerta");
            const badgeAlerta = document.getElementById("kpi_badge_alerta");
            const total = data.totalServidores || 8;
            const strAlerta = String(data.servidoresAlerta).padStart(2, "0");
            const strTotal = String(total).padStart(2, "0");

            if (elAlerta) elAlerta.textContent = `${strAlerta} / ${strTotal} Ativos`;
            if (badgeAlerta) badgeAlerta.textContent = `${data.servidoresAlerta} de ${total}`;
            if (elSubAlerta) {
                elSubAlerta.innerHTML = `<span style="color:#ef4444;font-weight:600">${data.servidoresCriticos} Crítico (&gt;85°C)</span> • ${data.servidoresAtencao} Atenção`;
            }

            // Barra IET (Índice de Estresse Térmico Consolidado)
            if (data.iet) {
                const segNormal = document.getElementById("iet_seg_normal");
                const segAtencao = document.getElementById("iet_seg_atencao");
                const segCritico = document.getElementById("iet_seg_critico");

                const txtNormal = document.getElementById("iet_txt_normal");
                const txtAtencao = document.getElementById("iet_txt_atencao");
                const txtCritico = document.getElementById("iet_txt_critico");

                if (segNormal) segNormal.style.width = data.iet.normal.pct + "%";
                if (segAtencao) segAtencao.style.width = data.iet.atencao.pct + "%";
                if (segCritico) segCritico.style.width = data.iet.critico.pct + "%";

                if (txtNormal) txtNormal.textContent = `Normal (<70°C): ${data.iet.normal.count} (${data.iet.normal.pct}%)`;
                if (txtAtencao) txtAtencao.textContent = `Atenção (70-85°C): ${data.iet.atencao.count} (${data.iet.atencao.pct}%)`;
                if (txtCritico) txtCritico.textContent = `Crítico (>85°C): ${data.iet.critico.count} (${data.iet.critico.pct}%)`;
            }
        })
        .catch(err => console.error("Erro ao atualizar KPIs:", err));
}

/* 2. ATUALIZAR HISTÓRICOS (LINHAS) */
function atualizarHistorico() {
    const params = new URLSearchParams({
        servidor: servidorSelecionado,
        periodo: periodoSelecionado
    });

    fetch(`/termometro/historico?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
            if (chartTempInstance && data.temperaturas) {
                chartTempInstance.data.labels = data.labels;
                chartTempInstance.data.datasets[0].data = data.temperaturas;
                chartTempInstance.data.datasets[1].data = new Array(data.labels.length).fill(data.limiteCriticoTemp || 85);
                chartTempInstance.update("none");

                const elSubTemp = document.getElementById("sub_chart_temp");
                if (elSubTemp) {
                    elSubTemp.innerHTML = `Duração contínua acima de 85°C: <strong class="destaque-red">${data.duracaoAcima85Min} min</strong> • ${data.servidorFoco} Pico: <strong class="destaque-red">${data.picoTemp}°C</strong>`;
                }
            }

            if (chartCpuInstance && data.cpus) {
                chartCpuInstance.data.labels = data.labels;
                chartCpuInstance.data.datasets[0].data = data.cpus;
                chartCpuInstance.data.datasets[1].data = new Array(data.labels.length).fill(data.limiteAlertaCpu || 80);
                chartCpuInstance.update("none");

                const elSubCpu = document.getElementById("sub_chart_cpu");
                if (elSubCpu) {
                    elSubCpu.innerHTML = `Pico: <strong style="color:#0284c7">${data.picoCpu}%</strong> | Média Período: <strong>${data.mediaCpuPeriodo}%</strong> • Carga Total Buffer ANTT`;
                }
            }
        })
        .catch(err => console.error("Erro ao atualizar histórico:", err));
}

/* 3. ATUALIZAR DISPERSÃO (SCATTER) */
function atualizarDispersao() {
    const params = new URLSearchParams({
        concessionaria: pracaSelecionada
    });

    fetch(`/termometro/dispersao?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
            if (chartDispersaoInstance && data.pontos) {
                chartDispersaoInstance.data.datasets[0].data = data.pontos;
                chartDispersaoInstance.update("none");
            }

            const elR2 = document.getElementById("disp_r2");
            const elCriticos = document.getElementById("disp_criticos");
            const elDiag = document.getElementById("disp_diagnostico_texto");

            if (elR2) elR2.textContent = `R² = ${data.r2}`;
            if (elCriticos) elCriticos.textContent = `${data.criticos} Crítico`;
            if (elDiag && data.diagnostico) {
                elDiag.textContent = data.diagnostico;
            }
        })
        .catch(err => console.error("Erro ao atualizar dispersão:", err));
}

/* 4. ATUALIZAR RANKING TÉRMICO */
function atualizarRanking() {
    const params = new URLSearchParams({
        concessionaria: pracaSelecionada
    });

    fetch(`/termometro/ranking?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById("ranking_container");
            if (!container || !data.ranking) return;

            container.innerHTML = "";
            data.ranking.forEach(item => {
                const percentBar = Math.min(100, Math.max(10, item.temp));
                const div = document.createElement("div");
                div.className = "ranking-item";
                div.innerHTML = `
                    <div class="ranking-item-topo">
                        <div class="ranking-item-nome">
                            <span>${item.posicao}. ${item.host}</span>
                            <span class="ranking-item-funcao">(${item.funcao})</span>
                        </div>
                        <div class="ranking-item-valores">
                            <span class="ranking-temp" style="color:${item.status === 'Crítico' ? '#ef4444' : (item.status === 'Atenção' ? '#f59e0b' : '#10b981')}">${item.temp.toFixed(1)} °C</span>
                            <span class="ranking-badge ${item.badgeClass}">${item.status}</span>
                        </div>
                    </div>
                    <div class="ranking-bar-track">
                        <div class="ranking-bar-fill ${item.classeCss}" style="width: ${percentBar}%"></div>
                    </div>
                    <div class="ranking-item-sub">
                        <span>CPU: <strong>${item.cpu}%</strong></span>
                        <span>Delta: <strong>${item.delta}</strong></span>
                    </div>
                `;
                container.appendChild(div);
            });

            const elAmbiente = document.getElementById("ranking_ambiente");
            if (elAmbiente) elAmbiente.textContent = data.tempAmbiente;
        })
        .catch(err => console.error("Erro ao atualizar ranking:", err));
}

/* 5. ATUALIZAR TABELA DE SERVIDORES */
function atualizarTabelaServidores() {
    const params = new URLSearchParams({
        concessionaria: pracaSelecionada
    });

    fetch(`/termometro/servidores?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
            cacheServidoresTabela = data.servidores || [];
            renderizarTabela(cacheServidoresTabela);
        })
        .catch(err => console.error("Erro ao atualizar tabela:", err));
}

function renderizarTabela(servidores) {
    const tbody = document.getElementById("tbody_servidores");
    const countInfo = document.getElementById("tabela_mostrando_info");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (servidores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:#64748b;">Nenhum servidor encontrado com os filtros aplicados.</td></tr>`;
        if (countInfo) countInfo.textContent = "Mostrando 0 de 0 hosts monitorados";
        return;
    }

    servidores.forEach(srv => {
        const tr = document.createElement("tr");
        if (srv.statusTermico === "Crítico") tr.classList.add("linha-critica");

        const btnAcoes = srv.statusTermico === "Crítico"
            ? `<button class="btn-ghost-telemetria" onclick="verTelemetria('${srv.host}')">Telemetria</button>
               <button class="btn-solid-investigar" onclick="abrirModalInvestigar('${srv.host}', '${srv.ip}', ${srv.tempAtual}, ${srv.cpu})">Investigar</button>`
            : `<button class="btn-ghost-telemetria" onclick="verTelemetria('${srv.host}')">Ver Telemetria</button>`;

        tr.innerHTML = `
            <td>
                <div class="host-col">
                    <div class="host-avatar ${srv.sigla}">${srv.sigla}</div>
                    <div class="host-info-text">
                        <span class="host-title">${srv.host}</span>
                        <span class="host-funcao">${srv.funcao}</span>
                    </div>
                </div>
            </td>
            <td>
                <div class="ip-col">
                    <span class="mono">${srv.ip}</span>
                    <span class="ip-praca">${srv.praca}</span>
                </div>
            </td>
            <td>
                <div class="temp-col">
                    <span class="temp-num ${srv.classeCss}">● ${srv.tempAtual.toFixed(1)}°C</span>
                    <span class="temp-sub">${srv.tempStatusMsg}</span>
                </div>
            </td>
            <td>
                <div class="cpu-col">
                    <span class="cpu-num">${srv.cpu.toFixed(1)}%</span>
                    <div class="cpu-bar-track">
                        <div class="cpu-bar-fill ${srv.classeCss}" style="width: ${srv.cpu}%"></div>
                    </div>
                </div>
            </td>
            <td>
                <div class="fan-col ${srv.classeCss}">
                    <span>${srv.ventoinhaRPM} RPM</span>
                    <span class="fan-sub">${srv.ventoinhaStatus}</span>
                </div>
            </td>
            <td>
                <div class="latency-col">
                    <span>${srv.latenciaCCO}</span>
                    <span class="latency-sub">${srv.tipoLink}</span>
                </div>
            </td>
            <td>
                <span class="status-badge ${srv.badgeClass}">${srv.statusTermico}</span>
            </td>
            <td>
                <div class="actions-col">
                    ${btnAcoes}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (countInfo) {
        countInfo.textContent = `Mostrando ${Math.min(5, servidores.length)} de ${servidores.length} hosts monitorados • Cluster ANTT Integrado`;
    }
}

function filtrarTabelaLocal(termo) {
    if (!termo) {
        renderizarTabela(cacheServidoresTabela);
        return;
    }
    const t = termo.toLowerCase().trim();
    const filtrados = cacheServidoresTabela.filter(s =>
        s.host.toLowerCase().includes(t) ||
        s.funcao.toLowerCase().includes(t) ||
        s.ip.toLowerCase().includes(t) ||
        s.praca.toLowerCase().includes(t) ||
        s.statusTermico.toLowerCase().includes(t)
    );
    renderizarTabela(filtrados);
}

/* ============================================================
   AÇÕES DO ANALISTA (INVESTIGAR / MODAL)
============================================================ */
function abrirModalInvestigar(host, ip, temp, cpu) {
    const modal = document.getElementById("modal_investigar");
    if (!modal) return;

    document.getElementById("modal_srv_host").textContent = host;
    document.getElementById("modal_srv_ip").textContent = ip;
    document.getElementById("modal_srv_temp").textContent = `${temp.toFixed(1)} °C`;
    document.getElementById("modal_srv_cpu").textContent = `${cpu.toFixed(1)} %`;

    modal.classList.add("ativo");
}

function fecharModalInvestigar() {
    const modal = document.getElementById("modal_investigar");
    if (modal) modal.classList.remove("ativo");
}

function executarMitigacao() {
    alert("Protocolo de Mitigação Térmica acionado!\n1. Desvio de tráfego de leitura OCR para servidor redundante.\n2. Elevação das ventoinhas auxiliares do Rack P1 para 100% via IPMI.\n3. Ticket emergencial aberto para equipe de campo.");
    fecharModalInvestigar();
    atualizarDashboard();
}

function verTelemetria(host) {
    const selectServidor = document.getElementById("select_servidor");
    if (selectServidor) {
        for (let i = 0; i < selectServidor.options.length; i++) {
            if (selectServidor.options[i].text.includes(host)) {
                selectServidor.selectedIndex = i;
                servidorSelecionado = selectServidor.options[i].value;
                atualizarHistorico();
                break;
            }
        }
    }
    window.scrollTo({ top: 380, behavior: 'smooth' });
}
