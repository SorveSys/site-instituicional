var database = require("../database/config");

function listar() {
    console.log("ACESSEI O SERVIDOR MODEL \n function listar()");
    var instrucaoSql = `
        SELECT 
            s.id, 
            s.tipo, 
            s.ip, 
            s.fk_empresa,
            e.razao_social,
            e.nome_fantasia
        FROM servidor AS s
        JOIN empresa AS e ON s.fk_empresa = e.id
        ORDER BY s.id DESC;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function listarPorEmpresa(idEmpresa) {
    console.log("ACESSEI O SERVIDOR MODEL \n function listarPorEmpresa():", idEmpresa);
    var instrucaoSql = `
        SELECT 
            s.id, 
            s.tipo, 
            s.ip, 
            s.fk_empresa,
            e.razao_social,
            e.nome_fantasia
        FROM servidor AS s
        JOIN empresa AS e ON s.fk_empresa = e.id
        WHERE s.fk_empresa = ?
        ORDER BY s.id DESC;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [idEmpresa]);
}

function buscarPorId(id) {
    console.log("ACESSEI O SERVIDOR MODEL \n function buscarPorId():", id);
    var instrucaoSql = `
        SELECT 
            s.id, 
            s.tipo, 
            s.ip, 
            s.fk_empresa,
            e.razao_social,
            e.nome_fantasia
        FROM servidor AS s
        JOIN empresa AS e ON s.fk_empresa = e.id
        WHERE s.id = ?;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [id]);
}

function buscarPorIp(ip) {
    console.log("ACESSEI O SERVIDOR MODEL \n function buscarPorIp():", ip);
    var instrucaoSql = `
        SELECT 
            s.id, 
            s.tipo, 
            s.ip, 
            s.fk_empresa,
            e.razao_social,
            e.nome_fantasia
        FROM servidor AS s
        JOIN empresa AS e ON s.fk_empresa = e.id
        WHERE s.ip = ?;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [ip]);
}

function cadastrar(tipo, ip, fkEmpresa) {
    console.log("ACESSEI O SERVIDOR MODEL \n function cadastrar():", tipo, ip, fkEmpresa);
    var instrucaoSql = `
        INSERT INTO servidor (tipo, ip, fk_empresa) 
        VALUES (?, ?, ?);
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [tipo, ip || null, fkEmpresa]);
}

function vincularConfigComponentesPadrao(idServidor) {
    console.log("ACESSEI O SERVIDOR MODEL \n function vincularConfigComponentesPadrao():", idServidor);
    var instrucaoSql = `
        INSERT INTO config (fk_componente, fk_servidor)
        SELECT id, ? FROM componente;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [idServidor]);
}

module.exports = {
    listar,
    listarPorEmpresa,
    buscarPorId,
    buscarPorIp,
    cadastrar,
    vincularConfigComponentesPadrao
};
