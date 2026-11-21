var database = require("../database/config");

function cadastrar(nome_praca, rodovia, km, cidade, uf, fkEmpresa) {
    var instrucaoSql = `
        INSERT INTO concessionaria
        (nome_praca, rodovia, km, cidade, uf, fk_empresa)
        VALUES (?, ?, ?, ?, ?, ?);
    `;

    return database.executar(instrucaoSql, [
        nome_praca,
        rodovia,
        km,
        cidade,
        uf,
        fkEmpresa
    ]);
}

function listar() {
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
        ORDER BY c.id DESC;
    `;

    return database.executar(instrucaoSql);
}

function listarPorEmpresa(fkEmpresa) {
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
        WHERE c.fk_empresa = ?
        ORDER BY c.id DESC;
    `;

    return database.executar(instrucaoSql, [fkEmpresa]);
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
        WHERE c.id = ?;
    `;

    return database.executar(instrucaoSql, [id]);
}

function atualizar(id, nome_praca, rodovia, km, cidade, uf) {
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
        nome_praca,
        rodovia,
        km,
        cidade,
        uf,
        id
    ]);
}

function excluir(id) {
    var instrucaoSql = `
        DELETE FROM concessionaria
        WHERE id = ?;
    `;

    return database.executar(instrucaoSql, [id]);
}

module.exports = {
    cadastrar,
    listar,
    listarPorEmpresa,
    buscarPorId,
    atualizar,
    excluir
};
