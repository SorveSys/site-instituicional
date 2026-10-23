
var mysql = require("mysql2");

// CONEXÃO DO BANCO MYSQL SERVER
var mySqlConfig = {
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
};

function executar(instrucao, valores) {

    if (
        process.env.AMBIENTE_PROCESSO !== "producao" &&
        process.env.AMBIENTE_PROCESSO !== "desenvolvimento"
    ) {
        console.log(
            "\nO AMBIENTE (producao ou desenvolvimento) NÃO FOI DEFINIDO.\n"
        );

        return Promise.reject(
            new Error("AMBIENTE NÃO CONFIGURADO")
        );
    }

    return new Promise(function (resolve, reject) {

        var conexao = mysql.createConnection(mySqlConfig);

        conexao.connect(function (erroConexao) {

            if (erroConexao) {
                return reject(erroConexao);
            }

            conexao.query(
                instrucao,
                valores || [],
                function (erro, resultados) {

                    conexao.end(function (erroFechar) {
                        if (erroFechar) {
                            console.error(
                                "Erro ao fechar conexão:",
                                erroFechar
                            );
                        }
                    });

                    if (erro) {
                        console.error("Erro SQL:", erro.sqlMessage);
                        return reject(erro);
                    }

                    resolve(resultados);
                }
            );
        });
    });
}

module.exports = {
    executar
};
