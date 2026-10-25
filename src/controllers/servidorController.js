var servidorModel = require("../models/servidorModel");

function cadastrar(req, res) {
    var tipo = req.body.tipoServer || req.body.tipo;
    var ip = req.body.ipServer || req.body.ip;
    var fkEmpresa = req.body.empresaServer || req.body.fkEmpresa || req.body.fk_empresa;

    if (!tipo || String(tipo).trim() === "") {
        return res.status(400).send("O tipo do servidor é obrigatório!");
    }
    if (!fkEmpresa || String(fkEmpresa).trim() === "") {
        return res.status(400).send("A empresa proprietária é obrigatória!");
    }

    tipo = String(tipo).trim().toLowerCase();
    fkEmpresa = Number(fkEmpresa);

    if (!['transito', 'pagamento', 'auditoria'].includes(tipo)) {
        return res.status(400).send("Tipo de servidor inválido! Escolha entre transito, pagamento ou auditoria.");
    }

    if (isNaN(fkEmpresa)) {
        return res.status(400).send("ID da empresa inválido!");
    }

    if (ip && String(ip).trim() !== "") {
        ip = String(ip).trim();
        var partes = ip.split(".");
        var ipValido = partes.length === 4 && partes.every(function (p) {
            return /^\d{1,3}$/.test(p) && Number(p) <= 255;
        });

        if (!ipValido) {
            return res.status(400).send("Endereço IPv4 inválido!");
        }
    } else {
        ip = null;
    }

    servidorModel.cadastrar(tipo, ip, fkEmpresa)
        .then(function (resultado) {
            var idServidor = resultado.insertId;

            // Vincula automaticamente componentes padrão (CPU, RAM, Disco, Rede) na tabela config
            return servidorModel.vincularConfigComponentesPadrao(idServidor)
                .then(function () {
                    return res.status(201).json({
                        mensagem: "Servidor cadastrado com sucesso!",
                        id: idServidor
                    });
                })
                .catch(function (erroConfig) {
                    console.log("Servidor cadastrado, mas aviso ao vincular componentes na tabela config:", erroConfig);
                    return res.status(201).json({
                        mensagem: "Servidor cadastrado com sucesso!",
                        id: idServidor
                    });
                });
        })
        .catch(function (erro) {
            console.error(erro);
            console.error("\nHouve um erro ao realizar o cadastro do servidor! Erro: ", erro.sqlMessage || erro.message);

            if (erro.code === "ER_DUP_ENTRY") {
                return res.status(409).send("Duplicate entry: Esse servidor já foi cadastrado!");
            }

            return res.status(500).json(erro.sqlMessage || erro.message);
        });
}

function listar(req, res) {
    servidorModel.listar()
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error(erro);
            return res.status(500).json(erro.sqlMessage || erro.message);
        });
}

function listarPorEmpresa(req, res) {
    var idEmpresa = req.params.idEmpresa || req.query.idEmpresa;

    if (!idEmpresa) {
        return res.status(400).send("ID da empresa não informado!");
    }

    servidorModel.listarPorEmpresa(idEmpresa)
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error(erro);
            return res.status(500).json(erro.sqlMessage || erro.message);
        });
}

module.exports = {
    cadastrar,
    listar,
    listarPorEmpresa
};
