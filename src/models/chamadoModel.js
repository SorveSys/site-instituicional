var database = require("../database/config");

function cadastrar(chaveJira, motivo, descricao, fkUsuario, fkServidor) {
    console.log("ACESSEI O CHAMADO MODEL \n function cadastrar():", chaveJira, motivo, fkUsuario, fkServidor);
    var instrucaoSql = `
        INSERT INTO chamado (chave_jira, motivo, descricao, status_chamado, fk_usuario, fk_servidor)
        VALUES (?, ?, ?, 'TO DO', ?, ?);
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [
        chaveJira,
        motivo,
        descricao,
        fkUsuario,
        fkServidor
    ]);
}

function listar() {
    console.log("ACESSEI O CHAMADO MODEL \n function listar()");
    var instrucaoSql = `
        SELECT 
            c.id,
            c.chave_jira,
            c.motivo,
            c.descricao,
            c.status_chamado,
            c.dt_abertura,
            c.fk_usuario,
            u.nome AS nome_usuario,
            u.email AS email_usuario,
            c.fk_servidor,
            s.tipo AS tipo_servidor,
            s.ip AS ip_servidor,
            con.nome_praca,
            con.rodovia
        FROM chamado AS c
        JOIN usuario AS u ON c.fk_usuario = u.id
        JOIN servidor AS s ON c.fk_servidor = s.id
        JOIN concessionaria AS con ON s.fk_concessionaria = con.id
        ORDER BY c.id DESC;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function listarPorEmpresa(idEmpresa) {
    console.log("ACESSEI O CHAMADO MODEL \n function listarPorEmpresa():", idEmpresa);
    var instrucaoSql = `
        SELECT 
            c.id,
            c.chave_jira,
            c.motivo,
            c.descricao,
            c.status_chamado,
            c.dt_abertura,
            c.fk_usuario,
            u.nome AS nome_usuario,
            u.email AS email_usuario,
            c.fk_servidor,
            s.tipo AS tipo_servidor,
            s.ip AS ip_servidor,
            con.nome_praca,
            con.rodovia
        FROM chamado AS c
        JOIN usuario AS u ON c.fk_usuario = u.id
        JOIN servidor AS s ON c.fk_servidor = s.id
        JOIN concessionaria AS con ON s.fk_concessionaria = con.id
        WHERE con.fk_empresa = ? OR u.fk_empresa = ?
        ORDER BY c.id DESC;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [idEmpresa, idEmpresa]);
}

function listarPorServidor(idServidor) {
    console.log("ACESSEI O CHAMADO MODEL \n function listarPorServidor():", idServidor);
    var instrucaoSql = `
        SELECT 
            c.id,
            c.chave_jira,
            c.motivo,
            c.descricao,
            c.status_chamado,
            c.dt_abertura,
            c.fk_usuario,
            u.nome AS nome_usuario,
            u.email AS email_usuario,
            c.fk_servidor,
            s.tipo AS tipo_servidor,
            s.ip AS ip_servidor,
            con.nome_praca,
            con.rodovia
        FROM chamado AS c
        JOIN usuario AS u ON c.fk_usuario = u.id
        JOIN servidor AS s ON c.fk_servidor = s.id
        JOIN concessionaria AS con ON s.fk_concessionaria = con.id
        WHERE c.fk_servidor = ?
        ORDER BY c.id DESC;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [idServidor]);
}

function buscarPorChaveJira(chaveJira) {
    console.log("ACESSEI O CHAMADO MODEL \n function buscarPorChaveJira():", chaveJira);
    var instrucaoSql = `
        SELECT 
            c.id,
            c.chave_jira,
            c.motivo,
            c.descricao,
            c.status_chamado,
            c.dt_abertura,
            c.fk_usuario,
            c.fk_servidor
        FROM chamado AS c
        WHERE c.chave_jira = ?;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [chaveJira]);
}

function buscarPorId(id) {
    console.log("ACESSEI O CHAMADO MODEL \n function buscarPorId():", id);
    var instrucaoSql = `
        SELECT 
            c.id,
            c.chave_jira,
            c.motivo,
            c.descricao,
            c.status_chamado,
            c.dt_abertura,
            c.fk_usuario,
            c.fk_servidor
        FROM chamado AS c
        WHERE c.id = ?;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [id]);
}

module.exports = {
    cadastrar,
    listar,
    listarPorEmpresa,
    listarPorServidor,
    buscarPorChaveJira,
    buscarPorId
};
