var database = require("../database/config");

function listarPorEscopo(ctx) {
    var condicao = "";
    var valores = [];

    if (ctx && ctx.fk_concessionaria) {
        condicao = "WHERE c.id = ?";
        valores.push(Number(ctx.fk_concessionaria));
    } else if (ctx && ctx.fk_empresa) {
        condicao = "WHERE c.fk_empresa = ?";
        valores.push(Number(ctx.fk_empresa));
    } else {
        return Promise.resolve([]);
    }

    var instrucaoSql = `
        SELECT
            c.id,
            c.nome_praca,
            c.rodovia,
            c.km,
            c.cidade,
            c.uf,
            c.fk_empresa,
            e.nome_fantasia,
            e.razao_social,
            e.cnpj,
            (SELECT COUNT(*) FROM servidor s WHERE s.fk_concessionaria = c.id) AS total_servidores,
            (SELECT COUNT(*) FROM usuario u WHERE u.fk_concessionaria = c.id) AS total_usuarios
        FROM concessionaria AS c
        JOIN empresa AS e ON c.fk_empresa = e.id
        ${condicao}
        ORDER BY c.id ASC;
    `;

    return database.executar(instrucaoSql, valores);
}

function buscarPorId(id) {
    var instrucaoSql = `
        SELECT
            c.id,
            c.nome_praca,
            c.rodovia,
            c.km,
            c.cidade,
            c.uf,
            c.fk_empresa,
            e.nome_fantasia,
            e.razao_social,
            e.cnpj
        FROM concessionaria AS c
        JOIN empresa AS e ON c.fk_empresa = e.id
        WHERE c.id = ?
        LIMIT 1;
    `;

    return database.executar(instrucaoSql, [Number(id)]);
}

function cadastrar(nomePraca, rodovia, km, cidade, uf, fkEmpresa) {
    var instrucaoSql = `
        INSERT INTO concessionaria (nome_praca, rodovia, km, cidade, uf, fk_empresa)
        VALUES (?, ?, ?, ?, ?, ?);
    `;

    return database.executar(instrucaoSql, [
        nomePraca,
        rodovia,
        km,
        cidade,
        uf,
        Number(fkEmpresa)
    ]);
}

function atualizar(id, nomePraca, rodovia, km, cidade, uf) {
    var instrucaoSql = `
        UPDATE concessionaria
        SET nome_praca = ?,
            rodovia = ?,
            km = ?,
            cidade = ?,
            uf = ?
        WHERE id = ?;
    `;

    return database.executar(instrucaoSql, [
        nomePraca,
        rodovia,
        km,
        cidade,
        uf,
        Number(id)
    ]);
}

function contarDependencias(id) {
    var instrucaoSql = `
        SELECT
            (SELECT COUNT(*) FROM servidor WHERE fk_concessionaria = ?) AS total_servidores,
            (SELECT COUNT(*) FROM usuario WHERE fk_concessionaria = ?) AS total_usuarios;
    `;

    return database.executar(instrucaoSql, [Number(id), Number(id)]);
}

function excluir(id) {
    var instrucaoSql = `
        DELETE FROM concessionaria
        WHERE id = ?;
    `;

    return database.executar(instrucaoSql, [Number(id)]);
}

module.exports = {
    listarPorEscopo,
    buscarPorId,
    cadastrar,
    atualizar,
    contarDependencias,
    excluir
};
