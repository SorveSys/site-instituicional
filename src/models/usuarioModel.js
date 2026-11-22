var database = require("../database/config");

function autenticar(email, senha) {
    var instrucaoSql = `
        SELECT
            u.id,
            u.nome,
            u.email,
            COALESCE(u.fk_empresa, c.fk_empresa) AS fk_empresa,
            u.fk_concessionaria,
            u.fk_tipo_usuario,
            p.tipo AS perfil,
            COALESCE(e.razao_social, e_conc.razao_social) AS razao_social,
            COALESCE(e.nome_fantasia, e_conc.nome_fantasia) AS nome_fantasia,
            c.nome_praca AS concessionaria
        FROM usuario AS u
        LEFT JOIN perfil AS p ON u.fk_tipo_usuario = p.id
        LEFT JOIN empresa AS e ON u.fk_empresa = e.id
        LEFT JOIN concessionaria AS c ON u.fk_concessionaria = c.id
        LEFT JOIN empresa AS e_conc ON c.fk_empresa = e_conc.id
        WHERE u.email = ? AND u.senha = ?;
    `;

    return database.executar(instrucaoSql, [email, senha]);
}

function cadastrar(nome, email, senha, fkEmpresa, fkTipoUsuario, fkConcessionaria) {
    var instrucaoSql = `
        INSERT INTO usuario
            (nome, email, senha, fk_empresa, fk_tipo_usuario, fk_concessionaria)
        VALUES (?, ?, ?, ?, ?, ?);
    `;

    return database.executar(instrucaoSql, [
        nome,
        email,
        senha,
        fkEmpresa || null,
        fkTipoUsuario,
        fkConcessionaria || null
    ]);
}

function buscarPorEmail(email) {
    var instrucaoSql = `
        SELECT id, nome, email, fk_empresa, fk_tipo_usuario, fk_concessionaria
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
            COALESCE(u.fk_empresa, c.fk_empresa) AS fk_empresa,
            u.fk_concessionaria,
            u.fk_tipo_usuario,
            p.tipo AS perfil,
            COALESCE(e.nome_fantasia, e.razao_social, e_conc.nome_fantasia, e_conc.razao_social, 'Empresa Matriz') AS nome_empresa,
            COALESCE(c.nome_praca, 'Sede Corporativa') AS nome_concessionaria,
            c.rodovia,
            c.cidade,
            c.uf,
            COALESCE(e.cnpj, e_conc.cnpj) AS cnpj
        FROM usuario AS u
        LEFT JOIN perfil AS p ON u.fk_tipo_usuario = p.id
        LEFT JOIN empresa AS e ON u.fk_empresa = e.id
        LEFT JOIN concessionaria AS c ON u.fk_concessionaria = c.id
        LEFT JOIN empresa AS e_conc ON c.fk_empresa = e_conc.id
        WHERE u.id = ?;
    `;

    return database.executar(instrucaoSql, [id]);
}

function listar() {
    var instrucaoSql = `
        SELECT
            u.id,
            u.nome,
            u.email,
            COALESCE(u.fk_empresa, c.fk_empresa) AS fk_empresa,
            u.fk_concessionaria,
            u.fk_tipo_usuario,
            p.tipo AS perfil,
            COALESCE(e.nome_fantasia, e.razao_social, e_conc.nome_fantasia, e_conc.razao_social, 'Empresa Matriz') AS nome_empresa,
            COALESCE(c.nome_praca, 'Sede Corporativa') AS nome_concessionaria,
            c.rodovia,
            c.cidade,
            c.uf,
            COALESCE(e.cnpj, e_conc.cnpj) AS cnpj
        FROM usuario AS u
        LEFT JOIN perfil AS p ON u.fk_tipo_usuario = p.id
        LEFT JOIN empresa AS e ON u.fk_empresa = e.id
        LEFT JOIN concessionaria AS c ON u.fk_concessionaria = c.id
        LEFT JOIN empresa AS e_conc ON c.fk_empresa = e_conc.id
        ORDER BY u.id DESC;
    `;

    return database.executar(instrucaoSql);
}

function listarPorEmpresa(fkEmpresa) {
    var instrucaoSql = `
        SELECT
            u.id,
            u.nome,
            u.email,
            COALESCE(u.fk_empresa, c.fk_empresa) AS fk_empresa,
            u.fk_concessionaria,
            u.fk_tipo_usuario,
            p.tipo AS perfil,
            COALESCE(e.nome_fantasia, e.razao_social, e_conc.nome_fantasia, e_conc.razao_social, 'Empresa Matriz') AS nome_empresa,
            COALESCE(c.nome_praca, 'Sede Corporativa') AS nome_concessionaria,
            c.rodovia,
            c.cidade,
            c.uf,
            COALESCE(e.cnpj, e_conc.cnpj) AS cnpj
        FROM usuario AS u
        LEFT JOIN perfil AS p ON u.fk_tipo_usuario = p.id
        LEFT JOIN empresa AS e ON u.fk_empresa = e.id
        LEFT JOIN concessionaria AS c ON u.fk_concessionaria = c.id
        LEFT JOIN empresa AS e_conc ON c.fk_empresa = e_conc.id
        WHERE u.fk_empresa = ? OR c.fk_empresa = ?
        ORDER BY u.id DESC;
    `;

    return database.executar(instrucaoSql, [fkEmpresa, fkEmpresa]);
}

function listarPerfis() {
    var instrucaoSql = `
        SELECT id, tipo
        FROM perfil
        ORDER BY id ASC;
    `;

    return database.executar(instrucaoSql);
}

function atualizar(id, nome, email, fkTipoUsuario, fkConcessionaria, novaSenha) {
    var instrucaoSql;
    var params;

    if (novaSenha && String(novaSenha).trim() !== "") {
        instrucaoSql = `
            UPDATE usuario
            SET nome = ?,
                email = ?,
                fk_tipo_usuario = ?,
                fk_concessionaria = ?,
                senha = ?
            WHERE id = ?;
        `;
        params = [nome, email, fkTipoUsuario, fkConcessionaria || null, novaSenha, id];
    } else {
        instrucaoSql = `
            UPDATE usuario
            SET nome = ?,
                email = ?,
                fk_tipo_usuario = ?,
                fk_concessionaria = ?
            WHERE id = ?;
        `;
        params = [nome, email, fkTipoUsuario, fkConcessionaria || null, id];
    }

    return database.executar(instrucaoSql, params);
}

function excluir(id) {
    var instrucaoSql = `
        DELETE FROM usuario
        WHERE id = ?;
    `;

    return database.executar(instrucaoSql, [id]);
}

module.exports = {
    autenticar,
    cadastrar,
    buscarPorEmail,
    buscarPorId,
    listar,
    listarPorEmpresa,
    listarPerfis,
    atualizar,
    excluir
};
