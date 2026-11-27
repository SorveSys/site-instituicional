var database = require("../database/config");

function inteiroPositivo(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return null;
    }
    var n = Number(valor);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function extrairIdUsuario(req) {
    return (
        inteiroPositivo(req.headers["x-usuario-id"]) ||
        inteiroPositivo(req.query && req.query.idUsuario) ||
        inteiroPositivo(req.body && req.body.idUsuario)
    );
}

function buscarContextoUsuarioPorId(idUsuario) {
    var instrucaoSql = `
        SELECT
            u.id,
            u.nome,
            u.email,
            COALESCE(u.fk_empresa, con.fk_empresa) AS fk_empresa,
            u.fk_empresa AS fk_empresa_direta,
            u.fk_concessionaria,
            u.fk_tipo_usuario,
            p.tipo AS perfil,
            e.nome_fantasia,
            e.razao_social,
            e.cnpj,
            con.nome_praca
        FROM usuario AS u
        LEFT JOIN perfil AS p ON u.fk_tipo_usuario = p.id
        LEFT JOIN concessionaria AS con ON u.fk_concessionaria = con.id
        LEFT JOIN empresa AS e ON COALESCE(u.fk_empresa, con.fk_empresa) = e.id
        WHERE u.id = ?
        LIMIT 1;
    `;

    return database.executar(instrucaoSql, [idUsuario]).then(function (linhas) {
        if (!linhas || linhas.length === 0) {
            return null;
        }

        var u = linhas[0];
        var perfil = u.perfil || "";

        return {
            id: Number(u.id),
            nome: u.nome,
            email: u.email,
            fk_empresa: u.fk_empresa ? Number(u.fk_empresa) : null,
            fk_empresa_direta: u.fk_empresa_direta ? Number(u.fk_empresa_direta) : null,
            fk_concessionaria: u.fk_concessionaria ? Number(u.fk_concessionaria) : null,
            fk_tipo_usuario: Number(u.fk_tipo_usuario),
            perfil: perfil,
            ehGestor: String(perfil).toLowerCase() === "gestor",
            nome_fantasia: u.nome_fantasia || "",
            razao_social: u.razao_social || "",
            cnpj: u.cnpj || "",
            nome_praca: u.nome_praca || null
        };
    });
}

function obterContextoUsuario(req) {
    var idUsuario = extrairIdUsuario(req);
    if (!idUsuario) {
        return Promise.resolve(null);
    }
    return buscarContextoUsuarioPorId(idUsuario);
}

function exigirUsuarioAutenticado(req, res, next) {
    obterContextoUsuario(req)
        .then(function (ctx) {
            if (!ctx) {
                return res.status(401).json({
                    mensagem: "Usuário não autenticado ou sessão inválida. Faça login novamente."
                });
            }

            req.usuarioContexto = ctx;
            return next();
        })
        .catch(function (erro) {
            console.error("Erro ao validar permissões do usuário:", erro);
            return res.status(500).json({
                mensagem: "Erro ao validar permissões do usuário."
            });
        });
}

function exigirGestor(req, res, next) {
    var ctx = req.usuarioContexto;
    if (!ctx) {
        return res.status(401).json({
            mensagem: "Usuário não autenticado."
        });
    }

    if (!ctx.ehGestor) {
        return res.status(403).json({
            mensagem: "Permissão negada. Apenas usuários com perfil Gestor podem realizar esta operação."
        });
    }

    return next();
}

function concessionariaNoEscopo(ctx, concessionaria) {
    if (!ctx || !concessionaria) {
        return false;
    }

    if (ctx.fk_concessionaria) {
        return Number(concessionaria.id) === ctx.fk_concessionaria;
    }

    if (ctx.fk_empresa) {
        return Number(concessionaria.fk_empresa) === ctx.fk_empresa;
    }

    return false;
}

function usuarioNoEscopo(ctx, usuarioAlvo) {
    if (!ctx || !usuarioAlvo) {
        return false;
    }

    if (ctx.fk_concessionaria) {
        return (
            usuarioAlvo.fk_concessionaria !== null &&
            usuarioAlvo.fk_concessionaria !== undefined &&
            Number(usuarioAlvo.fk_concessionaria) === ctx.fk_concessionaria
        );
    }

    if (ctx.fk_empresa) {
        return (
            usuarioAlvo.fk_empresa !== null &&
            usuarioAlvo.fk_empresa !== undefined &&
            Number(usuarioAlvo.fk_empresa) === ctx.fk_empresa
        );
    }

    return false;
}

module.exports = {
    inteiroPositivo,
    extrairIdUsuario,
    buscarContextoUsuarioPorId,
    obterContextoUsuario,
    exigirUsuarioAutenticado,
    exigirGestor,
    concessionariaNoEscopo,
    usuarioNoEscopo
};
