var database = require("../database/config");

function queryBaseServidorComStatus(condicaoWhere) {
    return `
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
            g.cpu_uso_atual,
            g.cpu_temp_atual,
            g.ram_uso_atual,
            g.disco_uso_atual,
            g.latencia_atual,
            (SELECT rm.valor
             FROM registro_monitoramento rm
             JOIN config cfg ON rm.fk_config = cfg.id
             WHERE cfg.fk_servidor = s.id AND rm.fk_metrica = 7
             ORDER BY rm.dt_hora DESC, rm.id DESC
             LIMIT 1) AS status_conectividade,
            (SELECT MAX(rm.dt_hora)
             FROM registro_monitoramento rm
             JOIN config cfg ON rm.fk_config = cfg.id
             WHERE cfg.fk_servidor = s.id) AS ultima_comunicacao,
            (SELECT a.categoria
             FROM alerta a
             JOIN registro_monitoramento rm ON a.fk_registro = rm.id
             JOIN config cfg ON rm.fk_config = cfg.id
             WHERE cfg.fk_servidor = s.id
               AND rm.dt_hora = (
                   SELECT MAX(rm2.dt_hora)
                   FROM registro_monitoramento rm2
                   JOIN config cfg2 ON rm2.fk_config = cfg2.id
                   WHERE cfg2.fk_servidor = s.id
               )
             ORDER BY FIELD(a.categoria, 'Critico', 'Moderado', 'Normal') ASC, a.id DESC
             LIMIT 1) AS alerta_recente_categoria
        FROM servidor AS s
        JOIN concessionaria AS c ON s.fk_concessionaria = c.id
        JOIN empresa AS e ON c.fk_empresa = e.id
        LEFT JOIN vw_gauges_servidor AS g ON g.id_servidor = s.id
        ${condicaoWhere}
        ORDER BY s.id ASC;
    `;
}

function listar() {
    var instrucaoSql = queryBaseServidorComStatus("");
    return database.executar(instrucaoSql);
}

function listarPorEscopo(ctx) {
    if (ctx && ctx.fk_concessionaria) {
        return database.executar(
            queryBaseServidorComStatus("WHERE s.fk_concessionaria = ?"),
            [Number(ctx.fk_concessionaria)]
        );
    }

    if (ctx && ctx.fk_empresa) {
        return database.executar(
            queryBaseServidorComStatus("WHERE c.fk_empresa = ?"),
            [Number(ctx.fk_empresa)]
        );
    }

    return Promise.resolve([]);
}

function listarPorEmpresa(idEmpresa) {
    return database.executar(
        queryBaseServidorComStatus("WHERE e.id = ?"),
        [Number(idEmpresa)]
    );
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
            e.nome_fantasia
        FROM servidor AS s
        JOIN concessionaria AS c ON s.fk_concessionaria = c.id
        JOIN empresa AS e ON c.fk_empresa = e.id
        WHERE s.id = ?
        LIMIT 1;
    `;
    return database.executar(instrucaoSql, [Number(id)]);
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
    return database.executar(instrucaoSql, [tipo, ip || null, Number(fkConcessionaria)]);
}

function vincularConfigComponentesPadrao(idServidor) {
    var instrucaoSql = `
        INSERT INTO config (fk_componente, fk_servidor)
        SELECT id, ? FROM componente;
    `;
    return database.executar(instrucaoSql, [Number(idServidor)]);
}

function atualizar(id, tipo, ip, fkConcessionaria) {
    var instrucaoSql = `
        UPDATE servidor
        SET tipo = ?,
            ip = ?,
            fk_concessionaria = ?
        WHERE id = ?;
    `;
    return database.executar(instrucaoSql, [
        tipo,
        ip || null,
        Number(fkConcessionaria),
        Number(id)
    ]);
}

function contarChamadosPorServidor(id) {
    var instrucaoSql = `
        SELECT COUNT(*) AS total
        FROM chamado
        WHERE fk_servidor = ?;
    `;
    return database.executar(instrucaoSql, [Number(id)]);
}

function excluirComDependencias(id) {
    var idNum = Number(id);

    var sqlAlertas = `
        DELETE a
        FROM alerta AS a
        JOIN registro_monitoramento AS rm ON a.fk_registro = rm.id
        JOIN config AS cfg ON rm.fk_config = cfg.id
        WHERE cfg.fk_servidor = ?;
    `;

    var sqlRegistros = `
        DELETE rm
        FROM registro_monitoramento AS rm
        JOIN config AS cfg ON rm.fk_config = cfg.id
        WHERE cfg.fk_servidor = ?;
    `;

    var sqlConfig = `
        DELETE FROM config
        WHERE fk_servidor = ?;
    `;

    var sqlServidor = `
        DELETE FROM servidor
        WHERE id = ?;
    `;

    return database.executar(sqlAlertas, [idNum])
        .then(function () {
            return database.executar(sqlRegistros, [idNum]);
        })
        .then(function () {
            return database.executar(sqlConfig, [idNum]);
        })
        .then(function () {
            return database.executar(sqlServidor, [idNum]);
        });
}

module.exports = {
    listar,
    listarPorEscopo,
    listarPorEmpresa,
    buscarPorId,
    buscarPorIp,
    cadastrar,
    vincularConfigComponentesPadrao,
    atualizar,
    contarChamadosPorServidor,
    excluirComDependencias
};
