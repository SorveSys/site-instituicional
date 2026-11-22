var database = require("../database/config");

function listar() {
    var instrucaoSql = `
        SELECT 
            s.id, 
            s.tipo, 
            s.ip, 
            s.fk_concessionaria,
            c.nome_praca,
            c.rodovia,
            c.km,
            c.cidade,
            c.uf,
            e.id AS fk_empresa,
            e.razao_social,
            e.nome_fantasia,
            e.cnpj
        FROM servidor AS s
        JOIN concessionaria AS c ON s.fk_concessionaria = c.id
        JOIN empresa AS e ON c.fk_empresa = e.id
        ORDER BY s.id DESC;
    `;
    return database.executar(instrucaoSql);
}

function listarPorEmpresa(idEmpresa) {
    var instrucaoSql = `
        SELECT 
            s.id, 
            s.tipo, 
            s.ip, 
            s.fk_concessionaria,
            c.nome_praca,
            c.rodovia,
            c.km,
            c.cidade,
            c.uf,
            e.id AS fk_empresa,
            e.razao_social,
            e.nome_fantasia,
            e.cnpj
        FROM servidor AS s
        JOIN concessionaria AS c ON s.fk_concessionaria = c.id
        JOIN empresa AS e ON c.fk_empresa = e.id
        WHERE e.id = ?
        ORDER BY s.id DESC;
    `;
    return database.executar(instrucaoSql, [idEmpresa]);
}

function buscarPorId(id) {
    var instrucaoSql = `
        SELECT 
            s.id, 
            s.tipo, 
            s.ip, 
            s.fk_concessionaria,
            c.nome_praca,
            c.rodovia,
            c.km,
            c.cidade,
            c.uf,
            e.id AS fk_empresa,
            e.razao_social,
            e.nome_fantasia,
            e.cnpj
        FROM servidor AS s
        JOIN concessionaria AS c ON s.fk_concessionaria = c.id
        JOIN empresa AS e ON c.fk_empresa = e.id
        WHERE s.id = ?;
    `;
    return database.executar(instrucaoSql, [id]);
}

function buscarPorIp(ip) {
    var instrucaoSql = `
        SELECT 
            s.id, 
            s.tipo, 
            s.ip, 
            s.fk_concessionaria,
            c.nome_praca,
            c.rodovia,
            c.km,
            e.id AS fk_empresa,
            e.razao_social,
            e.nome_fantasia
        FROM servidor AS s
        JOIN concessionaria AS c ON s.fk_concessionaria = c.id
        JOIN empresa AS e ON c.fk_empresa = e.id
        WHERE s.ip = ?;
    `;
    return database.executar(instrucaoSql, [ip]);
}

function cadastrar(tipo, ip, fkConcessionaria) {
    var instrucaoSql = `
        INSERT INTO servidor (tipo, ip, fk_concessionaria) 
        VALUES (?, ?, ?);
    `;
    return database.executar(instrucaoSql, [tipo, ip || null, fkConcessionaria]);
}

function atualizar(id, tipo, ip, fkConcessionaria) {
    var instrucaoSql = `
        UPDATE servidor
        SET tipo = ?,
            ip = ?,
            fk_concessionaria = ?
        WHERE id = ?;
    `;
    return database.executar(instrucaoSql, [tipo, ip || null, fkConcessionaria, id]);
}

async function excluir(id) {
    // 1. Verificar se há chamados vinculados ao servidor
    var sqlVerificaChamados = `SELECT id FROM chamado WHERE fk_servidor = ?;`;
    var chamados = await database.executar(sqlVerificaChamados, [id]);

    if (chamados && chamados.length > 0) {
        var erro = new Error("Não é possível excluir este servidor pois existem chamados de suporte vinculados a ele.");
        erro.code = "ER_ROW_IS_REFERENCED_2";
        erro.errno = 1451;
        throw erro;
    }

    // 2. Limpar em cascata alertas vinculados às métricas deste servidor
    var sqlDeleteAlertas = `
        DELETE a FROM alerta a
        JOIN registro_monitoramento rm ON a.fk_registro = rm.id
        JOIN config c ON rm.fk_config = c.id
        WHERE c.fk_servidor = ?;
    `;
    await database.executar(sqlDeleteAlertas, [id]);

    // 3. Limpar registros de telemetria
    var sqlDeleteRegistros = `
        DELETE rm FROM registro_monitoramento rm
        JOIN config c ON rm.fk_config = c.id
        WHERE c.fk_servidor = ?;
    `;
    await database.executar(sqlDeleteRegistros, [id]);

    // 4. Limpar configurações de componentes do servidor
    var sqlDeleteConfigs = `
        DELETE FROM config WHERE fk_servidor = ?;
    `;
    await database.executar(sqlDeleteConfigs, [id]);

    // 5. Excluir o servidor
    var sqlDeleteServidor = `
        DELETE FROM servidor WHERE id = ?;
    `;
    return database.executar(sqlDeleteServidor, [id]);
}

function vincularConfigComponentesPadrao(idServidor) {
    var instrucaoSql = `
        INSERT INTO config (fk_componente, fk_servidor)
        SELECT id, ? FROM componente;
    `;
    return database.executar(instrucaoSql, [idServidor]);
}

module.exports = {
    listar,
    listarPorEmpresa,
    buscarPorId,
    buscarPorIp,
    cadastrar,
    atualizar,
    excluir,
    vincularConfigComponentesPadrao
};
