var database = require("../database/config");

function buscarMaquinasPorEmpresa(empresaId) {
    var instrucaoSql = `
        SELECT m.id AS maquina_id, m.hostname, m.mac_address, m.sistema_operacional, d.nome AS datacenter_nome
        FROM maquina m
        JOIN datacenter d ON m.datacenter_fk = d.id
        WHERE d.empresa_fk = ${empresaId};
    `;
    return database.executar(instrucaoSql);
}

module.exports = {
    buscarMaquinasPorEmpresa
};