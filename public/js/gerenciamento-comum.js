var API_BASE = window.location.protocol === "file:" ? "http://localhost:3333" : "";

function escaparHtml(texto) {
    if (texto === null || texto === undefined) return "";
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatarCnpj(cnpj) {
    var d = String(cnpj || "").replace(/\D/g, "");
    if (d.length !== 14) return cnpj || "--";
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatarKm(km) {
    if (km === null || km === undefined || km === "" || isNaN(Number(km))) return "--";
    return Number(km).toFixed(2);
}

function obterSessaoGerenciamento() {
    var idUsuario = sessionStorage.getItem("ID_USUARIO");
    if (!idUsuario) {
        window.location.replace("login.html");
        return null;
    }

    var nome = sessionStorage.getItem("NOME_USUARIO") || "Usuário";
    var email = sessionStorage.getItem("EMAIL_USUARIO") || "";
    var perfil = sessionStorage.getItem("PERFIL_USUARIO") || "";
    var fkTipoUsuario = Number(sessionStorage.getItem("FK_TIPO_USUARIO") || 0);
    var fkEmpresa = sessionStorage.getItem("FK_EMPRESA") ? Number(sessionStorage.getItem("FK_EMPRESA")) : null;
    var fkConcessionaria = sessionStorage.getItem("FK_CONCESSIONARIA") ? Number(sessionStorage.getItem("FK_CONCESSIONARIA")) : null;
    var empresa = sessionStorage.getItem("EMPRESA_USUARIO") || "";
    var nomePraca = sessionStorage.getItem("NOME_PRACA") || "";

    var elNome = document.getElementById("nome_usuario_header");
    if (elNome) {
        elNome.textContent = nome;
    }

    return {
        id: Number(idUsuario),
        nome: nome,
        email: email,
        perfil: perfil,
        fkTipoUsuario: fkTipoUsuario,
        fkEmpresa: fkEmpresa,
        fkConcessionaria: fkConcessionaria,
        empresa: empresa,
        nomePraca: nomePraca,
        ehGestor: String(perfil).toLowerCase() === "gestor" || fkTipoUsuario === 1
    };
}

function apiGerenciamento(caminho, opcoes) {
    var idUsuario = sessionStorage.getItem("ID_USUARIO");
    var cfg = Object.assign({}, opcoes || {});
    var headers = Object.assign({}, cfg.headers || {});

    if (idUsuario) {
        headers["x-usuario-id"] = idUsuario;
    }
    if (cfg.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }
    cfg.headers = headers;

    return fetch(API_BASE + caminho, cfg).then(function (resposta) {
        if (resposta.status === 401) {
            sessionStorage.clear();
            window.location.replace("login.html");
            throw new Error("Sessão expirada. Faça login novamente.");
        }

        return resposta.text().then(function (texto) {
            var dados = null;
            if (texto) {
                try {
                    dados = JSON.parse(texto);
                } catch (e) {
                    dados = texto;
                }
            }

            if (!resposta.ok) {
                var msg = (dados && typeof dados === "object" && dados.mensagem)
                    ? dados.mensagem
                    : (typeof dados === "string" && dados ? dados : "Erro HTTP " + resposta.status);
                throw new Error(msg);
            }

            return dados;
        });
    });
}

function copiarTextoComAviso(texto, rotulo) {
    var label = rotulo || "Texto";
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(function () {
            alert(label + " copiado: " + texto);
        }).catch(function () {
            prompt("Copie abaixo:", texto);
        });
    } else {
        prompt("Copie abaixo:", texto);
    }
}

function exibirFeedbackDrawer(idElemento, tipo, mensagem) {
    var el = document.getElementById(idElemento);
    if (!el) return;
    el.className = "drawer-feedback " + (tipo === "sucesso" ? "sucesso" : "erro");
    el.textContent = mensagem;
}

function limparFeedbackDrawer(idElemento) {
    var el = document.getElementById(idElemento);
    if (!el) return;
    el.className = "drawer-feedback";
    el.textContent = "";
}

function renderizarControlesPaginacao(idContainer, paginaAtual, totalPaginas, nomeFuncao) {
    var container = document.getElementById(idContainer);
    if (!container) return;

    var paginas = Math.max(1, totalPaginas);
    var html = '<button type="button" class="page-btn" ' +
        (paginaAtual <= 1 ? "disabled" : 'onclick="' + nomeFuncao + '(' + (paginaAtual - 1) + ')"') +
        ">Anterior</button>";

    for (var i = 1; i <= paginas; i++) {
        html += '<button type="button" class="page-btn ' + (i === paginaAtual ? "active" : "") +
            '" onclick="' + nomeFuncao + '(' + i + ')">' + i + "</button>";
    }

    html += '<button type="button" class="page-btn" ' +
        (paginaAtual >= paginas ? "disabled" : 'onclick="' + nomeFuncao + '(' + (paginaAtual + 1) + ')"') +
        ">Próxima</button>";

    container.innerHTML = html;
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && typeof window.fecharDrawer === "function") {
        window.fecharDrawer();
    }
});
