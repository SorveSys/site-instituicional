var database = require("../database/config");

function autenticar(email, senha) {
    var instrucaoSql = `
        SELECT
            u.id,
            u.nome,
            u.email,
            COALESCE(u.fk_empresa, con.fk_empresa) AS fk_empresa,
            u.fk_concessionaria,
            u.fk_tipo_usuario,
            p.tipo AS perfil,
            e.razao_social,
            e.nome_fantasia,
            con.nome_praca
        FROM usuario AS u
        LEFT JOIN perfil AS p ON u.fk_tipo_usuario = p.id
        LEFT JOIN concessionaria AS con ON u.fk_concessionaria = con.id
        LEFT JOIN empresa AS e ON COALESCE(u.fk_empresa, con.fk_empresa) = e.id
        WHERE u.email = ? AND u.senha = ?;
    `;

    return database.executar(instrucaoSql, [email, senha]);
}

function cadastrar(nome, email, senha, fkEmpresa, fkTipoUsuario, fkConcessionaria) {
    var instrucaoSql = `
        INSERT INTO usuario
            (nome, email, senha, fk_empresa, fk_concessionaria, fk_tipo_usuario)
        VALUES (?, ?, ?, ?, ?, ?);
    `;

    return database.executar(instrucaoSql, [
        nome,
        email,
        senha,
        fkEmpresa || null,
        fkConcessionaria || null,
        fkTipoUsuario
    ]);
}

function buscarPorEmail(email) {
    var instrucaoSql = `
        SELECT id, nome, email, fk_empresa, fk_concessionaria, fk_tipo_usuario
        FROM usuario
        WHERE email = ?;
    `;

    return database.executar(instrucaoSql, [email]);
}

function buscarPorId(id) {
    var instrucaoSql = `
        SELECT
            u.id,
            u.nome,
            u.email,
            COALESCE(u.fk_empresa, con.fk_empresa) AS fk_empresa,
            u.fk_concessionaria,
            u.fk_tipo_usuario,
            p.tipo AS perfil,
            e.razao_social,
            e.nome_fantasia,
            con.nome_praca,
            con.rodovia,
            con.cidade,
            con.uf
        FROM usuario AS u
        LEFT JOIN perfil AS p ON u.fk_tipo_usuario = p.id
        LEFT JOIN concessionaria AS con ON u.fk_concessionaria = con.id
        LEFT JOIN empresa AS e ON COALESCE(u.fk_empresa, con.fk_empresa) = e.id
        WHERE u.id = ?
        LIMIT 1;
    `;

    return database.executar(instrucaoSql, [Number(id)]);
}

function buscarPerfilPorId(idPerfil) {
    var instrucaoSql = `
        SELECT id, tipo
        FROM perfil
        WHERE id = ?
        LIMIT 1;
    `;

    return database.executar(instrucaoSql, [Number(idPerfil)]);
}

function listarPerfis() {
    var instrucaoSql = `
        SELECT id, tipo
        FROM perfil
        ORDER BY id ASC;
    `;

    return database.executar(instrucaoSql);
}

function listarPorEmpresa(fkEmpresa) {
    var instrucaoSql = `
        SELECT
            u.id,
            u.nome,
            u.email,
            COALESCE(u.fk_empresa, con.fk_empresa) AS fk_empresa,
            u.fk_concessionaria,
            u.fk_tipo_usuario,
            p.tipo AS perfil,
            e.nome_fantasia,
            e.razao_social,
            con.nome_praca,
            con.rodovia,
            con.cidade,
            con.uf
        FROM usuario AS u
        LEFT JOIN perfil AS p ON u.fk_tipo_usuario = p.id
        LEFT JOIN concessionaria AS con ON u.fk_concessionaria = con.id
        LEFT JOIN empresa AS e ON COALESCE(u.fk_empresa, con.fk_empresa) = e.id
        WHERE COALESCE(u.fk_empresa, con.fk_empresa) = ?
        ORDER BY u.id ASC;
    `;

    return database.executar(instrucaoSql, [Number(fkEmpresa)]);
}

function listarPorEscopo(ctx) {
    var condicao = "";
    var valores = [];

    if (ctx && ctx.fk_concessionaria) {
        condicao = "WHERE u.fk_concessionaria = ?";
        valores.push(Number(ctx.fk_concessionaria));
    } else if (ctx && ctx.fk_empresa) {
        condicao = "WHERE COALESCE(u.fk_empresa, con.fk_empresa) = ?";
        valores.push(Number(ctx.fk_empresa));
    } else {
        return Promise.resolve([]);
    }

    var instrucaoSql = `
        SELECT
            u.id,
            u.nome,
            u.email,
            COALESCE(u.fk_empresa, con.fk_empresa) AS fk_empresa,
            u.fk_concessionaria,
            u.fk_tipo_usuario,
            p.tipo AS perfil,
            e.nome_fantasia,
            e.razao_social,
            con.nome_praca,
            con.rodovia,
            con.cidade,
            con.uf
        FROM usuario AS u
        LEFT JOIN perfil AS p ON u.fk_tipo_usuario = p.id
        LEFT JOIN concessionaria AS con ON u.fk_concessionaria = con.id
        LEFT JOIN empresa AS e ON COALESCE(u.fk_empresa, con.fk_empresa) = e.id
        ${condicao}
        ORDER BY u.id ASC;
    `;

    return database.executar(instrucaoSql, valores);
}

function atualizar(id, nome, email, fkEmpresa, fkConcessionaria, fkTipoUsuario, novaSenha) {
    if (novaSenha) {
        var sqlComSenha = `
            UPDATE usuario
            SET nome = ?,
                email = ?,
                fk_empresa = ?,
                fk_concessionaria = ?,
                fk_tipo_usuario = ?,
                senha = ?
            WHERE id = ?;
        `;

        return database.executar(sqlComSenha, [
            nome,
            email,
            fkEmpresa || null,
            fkConcessionaria || null,
            Number(fkTipoUsuario),
            novaSenha,
            Number(id)
        ]);
    }

    var sqlSemSenha = `
        UPDATE usuario
        SET nome = ?,
            email = ?,
            fk_empresa = ?,
            fk_concessionaria = ?,
            fk_tipo_usuario = ?
        WHERE id = ?;
    `;

    return database.executar(sqlSemSenha, [
        nome,
        email,
        fkEmpresa || null,
        fkConcessionaria || null,
        Number(fkTipoUsuario),
        Number(id)
    ]);
}

function contarChamadosPorUsuario(id) {
    var instrucaoSql = `
        SELECT COUNT(*) AS total
        FROM chamado
        WHERE fk_usuario = ?;
    `;

    return database.executar(instrucaoSql, [Number(id)]);
}

function excluir(id) {
    var instrucaoSql = `
        DELETE FROM usuario
        WHERE id = ?;
    `;

    return database.executar(instrucaoSql, [Number(id)]);
}

module.exports = {
    autenticar,
    cadastrar,
    buscarPorEmail,
    buscarPorId,
    buscarPerfilPorId,
    listarPerfis,
    listarPorEmpresa,
    listarPorEscopo,
    atualizar,
    contarChamadosPorUsuario,
    excluir
};
