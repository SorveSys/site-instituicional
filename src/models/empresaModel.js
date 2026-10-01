var database = require("../database/config");

function buscarPorCnpj(cnpj) {
    var instrucaoSql = `SELECT * FROM empresa WHERE cnpj = '${cnpj}';`;
    return database.executar(instrucaoSql);
}

function cadastrar(razaoSocial, cnpj, email, telefone, nomeFantasia) {
    var instrucaoSql = `
        INSERT INTO empresa (razao_social, nome_fantasia, cnpj, email, telefone) 
        VALUES ('${razaoSocial}', '${nomeFantasia || ''}', '${cnpj}', '${email}', '${telefone || ''}');
    `;
    return database.executar(instrucaoSql);
}

function listar() {
    var instrucaoSql = `SELECT * FROM empresa;`;
    return database.executar(instrucaoSql);
}

module.exports = {
    buscarPorCnpj,
    cadastrar,
    listar
};