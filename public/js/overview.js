var ICONES = "./assets/icons/overview/";
var API_BASE = window.location.protocol === "file:" ? "http://localhost:3333" : "";

var servidores = [];
var alertas = [];
var mostrarTodosAlertas = false;
var carregandoDados = false;

var TIPOS = {
    auditoria: { texto: "Armazenamento para auditoria", icone: "ICON-ARMAZENAMENTO.svg", cor: "azul" },
    pagamento: { texto: "Processamento de pagamentos", icone: "ICON-PAGAMENTO.svg", cor: "azul" },
    transito: { texto: "Captura de informações", icone: "ICON-CAMERA.svg", cor: "laranja" }
};

var STATUS = {
    operacional: { texto: "Operacional", classe: "ok", peso: 0 },
    atencao: { texto: "Atenção", classe: "alerta", peso: 1 },
    critico: { texto: "Crítico", classe: "critico", peso: 2 }
};

var ROTULO_NIVEL = { critico: "Crítico", atencao: "Atenção", resolvido: "Resolvido" };

var TAMANHO_PAGINA = 10;
var paginaAtual = 1;

function escaparHtml(texto) {
    if (texto === null || texto === undefined) return "";
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function obterTipoConfig(tipo) {
    var chave = String(tipo || "").toLowerCase();
    return TIPOS[chave] || {
        texto: tipo || "Não definido",
        icone: "ICON-SERVIDORES.svg",
        cor: "azul"
    };
}

function obterStatusConfig(status) {
    var chave = String(status || "").toLowerCase();
    return STATUS[chave] || STATUS.operacional;
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

function obterIdsAlertasLidos() {
    try {
        var salvo = sessionStorage.getItem("ALERTAS_LIDOS");
        var lista = salvo ? JSON.parse(salvo) : [];
        return Array.isArray(lista) ? lista : [];
    } catch (e) {
        return [];
    }
}

function salvarIdsAlertasLidos(ids) {
    try {
        sessionStorage.setItem("ALERTAS_LIDOS", JSON.stringify(ids));
    } catch (e) { }
}

function nivelUso(valor) {
    if (valor === null || valor === undefined || isNaN(Number(valor))) return "";
    var num = Number(valor);
    if (num >= 85) return "uso-critico";
    if (num >= 70) return "uso-alerta";
    return "uso-ok";
}

function formatarPercentual(valor) {
    if (valor === null || valor === undefined || isNaN(Number(valor))) return "--";
    return Number(valor).toFixed(1) + "%";
}

function pct(valor, total) {
    if (total === 0) return "0%";
    return (valor / total * 100).toFixed(1) + "%";
}

function pad(n) {
    return n < 10 ? "0" + n : "" + n;
}

function formatarDataHoraLocal(data) {
    return pad(data.getDate()) + "/" + pad(data.getMonth() + 1) + "/" + data.getFullYear() +
        " " + pad(data.getHours()) + ":" + pad(data.getMinutes());
}

function formatarComunicacao(isoData) {
    if (!isoData) return "Sem comunicação";
    var dt = new Date(isoData);
    if (isNaN(dt.getTime())) return "Sem comunicação";

    var diffSeg = Math.floor((Date.now() - dt.getTime()) / 1000);
    if (diffSeg < 0 || diffSeg >= 86400) {
        return formatarDataHoraLocal(dt);
    }
    if (diffSeg < 60) {
        return "Há " + Math.max(1, diffSeg) + "s";
    }
    if (diffSeg < 3600) {
        return "Há " + Math.floor(diffSeg / 60) + " min";
    }
    return "Há " + Math.floor(diffSeg / 3600) + "h";
}

function formatarTempoAlerta(alerta) {
    if (!alerta.dt_hora) {
        return alerta.data_hora_formatada || "--";
    }
    var dt = new Date(alerta.dt_hora);
    if (isNaN(dt.getTime())) {
        return alerta.data_hora_formatada || "--";
    }

    var diffSeg = Math.floor((Date.now() - dt.getTime()) / 1000);
    var horaStr = alerta.horario_formatado || (pad(dt.getHours()) + ":" + pad(dt.getMinutes()) + ":" + pad(dt.getSeconds()));

    if (diffSeg >= 0 && diffSeg < 60) {
        return "Há " + Math.max(1, diffSeg) + "s (" + horaStr + ")";
    }
    if (diffSeg >= 60 && diffSeg < 3600) {
        var mins = Math.floor(diffSeg / 60);
        return "Há " + mins + (mins === 1 ? " minuto" : " minutos") + " (" + horaStr + ")";
    }
    if (diffSeg >= 3600 && diffSeg < 86400) {
        var hrs = Math.floor(diffSeg / 3600);
        var restMins = Math.floor((diffSeg % 3600) / 60);
        return "Há " + hrs + (hrs === 1 ? " hora" : " horas") +
            (restMins > 0 ? " e " + restMins + " min" : "") + " (" + horaStr + ")";
    }
    return alerta.data_hora_formatada || formatarDataHoraLocal(dt);
}

function iconePorComponente(componente, nivel) {
    if (nivel === "resolvido") return null;
    var nome = String(componente || "").toLowerCase();
    if (nome.indexOf("cpu") >= 0) return "ICON-CPU.svg";
    if (nome.indexOf("disco") >= 0 || nome.indexOf("armazenamento") >= 0) return "ICON-ARMAZENAMENTO.svg";
    if (nome.indexOf("rede") >= 0) return "ICON-WIFIOUT.svg";
    return "ICON-SERVIDORES.svg";
}

function atualizarHora(isoRef) {
    var d = isoRef ? new Date(isoRef) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    document.getElementById("hora_atualizado").innerHTML = pad(d.getHours()) + ":" + pad(d.getMinutes());
}

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

// ===== CARREGAMENTO DO BACK-END =====
function carregarDadosOverview(exibirCarregando) {
    if (carregandoDados) return;
    carregandoDados = true;

    if (exibirCarregando) {
        document.getElementById("corpo_tabela").innerHTML =
            '<tr><td colspan="9" class="vazio">Carregando servidores do banco de dados...</td></tr>';
        document.getElementById("lista_alertas").innerHTML =
            '<div class="alerta-item"><div class="alerta-corpo"><p>Carregando alertas do banco de dados...</p></div></div>';
    }

    var paramsOverview = obterParametrosEscopo();
    var paramsAlertas = obterParametrosEscopo();
    paramsAlertas.set("limite", mostrarTodosAlertas ? "todos" : "5");

    var urlOverview = API_BASE + "/monitoramento/overview" + (paramsOverview.toString() ? "?" + paramsOverview.toString() : "");
    var urlAlertas = API_BASE + "/monitoramento/alertas?" + paramsAlertas.toString();

    Promise.all([
        fetch(urlOverview).then(function (res) {
            if (!res.ok) throw new Error("Erro HTTP " + res.status + " ao buscar overview");
            return res.json();
        }),
        fetch(urlAlertas).then(function (res) {
            if (!res.ok) throw new Error("Erro HTTP " + res.status + " ao buscar alertas");
            return res.json();
        })
    ])
        .then(function (respostas) {
            var dadosOverview = respostas[0] || {};
            var dadosAlertas = respostas[1] || {};

            servidores = Array.isArray(dadosOverview.servidores) ? dadosOverview.servidores : [];

            var lidosIds = obterIdsAlertasLidos();
            var listaAlertasBanco = Array.isArray(dadosAlertas.alertas) ? dadosAlertas.alertas : [];
            alertas = listaAlertasBanco.map(function (a) {
                return Object.assign({}, a, {
                    lido: lidosIds.indexOf(a.id) >= 0
                });
            });

            atualizarHora(dadosOverview.atualizadoEm);
            renderKpis();
            renderTabela();
            renderAlertas();
        })
        .catch(function (erro) {
            console.error("Erro ao carregar dados do overview:", erro);
            if (servidores.length === 0) {
                document.getElementById("corpo_tabela").innerHTML =
                    '<tr><td colspan="9" class="vazio">Não foi possível conectar ao servidor para carregar os dados do banco.</td></tr>';
            }
            if (alertas.length === 0) {
                document.getElementById("lista_alertas").innerHTML =
                    '<div class="alerta-item"><div class="alerta-corpo"><p>Não foi possível carregar os alertas do banco de dados.</p></div></div>';
            }
        })
        .finally(function () {
            carregandoDados = false;
        });
}

// ===== KPIs =====
function renderKpis() {
    var total = servidores.length;
    var ok = servidores.filter(function (s) { return s.status === "operacional"; });
    var alerta = servidores.filter(function (s) { return s.status === "atencao"; });
    var critico = servidores.filter(function (s) { return s.status === "critico"; });

    document.getElementById("kpi_total").innerHTML = total;
    document.getElementById("nav_total").innerHTML = total;

    document.getElementById("kpi_ok").innerHTML = ok.length;
    document.getElementById("kpi_ok_pct").innerHTML = pct(ok.length, total);
    document.getElementById("barra_ok").style.width = pct(ok.length, total);
    document.getElementById("lbl_ok").innerHTML = "Servidores ativos (" + ok.length + ")";

    document.getElementById("kpi_alerta").innerHTML = alerta.length;
    document.getElementById("kpi_alerta_pct").innerHTML = pct(alerta.length, total);
    document.getElementById("barra_alerta").style.width = pct(alerta.length, total);
    document.getElementById("lbl_alerta").innerHTML = "Servidores em alerta (" + alerta.length + ")";

    document.getElementById("kpi_critico").innerHTML = critico.length;
    document.getElementById("kpi_critico_pct").innerHTML = pct(critico.length, total);
    document.getElementById("barra_critico").style.width = pct(critico.length, total);
    document.getElementById("lbl_critico").innerHTML = (critico.length === 1 ? "Servidor crítico (" : "Servidores críticos (") + critico.length + ")";

    chips("chips_ok", ok);
    chips("chips_alerta", alerta);
    chips("chips_critico", critico);
}

function chips(idDiv, lista) {
    var html = "";
    lista.forEach(function (s) {
        var nomeSeguro = escaparHtml(s.nome);
        html += '<button class="chip" onclick="buscarServidor(\'' + nomeSeguro + '\')">' + nomeSeguro + '</button>';
    });
    document.getElementById(idDiv).innerHTML = html;
}

function buscarServidor(nome) {
    document.getElementById("ipt_busca").value = nome;
    document.getElementById("slt_status").value = "";
    document.getElementById("slt_tipo").value = "";
    paginaAtual = 1;
    renderTabela();
    document.getElementById("tabela").scrollIntoView({ behavior: "smooth" });
}

function filtrarStatus(status) {
    document.getElementById("slt_status").value = status;
    document.getElementById("ipt_busca").value = "";
    document.getElementById("slt_tipo").value = "";
    paginaAtual = 1;
    renderTabela();
}

// ===== TABELA =====
function valorOrdenacao(v) {
    return (v === null || v === undefined || isNaN(Number(v))) ? -1 : Number(v);
}

function listaFiltrada() {
    var busca = document.getElementById("ipt_busca").value.trim().toLowerCase();
    var tipo = document.getElementById("slt_tipo").value;
    var status = document.getElementById("slt_status").value;
    var ordem = document.getElementById("slt_ordem").value;

    var lista = servidores.filter(function (s) {
        var tipoInfo = obterTipoConfig(s.tipo);
        var textoBusca = (
            (s.nome || "") + " " +
            (s.ip || "") + " " +
            (s.nome_praca || "") + " " +
            (s.rodovia || "") + " " +
            tipoInfo.texto
        ).toLowerCase();

        return (busca === "" || textoBusca.indexOf(busca) >= 0) &&
            (tipo === "" || s.tipo === tipo) &&
            (status === "" || s.status === status);
    });

    lista.sort(function (a, b) {
        if (ordem === "nome") return a.nome.localeCompare(b.nome) || a.ip.localeCompare(b.ip);
        if (ordem === "nome-desc") return b.nome.localeCompare(a.nome) || b.ip.localeCompare(a.ip);
        if (ordem === "cpu") return valorOrdenacao(b.cpu) - valorOrdenacao(a.cpu);
        if (ordem === "ram") return valorOrdenacao(b.ram) - valorOrdenacao(a.ram);
        if (ordem === "disco") return valorOrdenacao(b.disco) - valorOrdenacao(a.disco);
        if (ordem === "gravidade") return obterStatusConfig(b.status).peso - obterStatusConfig(a.status).peso;
        return 0;
    });

    return lista;
}

function abrirDashboard(idServidor) {
    window.location.href = "/dashboard?id=" + encodeURIComponent(idServidor);
}

function renderTabela() {
    var lista = listaFiltrada();
    var total = lista.length;
    var paginas = Math.max(1, Math.ceil(total / TAMANHO_PAGINA));
    if (paginaAtual > paginas) paginaAtual = 1;

    var inicio = (paginaAtual - 1) * TAMANHO_PAGINA;
    var fatia = lista.slice(inicio, inicio + TAMANHO_PAGINA);

    var html = "";

    if (fatia.length === 0) {
        var msgVazio = servidores.length === 0
            ? "Nenhum servidor cadastrado no banco de dados."
            : "Nenhum servidor encontrado com os filtros atuais.";
        html = '<tr><td colspan="9" class="vazio">' + msgVazio + '</td></tr>';
    }

    fatia.forEach(function (s) {
        var tipo = obterTipoConfig(s.tipo);
        var st = obterStatusConfig(s.status);
        var semResposta = s.status === "critico" || !s.ultima_comunicacao;
        var pracaTexto = s.nome_praca
            ? escaparHtml(s.nome_praca) + (s.rodovia ? " • " + escaparHtml(s.rodovia) : "")
            : "";

        html += '<tr>' +
            '<td><div class="celula-nome"><span class="icone-srv ' + (semResposta ? "critico" : "") + '"><img src="' + ICONES + 'ICON-SERVIDORES.svg" alt="" class="ico"></span><strong>' + escaparHtml(s.nome) + '</strong></div></td>' +
            '<td><div class="mono">' + escaparHtml(s.ip) + '</div>' + (pracaTexto ? '<small style="color:#64748b;font-size:11.5px;">' + pracaTexto + '</small>' : '') + '</td>' +
            '<td><span class="tag-tipo ' + tipo.cor + '"><img src="' + ICONES + tipo.icone + '" alt="" class="ico mini">' + escaparHtml(tipo.texto) + '</span></td>' +
            '<td><span class="status ' + st.classe + '"><i></i>' + st.texto + '</span></td>' +
            '<td class="mono ' + nivelUso(s.cpu) + '">' + formatarPercentual(s.cpu) + '</td>' +
            '<td class="mono ' + nivelUso(s.ram) + '">' + formatarPercentual(s.ram) + '</td>' +
            '<td class="mono ' + nivelUso(s.disco) + '">' + formatarPercentual(s.disco) + '</td>' +
            '<td class="mono comunicacao ' + (semResposta ? "offline" : "") + '"><i></i>' + escaparHtml(formatarComunicacao(s.ultima_comunicacao)) + '</td>' +
            '<td class="acoes"><button class="btn-icone" onclick="abrirDashboard(' + Number(s.id) + ')" aria-label="Ver detalhes de ' + escaparHtml(s.nome) + '"><img src="' + ICONES + 'ICON-OLHO.svg" alt="" class="ico"></button></td>' +
            '</tr>';
    });

    document.getElementById("corpo_tabela").innerHTML = html;
    document.getElementById("contador_tabela").innerHTML = total + " de " + servidores.length;

    var de = total === 0 ? 0 : inicio + 1;
    var ate = inicio + fatia.length;
    document.getElementById("info_registros").innerHTML =
        "Exibindo <b>" + de + "</b> a <b>" + ate + "</b> de <b>" + total + "</b> registros";

    renderPaginacao(paginas);
}

function renderPaginacao(paginas) {
    var html = '<button ' + (paginaAtual === 1 ? "disabled" : "") + ' onclick="irParaPagina(' + (paginaAtual - 1) + ')">Anterior</button>';
    for (var i = 1; i <= paginas; i++) {
        html += '<button class="' + (i === paginaAtual ? "atual" : "") + '" onclick="irParaPagina(' + i + ')">' + i + '</button>';
    }
    html += '<button ' + (paginaAtual === paginas ? "disabled" : "") + ' onclick="irParaPagina(' + (paginaAtual + 1) + ')">Próxima</button>';
    document.getElementById("paginacao").innerHTML = html;
}

function irParaPagina(n) {
    paginaAtual = n;
    renderTabela();
}

function recarregar() {
    document.getElementById("ipt_busca").value = "";
    document.getElementById("slt_tipo").value = "";
    document.getElementById("slt_status").value = "";
    document.getElementById("slt_ordem").value = "nome";
    paginaAtual = 1;
    carregarDadosOverview(true);
}

// ===== ALERTAS =====
function renderAlertas() {
    var html = "";

    if (alertas.length === 0) {
        html = '<div class="alerta-item"><div class="alerta-corpo"><p>Nenhum alerta registrado no banco de dados até o momento.</p></div></div>';
    }

    alertas.forEach(function (a) {
        var iconeArquivo = iconePorComponente(a.componente, a.nivel);
        var icone = iconeArquivo
            ? '<img src="' + ICONES + iconeArquivo + '" alt="" class="ico">'
            : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>';

        var titulo = a.servidor_nome +
            (a.nome_praca ? " • " + a.nome_praca : "") +
            (a.rodovia ? " (" + a.rodovia + ")" : "");

        var detalheValor = "";
        if (a.valor !== null && a.valor !== undefined && !isNaN(Number(a.valor))) {
            var unidade = "";
            var tipoMet = String(a.tipo_metrica || "").toLowerCase();
            if (tipoMet.indexOf("celsius") >= 0) unidade = "°C";
            else if (tipoMet.indexOf("%") >= 0) unidade = "%";
            else if (tipoMet.indexOf("ms") >= 0) unidade = " ms";
            detalheValor = " — Leitura: " + Number(a.valor).toFixed(1) + unidade;
        }

        html += '<div class="alerta-item ' + (a.lido ? "lido" : "") + '">' +
            '<span class="alerta-icone ' + a.nivel + '">' + icone + '</span>' +
            '<div class="alerta-corpo">' +
            '<div class="alerta-linha"><strong>' + escaparHtml(titulo) + '</strong><span class="selo ' + a.nivel + '">' + (ROTULO_NIVEL[a.nivel] || a.categoria) + '</span>' +
            '<span class="mono ip">' + escaparHtml(a.ip) + '</span></div>' +
            '<p>' + escaparHtml(a.descricao) + escaparHtml(detalheValor) + '</p>' +
            '<small><img src="' + ICONES + 'ICON-RELOGIO.svg" alt="" class="ico mini">' + escaparHtml(formatarTempoAlerta(a)) + '</small>' +
            '</div>' +
            '<button class="btn-detalhes" onclick="abrirDashboard(' + Number(a.id_servidor) + ')">Ver Detalhes</button>' +
            '</div>';
    });

    document.getElementById("lista_alertas").innerHTML = html;

    var naoLidos = alertas.filter(function (a) { return !a.lido; }).length;
    document.getElementById("contador_alertas").innerHTML = naoLidos + (naoLidos === 1 ? " evento" : " eventos");

    var btnVerTodos = document.getElementById("btn_ver_todos_alertas");
    if (btnVerTodos) {
        btnVerTodos.textContent = mostrarTodosAlertas ? "Mostrar recentes ↑" : "Ver todos os alertas →";
    }
}

function alternarTodosAlertas(event) {
    if (event) event.preventDefault();
    mostrarTodosAlertas = !mostrarTodosAlertas;
    carregarDadosOverview(false);
}

function marcarLidos() {
    var lidos = obterIdsAlertasLidos();
    alertas.forEach(function (a) {
        a.lido = true;
        if (lidos.indexOf(a.id) === -1) {
            lidos.push(a.id);
        }
    });
    salvarIdsAlertasLidos(lidos);
    renderAlertas();
}

function alternarMenu() {
    var sidebar = document.querySelector(".sidebar");
    var fundo = document.getElementById("menu_fundo");
    var botao = document.getElementById("menu_hamburguer");

    sidebar.classList.toggle("menu-aberta");
    fundo.classList.toggle("ativo");

    var aberto = sidebar.classList.contains("menu-aberta");

    botao.setAttribute("aria-expanded", aberto);
    botao.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");

    document.body.classList.toggle("menu-aberto", aberto);
}

function sair() {
    try { sessionStorage.clear(); } catch (e) { }
    window.location = "/login";
}

// ===== INÍCIO =====
(function inicializarOverview() {
    var idUsuario = null;
    try {
        idUsuario = sessionStorage.getItem("ID_USUARIO") || sessionStorage.ID_USUARIO;
    } catch (e) { }

    if (!idUsuario) {
        window.location.replace("login.html");
        return;
    }

    preencherDadosOperador();
    carregarDadosOverview(true);
    setInterval(function () { carregarDadosOverview(false); }, 15000);
})();

// ===== MODAL DE CHAMADOS JIRA =====
function popularServidoresModal(servidorSelecionado) {
    var slt = document.getElementById("ipt_chamado_servidor");
    if (!slt) return;

    function renderizarOptions(lista) {
        var valorAtual = servidorSelecionado || slt.value;
        var html = '<option value="" disabled ' + (!valorAtual ? "selected" : "") + '>Selecione o servidor...</option>';

        lista.forEach(function (s) {
            var idServidor = s.id;
            var nomeExibicao = s.nome || ("Servidor #" + s.id + (s.nome_praca ? " - " + s.nome_praca : ""));
            var selected = (valorAtual == idServidor || valorAtual === s.nome || valorAtual === nomeExibicao) ? "selected" : "";
            var tipoDesc = obterTipoConfig(s.tipo).texto;
            var pracaDesc = s.nome_praca ? " • " + s.nome_praca : "";
            var label = nomeExibicao + " (" + (s.ip || "Sem IP") + pracaDesc + (tipoDesc ? " - " + tipoDesc : "") + ")";
            html += '<option value="' + idServidor + '" data-nome="' + escaparHtml(nomeExibicao) + '" ' + selected + '>' + escaparHtml(label) + '</option>';
        });

        slt.innerHTML = html;
    }

    if (servidores.length > 0) {
        renderizarOptions(servidores);
        return;
    }

    var paramsFallback = obterParametrosEscopo();
    var urlFallback = API_BASE + "/monitoramento/overview" + (paramsFallback.toString() ? "?" + paramsFallback.toString() : "");

    fetch(urlFallback)
        .then(function (res) {
            if (res.ok) return res.json();
            throw new Error("Falha ao buscar servidores do banco");
        })
        .then(function (dadosBanco) {
            var lista = dadosBanco && Array.isArray(dadosBanco.servidores) ? dadosBanco.servidores : [];
            renderizarOptions(lista);
        })
        .catch(function () {
            renderizarOptions([]);
        });
}

function abrirModalChamado(servidorNome) {
    popularServidoresModal(servidorNome);

    var modal = document.getElementById("modal_chamado");
    var feedback = document.getElementById("modal_feedback");
    if (feedback) feedback.style.display = "none";

    if (modal) {
        modal.classList.add("ativo");
        document.body.classList.add("menu-aberto");
    }

    if (servidorNome) {
        var iptResumo = document.getElementById("ipt_chamado_resumo");
        if (iptResumo && !iptResumo.value) {
            iptResumo.value = "Incidente reportado no servidor " + servidorNome;
        }
    }
}

function fecharModalChamado() {
    var modal = document.getElementById("modal_chamado");
    if (modal) {
        modal.classList.remove("ativo");
        document.body.classList.remove("menu-aberto");
    }
}

function fecharModalChamadoPorOverlay(e) {
    if (e.target && e.target.id === "modal_chamado") {
        fecharModalChamado();
    }
}

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.keyCode === 27) {
        fecharModalChamado();
    }
});

function exibirFeedbackModal(tipo, htmlConteudo) {
    var feedback = document.getElementById("modal_feedback");
    if (!feedback) return;

    feedback.className = "modal-feedback " + (tipo === "sucesso" ? "sucesso" : "erro");
    feedback.innerHTML = htmlConteudo;
    feedback.style.display = "block";
}

function enviarChamado(event) {
    if (event) event.preventDefault();

    var sltServidor = document.getElementById("ipt_chamado_servidor");
    var sltMotivo = document.getElementById("slt_chamado_motivo");
    var iptResumo = document.getElementById("ipt_chamado_resumo");
    var txtDescricao = document.getElementById("txt_chamado_descricao");

    var idServidor = sltServidor ? sltServidor.value : "";
    var servidorTexto = (sltServidor && sltServidor.selectedOptions && sltServidor.selectedOptions[0])
        ? (sltServidor.selectedOptions[0].getAttribute("data-nome") || sltServidor.selectedOptions[0].text)
        : idServidor;

    var motivo = sltMotivo ? sltMotivo.value : "";
    var resumo = iptResumo ? iptResumo.value.trim() : "";
    var descricao = txtDescricao ? txtDescricao.value.trim() : "";

    var idUsuario = null;
    try {
        idUsuario = sessionStorage.getItem("ID_USUARIO") || sessionStorage.ID_USUARIO;
    } catch (e) { }

    if (!idServidor) {
        exibirFeedbackModal("erro", "Por favor, selecione o servidor afetado.");
        return;
    }

    if (!motivo) {
        exibirFeedbackModal("erro", "Por favor, selecione o motivo da solicitação.");
        return;
    }

    if (!resumo) {
        exibirFeedbackModal("erro", "Por favor, informe o resumo do chamado.");
        return;
    }

    if (!idUsuario) {
        exibirFeedbackModal("erro", "Usuário não autenticado. Por favor, realize o login novamente para abrir um chamado.");
        return;
    }

    var btn = document.getElementById("btn_enviar_chamado");
    var txtBtn = document.getElementById("btn_chamado_texto");
    var spBtn = document.getElementById("btn_chamado_spinner");
    var feedback = document.getElementById("modal_feedback");

    if (feedback) feedback.style.display = "none";
    if (btn) btn.disabled = true;
    if (txtBtn) txtBtn.innerText = "Criando chamado...";
    if (spBtn) spBtn.style.display = "inline-block";

    fetch(API_BASE + "/chamados/abrir", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            servidor: servidorTexto,
            fkServidor: idServidor,
            fkUsuario: idUsuario,
            motivo: motivo,
            resumo: resumo,
            descricao: descricao
        })
    })
        .then(function (res) {
            return res.json().then(function (dados) {
                return { ok: res.ok, status: res.status, dados: dados };
            });
        })
        .then(function (resultado) {
            if (btn) btn.disabled = false;
            if (txtBtn) txtBtn.innerText = "Criar Chamado no Jira";
            if (spBtn) spBtn.style.display = "none";

            if (resultado.ok && resultado.dados.sucesso) {
                var chave = resultado.dados.chave;
                var link = resultado.dados.link;
                var msgSucesso = "Chamado <strong>" + chave + "</strong> aberto com sucesso no Jira e salvo no banco!<br>" +
                    '<a href="' + link + '" target="_blank" rel="noopener noreferrer" class="link-jira">' +
                    'Acessar chamado no Jira &rarr;</a>';

                if (resultado.dados.aviso) {
                    msgSucesso = "Chamado <strong>" + chave + "</strong> aberto no Jira!<br>" +
                        '<small style="color: #f39c12;">(' + resultado.dados.aviso + ')</small><br>' +
                        '<a href="' + link + '" target="_blank" rel="noopener noreferrer" class="link-jira">' +
                        'Acessar chamado no Jira &rarr;</a>';
                }

                exibirFeedbackModal("sucesso", msgSucesso);

                var form = document.getElementById("form_chamado");
                if (form) form.reset();
                if (sltServidor) sltServidor.value = "";
                if (sltMotivo) sltMotivo.value = "";
            } else {
                var msg = (resultado.dados && resultado.dados.mensagem) ? resultado.dados.mensagem : "Não foi possível abrir o chamado.";
                exibirFeedbackModal("erro", msg);
            }
        })
        .catch(function (erro) {
            if (btn) btn.disabled = false;
            if (txtBtn) txtBtn.innerText = "Criar Chamado no Jira";
            if (spBtn) spBtn.style.display = "none";
            console.error("Erro na comunicação:", erro);
            exibirFeedbackModal("erro", "Erro de conexão ao tentar enviar o chamado. Verifique se o servidor backend está rodando.");
        });
}

// Exportar no escopo global para garantir compatibilidade
window.abrirModalChamado = abrirModalChamado;
window.fecharModalChamado = fecharModalChamado;
window.fecharModalChamadoPorOverlay = fecharModalChamadoPorOverlay;
window.enviarChamado = enviarChamado;

// Aliases para prevenir variações de chamada
window.abrirChamadoModal = abrirModalChamado;
window.abrirChamadoModel = abrirModalChamado;
window.abrirChamado = abrirModalChamado;
