
var mysql = require("mysql2");
var path = require("path");

// Carrega as variáveis de ambiente caso ainda não tenham sido carregadas
if (!process.env.DB_USER) {
    var ambiente = process.env.AMBIENTE_PROCESSO || "desenvolvimento";
    var arquivoEnv = ambiente === "producao" ? ".env" : ".env.dev";
    require("dotenv").config({ path: path.resolve(__dirname, "..", "..", arquivoEnv) });
}

function getMySqlConfig() {
    return {
        host: process.env.DB_HOST || "127.0.0.1",
        database: process.env.DB_DATABASE || "sorvesys",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT) || 3306
    };
}

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

        var conexao = mysql.createConnection(getMySqlConfig());

        conexao.connect(function (erroConexao) {

            if (erroConexao) {
                console.error("Erro ao conectar no MySQL:", erroConexao.sqlMessage || erroConexao.message);
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
