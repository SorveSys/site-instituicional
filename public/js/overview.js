var ICONES = "./assets/icons/overview/";

var servidores = [
    { id: 3, nome: "SRV-AU03", ip: "192.168.10.47", tipo: "armazenamento", status: "atencao", cpu: 52.4, ram: 72.8, disco: 87.4, comunicacao: "Há 18s" },
    { id: 3, nome: "SRV-AU04", ip: "192.168.10.99", tipo: "armazenamento", status: "operacional", cpu: 19.8, ram: 33.5, disco: 58.2, comunicacao: "Há 15s" },
    { id: 3, nome: "SRV-GW04", ip: "192.168.10.48", tipo: "armazenamento", status: "critico", cpu: 96.2, ram: 91.5, disco: 79.0, comunicacao: "Sem resposta (8m)" },
    { id: 2, nome: "SRV-PG01", ip: "192.168.10.20", tipo: "pagamento", status: "operacional", cpu: 28.5, ram: 44.0, disco: 31.8, comunicacao: "Há 2s" },
    { id: 2, nome: "SRV-PG02", ip: "192.168.10.22", tipo: "pagamento", status: "operacional", cpu: 34.0, ram: 51.3, disco: 18.9, comunicacao: "Há 6s" },
    { id: 2, nome: "SRV-PG03", ip: "192.168.10.25", tipo: "pagamento", status: "operacional", cpu: 31.7, ram: 48.2, disco: 36.5, comunicacao: "Há 5s" },
    { id: 1, nome: "SRV-TR01", ip: "192.168.10.12", tipo: "captura", status: "operacional", cpu: 41.2, ram: 38.6, disco: 22.4, comunicacao: "Há 12s" },
    { id: 1, nome: "SRV-TR02", ip: "192.168.10.14", tipo: "captura", status: "atencao", cpu: 78.9, ram: 64.2, disco: 45.1, comunicacao: "Há 4s" },
];

var alertas = [
    { nivel: "critico", icone: "ICON-WIFIOUT.svg", titulo: "SRV-GW04 • Gateway Edge ANTT", ip: "192.168.10.48", msg: "Servidor sem comunicação", tempo: "Há 8 minutos (14:32:10)", lido: false },
    { nivel: "atencao", icone: "ICON-ARMAZENAMENTO.svg", titulo: "SRV-AU03 • Auditoria / Logs ANTT", ip: "192.168.10.47", msg: "Volume NVMe Storage em 87.4%", tempo: "Há 24 minutos (14:16:04)", lido: false },
    { nivel: "atencao", icone: "ICON-CPU.svg", titulo: "SRV-TR02 • Pista Free-Flow Pórtico 09", ip: "192.168.10.14", msg: "Pico de Processamento de OCR (78.9% CPU)", tempo: "Há 41 minutos (13:59:12)", lido: false },
    { nivel: "resolvido", icone: null, titulo: "SRV-PG01 • TEF & Validador de TAGs", ip: "192.168.10.20", msg: "Comutação de Link de Fibra Concluída", tempo: "Há 1 hora e 15 minutos (13:25:40)", lido: false }
];

var TIPOS = {
    armazenamento: { texto: "Armazenamento para auditoria", icone: "ICON-ARMAZENAMENTO.svg", cor: "azul" },
    pagamento: { texto: "Processamento de pagamentos", icone: "ICON-PAGAMENTO.svg", cor: "azul" },
    captura: { texto: "Captura de informações", icone: "ICON-CAMERA.svg", cor: "laranja" }
};

var STATUS = {
    operacional: { texto: "Operacional", classe: "ok", peso: 0 },
    atencao: { texto: "Atenção", classe: "alerta", peso: 1 },
    critico: { texto: "Crítico", classe: "critico", peso: 2 }
};

var TAMANHO_PAGINA = 10;
var paginaAtual = 1;

function nivelUso(valor) {
    if (valor >= 85) return "uso-critico";
    if (valor >= 70) return "uso-alerta";
    return "uso-ok";
}

function pct(valor, total) {
    if (total == 0) return "0%";
    return (valor / total * 100).toFixed(1) + "%";
}

function pad(n) {
    return n < 10 ? "0" + n : "" + n;
}

function atualizarHora() {
    var d = new Date();
    document.getElementById("hora_atualizado").innerHTML = pad(d.getHours()) + ":" + pad(d.getMinutes());
}

// ===== KPIs =====
function renderKpis() {
    var total = servidores.length;
    var ok = servidores.filter(function (s) { return s.status == "operacional"; });
    var alerta = servidores.filter(function (s) { return s.status == "atencao"; });
    var critico = servidores.filter(function (s) { return s.status == "critico"; });

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
    document.getElementById("lbl_critico").innerHTML = (critico.length == 1 ? "Servidor crítico (" : "Servidores críticos (") + critico.length + ")";

    chips("chips_ok", ok);
    chips("chips_alerta", alerta);
    chips("chips_critico", critico);
}

function chips(idDiv, lista) {
    var html = "";
    lista.forEach(function (s) {
        html += '<button class="chip" onclick="buscarServidor(\'' + s.nome + '\')">' + s.nome + '</button>';
    });
    document.getElementById(idDiv).innerHTML = html;
}

function buscarServidor(nome) {
    document.getElementById("ipt_busca").value = nome;
    document.getElementById("slt_status").value = "";
    document.getElementById("slt_tipo").value = "";
    renderTabela();
    document.getElementById("tabela").scrollIntoView({ behavior: "smooth" });
}

function filtrarStatus(status) {
    document.getElementById("slt_status").value = status;
    document.getElementById("ipt_busca").value = "";
    document.getElementById("slt_tipo").value = "";
    renderTabela();
}

// ===== TABELA =====
function listaFiltrada() {
    var busca = document.getElementById("ipt_busca").value.trim().toLowerCase();
    var tipo = document.getElementById("slt_tipo").value;
    var status = document.getElementById("slt_status").value;
    var ordem = document.getElementById("slt_ordem").value;

    var lista = servidores.filter(function (s) {
        var textoBusca = (s.nome + " " + s.ip + " " + TIPOS[s.tipo].texto).toLowerCase();
        return (busca == "" || textoBusca.indexOf(busca) >= 0) &&
            (tipo == "" || s.tipo == tipo) &&
            (status == "" || s.status == status);
    });

    lista.sort(function (a, b) {
        if (ordem == "nome") return a.nome.localeCompare(b.nome) || a.ip.localeCompare(b.ip);
        if (ordem == "nome-desc") return b.nome.localeCompare(a.nome) || b.ip.localeCompare(a.ip);
        if (ordem == "cpu") return b.cpu - a.cpu;
        if (ordem == "ram") return b.ram - a.ram;
        if (ordem == "disco") return b.disco - a.disco;
        if (ordem == "gravidade") return STATUS[b.status].peso - STATUS[a.status].peso;
        return 0;
    });

    return lista;
}

function abrirDashboard(nome) {
    window.location.href = "/dashboard?srv=" + encodeURIComponent(nome);
}

function renderTabela() {
    var lista = listaFiltrada();
    var total = lista.length;
    var paginas = Math.max(1, Math.ceil(total / TAMANHO_PAGINA));
    if (paginaAtual > paginas) paginaAtual = 1;

    var inicio = (paginaAtual - 1) * TAMANHO_PAGINA;
    var fatia = lista.slice(inicio, inicio + TAMANHO_PAGINA);

    var html = "";

    if (fatia.length == 0) {
        html = '<tr><td colspan="9" class="vazio">Nenhum servidor encontrado com os filtros atuais.</td></tr>';
    }

    fatia.forEach(function (s) {
        var tipo = TIPOS[s.tipo];
        var st = STATUS[s.status];
        var semResposta = s.status == "critico";

        html += '<tr>' +
            '<td><div class="celula-nome"><span class="icone-srv ' + (semResposta ? "critico" : "") + '"><img src="' + ICONES + 'ICON-SERVIDORES.svg" alt="" class="ico"></span><strong>' + s.nome + '</strong></div></td>' +
            '<td class="mono">' + s.ip + '</td>' +
            '<td><span class="tag-tipo ' + tipo.cor + '"><img src="' + ICONES + tipo.icone + '" alt="" class="ico mini">' + tipo.texto + '</span></td>' +
            '<td><span class="status ' + st.classe + '"><i></i>' + st.texto + '</span></td>' +
            '<td class="mono ' + nivelUso(s.cpu) + '">' + s.cpu.toFixed(1) + '%</td>' +
            '<td class="mono ' + nivelUso(s.ram) + '">' + s.ram.toFixed(1) + '%</td>' +
            '<td class="mono ' + nivelUso(s.disco) + '">' + s.disco.toFixed(1) + '%</td>' +
            '<td class="mono comunicacao ' + (semResposta ? "offline" : "") + '"><i></i>' + s.comunicacao + '</td>' +
            '<td class="acoes"><button class="btn-icone" onclick="abrirDashboard(\'' + s.nome + '\')" aria-label="Ver detalhes de ' + s.nome + '"><img src="' + ICONES + 'ICON-OLHO.svg" alt="" class="ico"></button></td>' +            '</tr>';
    });

    document.getElementById("corpo_tabela").innerHTML = html;
    document.getElementById("contador_tabela").innerHTML = total + " de " + servidores.length;

    var de = total == 0 ? 0 : inicio + 1;
    var ate = inicio + fatia.length;
    document.getElementById("info_registros").innerHTML =
        "Exibindo <b>" + de + "</b> a <b>" + ate + "</b> de <b>" + total + "</b> registros";

    renderPaginacao(paginas);
}

function renderPaginacao(paginas) {
    var html = '<button ' + (paginaAtual == 1 ? "disabled" : "") + ' onclick="irParaPagina(' + (paginaAtual - 1) + ')">Anterior</button>';
    for (var i = 1; i <= paginas; i++) {
        html += '<button class="' + (i == paginaAtual ? "atual" : "") + '" onclick="irParaPagina(' + i + ')">' + i + '</button>';
    }
    html += '<button ' + (paginaAtual == paginas ? "disabled" : "") + ' onclick="irParaPagina(' + (paginaAtual + 1) + ')">Próxima</button>';
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
    atualizarHora();
    renderKpis();
    renderTabela();
}

var ROTULO_NIVEL = { critico: "Crítico", atencao: "Atenção", resolvido: "Resolvido" };

function renderAlertas() {
    var html = "";

    alertas.forEach(function (a) {
        var icone = a.icone
            ? '<img src="' + ICONES + a.icone + '" alt="" class="ico">'
            : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>';

        html += '<div class="alerta-item ' + (a.lido ? "lido" : "") + '">' +
            '<span class="alerta-icone ' + a.nivel + '">' + icone + '</span>' +
            '<div class="alerta-corpo">' +
            '<div class="alerta-linha"><strong>' + a.titulo + '</strong><span class="selo ' + a.nivel + '">' + ROTULO_NIVEL[a.nivel] + '</span>' +
            '<span class="mono ip">' + a.ip + '</span></div>' +
            '<p>' + a.msg + '</p>' +
            '<small><img src="' + ICONES + 'ICON-RELOGIO.svg" alt="" class="ico mini">' + a.tempo + '</small>' +
            '</div>' +
            '<button class="btn-detalhes">Ver Detalhes</button>' +
            '</div>';
    });

    document.getElementById("lista_alertas").innerHTML = html;

    var naoLidos = alertas.filter(function (a) { return !a.lido; }).length;
    document.getElementById("contador_alertas").innerHTML = naoLidos + (naoLidos == 1 ? " evento" : " eventos");
}

function marcarLidos() {
    alertas.forEach(function (a) { a.lido = true; });
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

try {
    if (sessionStorage.NOME_USUARIO) {
        document.getElementById("nome_operador").innerHTML = sessionStorage.NOME_USUARIO;
    }
} catch (e) { }

// ===== INÍCIO =====
atualizarHora();
setInterval(atualizarHora, 30000);
renderKpis();
renderTabela();
renderAlertas();

// ===== MODAL DE CHAMADOS JIRA =====
function popularServidoresModal(servidorSelecionado) {
    var slt = document.getElementById("ipt_chamado_servidor");
    if (!slt) return;

    var apiBase = window.location.protocol === "file:" ? "http://localhost:3333" : "";

    function renderizarOptions(lista) {
        var valorAtual = servidorSelecionado || slt.value;
        var html = '<option value="" disabled ' + (!valorAtual ? "selected" : "") + '>Selecione o servidor...</option>';

        lista.forEach(function (s) {
            var idServidor = s.id || 1;
            var nomeExibicao = s.nome || ("Servidor #" + s.id + (s.nome_praca ? " - " + s.nome_praca : ""));
            var selected = (valorAtual == idServidor || valorAtual === s.nome || valorAtual === nomeExibicao) ? "selected" : "";
            var tipoDesc = (TIPOS && TIPOS[s.tipo]) ? TIPOS[s.tipo].texto : (s.tipo || "");
            var label = nomeExibicao + " (" + (s.ip || "Sem IP") + (tipoDesc ? " - " + tipoDesc : "") + ")";
            html += '<option value="' + idServidor + '" data-nome="' + nomeExibicao + '" ' + selected + '>' + label + '</option>';
        });

        slt.innerHTML = html;
    }

    fetch(apiBase + "/servidores/listar")
        .then(function (res) {
            if (res.ok) return res.json();
            throw new Error("Falha ao buscar servidores do banco");
        })
        .then(function (dadosBanco) {
            if (Array.isArray(dadosBanco) && dadosBanco.length > 0) {
                renderizarOptions(dadosBanco);
            } else {
                renderizarOptions(servidores);
            }
        })
        .catch(function () {
            renderizarOptions(servidores);
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

    var apiBase = window.location.protocol === "file:" ? "http://localhost:3333" : "";

    fetch(apiBase + "/chamados/abrir", {
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