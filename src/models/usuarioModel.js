var database = require("../database/config");

function autenticar(email, senha) {
    console.log("ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Unknown column', verifique as colunas da tabela usuario no MySQL \n\n");
    
    var instrucaoSql = `
        SELECT 
            u.id, 
            u.nome, 
            u.email, 
            u.cargo, 
            u.empresa_fk, 
            e.razao_social AS empresa_nome
        FROM usuario u
        INNER JOIN empresa e ON u.empresa_fk = e.id
        WHERE u.email = '${email}' AND u.senha = '${senha}' AND u.status = 'ATIVO';
    `;
    
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

module.exports = {
    autenticar
};