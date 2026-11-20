var database = require("../database/config");

function buscarServidoresComUltimasMedidas(idEmpresa, idServidor) {
    var filtroWhere = "WHERE 1=1";
    if (idEmpresa && idEmpresa !== "todas" && !isNaN(Number(idEmpresa))) {
        filtroWhere += ` AND s.fk_empresa = ${Number(idEmpresa)}`;
    }
    if (idServidor && idServidor !== "todos" && !isNaN(Number(idServidor))) {
        filtroWhere += ` AND s.id = ${Number(idServidor)}`;
    }

    var instrucaoSql = `
        SELECT 
            s.id AS id_servidor,
            s.tipo AS tipo_servidor,
            s.ip,
            e.id AS id_empresa,
            e.nome_fantasia AS concessionaria,
            ROUND(COALESCE(t.temp_atual, 60.0), 1) AS temp_atual,
            ROUND(COALESCE(c.cpu_atual, 50.0), 1) AS cpu_atual,
            COALESCE(t.dt_hora, NOW()) AS dt_hora
        FROM servidor s
        JOIN empresa e ON s.fk_empresa = e.id
        LEFT JOIN (
            SELECT c1.fk_servidor, r1.valor AS temp_atual, r1.dt_hora
            FROM registro_monitoramento r1
            JOIN config c1 ON r1.fk_config = c1.id
            WHERE r1.fk_metrica = 1
              AND r1.id = (
                  SELECT MAX(r_sub.id)
                  FROM registro_monitoramento r_sub
                  JOIN config c_sub ON r_sub.fk_config = c_sub.id
                  WHERE c_sub.fk_servidor = c1.fk_servidor AND r_sub.fk_metrica = 1
              )
        ) t ON t.fk_servidor = s.id
        LEFT JOIN (
            SELECT c2.fk_servidor, r2.valor AS cpu_atual
            FROM registro_monitoramento r2
            JOIN config c2 ON r2.fk_config = c2.id
            WHERE r2.fk_metrica = 2
              AND r2.id = (
                  SELECT MAX(r_sub2.id)
                  FROM registro_monitoramento r_sub2
                  JOIN config c_sub2 ON r_sub2.fk_config = c_sub2.id
                  WHERE c_sub2.fk_servidor = c2.fk_servidor AND r_sub2.fk_metrica = 2
              )
        ) c ON c.fk_servidor = s.id
        ${filtroWhere}
        ORDER BY t.temp_atual DESC
    `;

    return database.executar(instrucaoSql);
}

function buscarHistoricoMedidas(idServidor, periodoHoras) {
    var horas = Number(periodoHoras) || 1;
    var filtroServidor = "";
    if (idServidor && idServidor !== "todos" && !isNaN(Number(idServidor))) {
        filtroServidor = `AND c.fk_servidor = ${Number(idServidor)}`;
    }

    var instrucaoSql = `
        SELECT 
            r.id,
            r.fk_metrica,
            r.valor,
            r.dt_hora,
            DATE_FORMAT(r.dt_hora, '%H:%i') AS hora_formatada,
            c.fk_servidor,
            s.tipo AS servidor_tipo,
            s.ip
        FROM registro_monitoramento r
        JOIN config c ON r.fk_config = c.id
        JOIN servidor s ON c.fk_servidor = s.id
        WHERE r.fk_metrica IN (1, 2)
          AND r.dt_hora >= DATE_SUB(NOW(), INTERVAL ${horas} HOUR)
          ${filtroServidor}
        ORDER BY r.dt_hora ASC
    `;

    return database.executar(instrucaoSql);
}

function buscarParesDispersao(idEmpresa, horas) {
    var intervalo = Number(horas) || 24;
    var filtroEmpresa = "";
    if (idEmpresa && idEmpresa !== "todas" && !isNaN(Number(idEmpresa))) {
        filtroEmpresa = `AND s.fk_empresa = ${Number(idEmpresa)}`;
    }

    var instrucaoSql = `
        SELECT 
            s.id AS id_servidor,
            s.tipo AS tipo_servidor,
            s.ip,
            e.nome_fantasia AS concessionaria,
            ROUND(r_cpu.valor, 1) AS cpu,
            ROUND(r_temp.valor, 1) AS temperatura,
            r_temp.dt_hora
        FROM registro_monitoramento r_temp
        JOIN config c_temp ON r_temp.fk_config = c_temp.id
        JOIN servidor s ON c_temp.fk_servidor = s.id
        JOIN empresa e ON s.fk_empresa = e.id
        JOIN config c_cpu ON c_cpu.fk_servidor = s.id AND c_cpu.fk_componente = 1
        JOIN registro_monitoramento r_cpu ON r_cpu.fk_config = c_cpu.id 
             AND r_cpu.fk_metrica = 2 
             AND ABS(TIMESTAMPDIFF(MINUTE, r_temp.dt_hora, r_cpu.dt_hora)) <= 5
        WHERE r_temp.fk_metrica = 1
          AND r_temp.dt_hora >= DATE_SUB(NOW(), INTERVAL ${intervalo} HOUR)
          ${filtroEmpresa}
        ORDER BY r_temp.dt_hora DESC
        LIMIT 60
    `;

    return database.executar(instrucaoSql);
}

function buscarListaConcessionarias() {
    var instrucaoSql = `SELECT id, nome_fantasia AS nome FROM empresa ORDER BY id ASC`;
    return database.executar(instrucaoSql);
}

function buscarListaServidores() {
    var instrucaoSql = `
        SELECT 
            s.id, 
            s.tipo, 
            s.ip, 
            s.fk_empresa,
            e.nome_fantasia AS concessionaria
        FROM servidor s
        JOIN empresa e ON s.fk_empresa = e.id
        ORDER BY s.id ASC
    `;
    return database.executar(instrucaoSql);
}

module.exports = {
    buscarServidoresComUltimasMedidas,
    buscarHistoricoMedidas,
    buscarParesDispersao,
    buscarListaConcessionarias,
    buscarListaServidores
};
