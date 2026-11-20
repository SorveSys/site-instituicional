
var database = require("../database/config");

function autenticar(email, senha) {
    var instrucaoSql = `
        SELECT
            u.id,
            u.nome,
            u.email,
            u.fk_empresa,
            u.fk_tipo_usuario,
            p.tipo AS perfil,
            e.razao_social,
            e.nome_fantasia
        FROM usuario AS u
        LEFT JOIN perfil AS p ON u.fk_tipo_usuario = p.id
        LEFT JOIN empresa AS e ON u.fk_empresa = e.id
        WHERE u.email = ? AND u.senha = ?;
    `;

    return database.executar(instrucaoSql, [email, senha]);
}

function cadastrar(nome, email, senha, fkEmpresa, fkTipoUsuario) {
    var instrucaoSql = `
        INSERT INTO usuario
            (nome, email, senha, fk_empresa, fk_tipo_usuario)
        VALUES (?, ?, ?, ?, ?);
    `;

    return database.executar(instrucaoSql, [
        nome,
        email,
        senha,
        fkEmpresa,
        fkTipoUsuario
    ]);
}

function buscarPorEmail(email) {
    var instrucaoSql = `
        SELECT id, nome, email, fk_empresa, fk_tipo_usuario
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
            u.fk_empresa,
            u.fk_tipo_usuario,
            p.tipo AS perfil,
            e.razao_social,
            e.nome_fantasia
        FROM usuario AS u
        LEFT JOIN perfil AS p ON u.fk_tipo_usuario = p.id
        LEFT JOIN empresa AS e ON u.fk_empresa = e.id
        WHERE u.id = ?;
    `;

    return database.executar(instrucaoSql, [id]);
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
            p.tipo AS perfil
        FROM usuario AS u
        LEFT JOIN perfil AS p ON u.fk_tipo_usuario = p.id
        WHERE u.fk_empresa = ?
        ORDER BY u.nome ASC;
    `;

    return database.executar(instrucaoSql, [fkEmpresa]);
}

module.exports = {
    autenticar,
    cadastrar,
    buscarPorEmail,
    buscarPorId,
    listarPerfis,
    listarPorEmpresa
};
