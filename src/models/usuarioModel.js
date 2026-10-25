var database = require("../database/config");

function autenticar(email, senha) {
    console.log("ACESSEI O USUARIO MODEL \n function autenticar(): ", email);
    
    var instrucaoSql = `
        SELECT 
            u.id, 
            u.nome, 
            u.email, 
            u.fk_empresa, 
            u.fk_tipo_usuario,
            p.tipo AS perfil,
            e.razao_social,
            e.nome_fantasia
        FROM usuario AS u
        LEFT JOIN perfil AS p ON u.fk_tipo_usuario = p.id
        LEFT JOIN empresa AS e ON u.fk_empresa = e.id
        WHERE u.email = ? AND u.senha = ?;
    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [email, senha]);
}

function cadastrar(nome, email, senha, fkEmpresa, fkTipoUsuario) {
    console.log("ACESSEI O USUARIO MODEL \n function cadastrar():", nome, email, fkEmpresa, fkTipoUsuario);

    var instrucaoSql = `
        INSERT INTO usuario (nome, email, senha, fk_empresa, fk_tipo_usuario) 
        VALUES (?, ?, ?, ?, ?);
    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [
        nome,
        email,
        senha,
        fkEmpresa,
        fkTipoUsuario
    ]);
}

function buscarPorEmail(email) {
    console.log("ACESSEI O USUARIO MODEL \n function buscarPorEmail():", email);

    var instrucaoSql = `
        SELECT id, nome, email, fk_empresa, fk_tipo_usuario 
        FROM usuario 
        WHERE email = ?;
    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [email]);
}

function buscarPorId(id) {
    console.log("ACESSEI O USUARIO MODEL \n function buscarPorId():", id);

    var instrucaoSql = `
        SELECT 
            u.id, 
            u.nome, 
            u.email, 
            u.fk_empresa, 
            u.fk_tipo_usuario,
            p.tipo AS perfil,
            e.razao_social,
            e.nome_fantasia
        FROM usuario AS u
        LEFT JOIN perfil AS p ON u.fk_tipo_usuario = p.id
        LEFT JOIN empresa AS e ON u.fk_empresa = e.id
        WHERE u.id = ?;
    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [id]);
}

function listarPerfis() {
    console.log("ACESSEI O USUARIO MODEL \n function listarPerfis()");

    var instrucaoSql = `
        SELECT id, tipo 
        FROM perfil 
        ORDER BY id ASC;
    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

module.exports = {
    autenticar,
    cadastrar,
    buscarPorEmail,
    buscarPorId,
    listarPerfis
};