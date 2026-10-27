var database = require("../database/config");

function buscarPorId(id) {
    var instrucaoSql = `
        SELECT id, nome_fantasia, razao_social, cnpj
        FROM empresa
        WHERE id = ?
    `;

    return database.executar(instrucaoSql, [id]);
}

function listar() {
    var instrucaoSql = `
        SELECT id, nome_fantasia, razao_social, cnpj
        FROM empresa
        ORDER BY id DESC
    `;

    return database.executar(instrucaoSql);
}

function buscarPorCnpj(cnpj) {
    var cnpjLimpo = String(cnpj || "").replace(/\D/g, "");

    var instrucaoSql = `
        SELECT id, nome_fantasia, razao_social, cnpj
        FROM empresa
        WHERE cnpj = ?
    `;

    return database.executar(instrucaoSql, [cnpjLimpo]);
}

function cadastrar(razaoSocial, cnpj, nomeFantasia) {
    var cnpjLimpo = String(cnpj || "").replace(/\D/g, "");

    var instrucaoSql = `
        INSERT INTO empresa (nome_fantasia, cnpj, razao_social)
        VALUES (?, ?, ?)
    `;

    return database.executar(instrucaoSql, [
        nomeFantasia,
        cnpjLimpo,
        razaoSocial
    ]);
}

module.exports = {
    buscarPorId,
    listar,
    buscarPorCnpj,
    cadastrar
};