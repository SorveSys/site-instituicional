var database = require("../database/config");

function montarFiltroEscopo(filtros, aliasConcessionaria, aliasServidor) {
    var condicoes = [];
    var valores = [];

    if (filtros && filtros.idConcessionaria) {
        condicoes.push(aliasServidor + ".fk_concessionaria = ?");
        valores.push(Number(filtros.idConcessionaria));
    } else if (filtros && filtros.idEmpresa) {
        condicoes.push(aliasConcessionaria + ".fk_empresa = ?");
        valores.push(Number(filtros.idEmpresa));
    }

    if (filtros && filtros.idServidor) {
        condicoes.push(aliasServidor + ".id = ?");
        valores.push(Number(filtros.idServidor));
    }

    return {
        clausula: condicoes.length > 0 ? " AND " + condicoes.join(" AND ") : "",
        valores: valores
    };
}

function listarServidoresOverview(filtros) {
    var escopo = montarFiltroEscopo(filtros, "con", "s");
    var instrucaoSql = `
        SELECT
            s.id AS id_servidor,
            s.tipo AS tipo_servidor,
            s.ip,
            s.fk_concessionaria,
            con.nome_praca,
            con.rodovia,
            con.km,
            con.cidade,
            con.uf,
            e.id AS fk_empresa,
            e.nome_fantasia,
            e.razao_social,
            g.cpu_uso_atual,
            g.cpu_temp_atual,
            g.ram_uso_atual,
            g.disco_uso_atual,
            g.disco_livre_atual,
            g.latencia_atual,
            g.cpu_media,
            g.cpu_pico,
            g.temp_media,
            g.temp_max,
            g.latencia_media,
            (SELECT rm.valor
             FROM registro_monitoramento rm
             JOIN config cfg ON rm.fk_config = cfg.id
             WHERE cfg.fk_servidor = s.id AND rm.fk_metrica = 7
             ORDER BY rm.dt_hora DESC, rm.id DESC
             LIMIT 1) AS status_conectividade,
            (SELECT rm.valor
             FROM registro_monitoramento rm
             JOIN config cfg ON rm.fk_config = cfg.id
             WHERE cfg.fk_servidor = s.id AND rm.fk_metrica = 8
             ORDER BY rm.dt_hora DESC, rm.id DESC
             LIMIT 1) AS status_rede,
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
        FROM servidor s
        JOIN concessionaria con ON s.fk_concessionaria = con.id
        JOIN empresa e ON con.fk_empresa = e.id
        LEFT JOIN vw_gauges_servidor g ON g.id_servidor = s.id
        WHERE 1 = 1 ${escopo.clausula}
        ORDER BY s.id ASC;
    `;

    return database.executar(instrucaoSql, escopo.valores);
}

function listarAlertas(filtros) {
    var escopo = montarFiltroEscopo(filtros, "con", "s");
    var valores = escopo.valores.slice();
    var clausulaLimite = "";

    if (filtros && filtros.limite && Number(filtros.limite) > 0) {
        clausulaLimite = "LIMIT ?";
        valores.push(Number(filtros.limite));
    }

    var instrucaoSql = `
        SELECT
            a.id AS id_alerta,
            a.categoria,
            a.descricao,
            a.fk_registro,
            rm.valor,
            rm.dt_hora,
            DATE_FORMAT(rm.dt_hora, '%H:%i:%s') AS horario_formatado,
            DATE_FORMAT(rm.dt_hora, '%d/%m/%Y %H:%i:%s') AS data_hora_formatada,
            m.id AS id_metrica,
            m.tipo AS tipo_metrica,
            comp.id AS id_componente,
            comp.nome AS componente,
            s.id AS id_servidor,
            s.tipo AS tipo_servidor,
            s.ip,
            con.id AS fk_concessionaria,
            con.nome_praca,
            con.rodovia,
            con.km,
            e.id AS fk_empresa,
            e.nome_fantasia
        FROM alerta a
        JOIN registro_monitoramento rm ON a.fk_registro = rm.id
        JOIN metrica m ON rm.fk_metrica = m.id
        JOIN config cfg ON rm.fk_config = cfg.id
        JOIN componente comp ON cfg.fk_componente = comp.id
        JOIN servidor s ON cfg.fk_servidor = s.id
        JOIN concessionaria con ON s.fk_concessionaria = con.id
        JOIN empresa e ON con.fk_empresa = e.id
        WHERE 1 = 1 ${escopo.clausula}
        ORDER BY rm.dt_hora DESC, a.id DESC
        ${clausulaLimite};
    `;

    return database.executar(instrucaoSql, valores);
}

function buscarDashboardServidor(idServidor) {
    var instrucaoSql = `
        SELECT
            s.id AS id_servidor,
            s.tipo AS tipo_servidor,
            s.ip,
            s.fk_concessionaria,
            con.nome_praca,
            con.rodovia,
            con.km,
            con.cidade,
            con.uf,
            e.id AS fk_empresa,
            e.nome_fantasia,
            e.razao_social,
            g.cpu_uso_atual,
            g.cpu_temp_atual,
            g.ram_uso_atual,
            g.disco_uso_atual,
            g.disco_livre_atual,
            g.latencia_atual,
            g.cpu_media,
            g.cpu_pico,
            g.temp_media,
            g.temp_max,
            g.latencia_media,
            (SELECT ROUND(AVG(rm.valor), 1)
             FROM registro_monitoramento rm
             JOIN config cfg ON rm.fk_config = cfg.id
             WHERE cfg.fk_servidor = s.id AND rm.fk_metrica = 3) AS ram_media,
            (SELECT MAX(rm.valor)
             FROM registro_monitoramento rm
             JOIN config cfg ON rm.fk_config = cfg.id
             WHERE cfg.fk_servidor = s.id AND rm.fk_metrica = 3) AS ram_pico,
            (SELECT MAX(rm.valor)
             FROM registro_monitoramento rm
             JOIN config cfg ON rm.fk_config = cfg.id
             WHERE cfg.fk_servidor = s.id AND rm.fk_metrica = 6) AS latencia_max,
            (SELECT ROUND(STDDEV_POP(rm.valor), 1)
             FROM registro_monitoramento rm
             JOIN config cfg ON rm.fk_config = cfg.id
             WHERE cfg.fk_servidor = s.id AND rm.fk_metrica = 6) AS latencia_jitter,
            (SELECT rm.valor
             FROM registro_monitoramento rm
             JOIN config cfg ON rm.fk_config = cfg.id
             WHERE cfg.fk_servidor = s.id AND rm.fk_metrica = 7
             ORDER BY rm.dt_hora DESC, rm.id DESC
             LIMIT 1) AS status_conectividade,
            (SELECT rm.valor
             FROM registro_monitoramento rm
             JOIN config cfg ON rm.fk_config = cfg.id
             WHERE cfg.fk_servidor = s.id AND rm.fk_metrica = 8
             ORDER BY rm.dt_hora DESC, rm.id DESC
             LIMIT 1) AS status_rede,
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
        FROM servidor s
        JOIN concessionaria con ON s.fk_concessionaria = con.id
        JOIN empresa e ON con.fk_empresa = e.id
        LEFT JOIN vw_gauges_servidor g ON g.id_servidor = s.id
        WHERE s.id = ?;
    `;

    return database.executar(instrucaoSql, [Number(idServidor)]);
}

function buscarHistoricoServidor(idServidor, limite) {
    var qtd = Number(limite) > 0 ? Math.min(Number(limite), 200) : 20;
    var instrucaoSql = `
        SELECT *
        FROM (
            SELECT
                id_servidor,
                dt_hora,
                horario_label,
                DATE_FORMAT(dt_hora, '%d/%m %H:%i') AS data_horario_label,
                cpu_uso_percent,
                ram_uso_percent,
                latencia_ms,
                limite_critico_cpu,
                limite_critico_latencia
            FROM vw_historico_graficos
            WHERE id_servidor = ?
            ORDER BY dt_hora DESC
            LIMIT ?
        ) AS ultimos
        ORDER BY ultimos.dt_hora ASC;
    `;

    return database.executar(instrucaoSql, [Number(idServidor), qtd]);
}

function buscarPrimeiroServidor(filtros) {
    var escopo = montarFiltroEscopo(filtros, "con", "s");
    var instrucaoSql = `
        SELECT s.id
        FROM servidor s
        JOIN concessionaria con ON s.fk_concessionaria = con.id
        WHERE 1 = 1 ${escopo.clausula}
        ORDER BY s.id ASC
        LIMIT 1;
    `;

    return database.executar(instrucaoSql, escopo.valores);
}

function buscarIdPorIp(ip) {
    var instrucaoSql = `
        SELECT id
        FROM servidor
        WHERE ip = ?
        LIMIT 1;
    `;

    return database.executar(instrucaoSql, [ip]);
}

function contarServidores(filtros) {
    var escopo = montarFiltroEscopo(filtros, "con", "s");
    var instrucaoSql = `
        SELECT COUNT(*) AS total
        FROM servidor s
        JOIN concessionaria con ON s.fk_concessionaria = con.id
        WHERE 1 = 1 ${escopo.clausula};
    `;

    return database.executar(instrucaoSql, escopo.valores);
}

module.exports = {
    listarServidoresOverview,
    listarAlertas,
    buscarDashboardServidor,
    buscarHistoricoServidor,
    buscarPrimeiroServidor,
    buscarIdPorIp,
    contarServidores
};
