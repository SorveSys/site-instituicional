var usuarioModel = require("../models/usuarioModel");

function autenticar(req, res) {
    var email = req.body.emailServer || req.body.email;
    var senha = req.body.senhaServer || req.body.senha;

    if (!email) {
        return res.status(400).send("Seu email está undefined ou vazio!");
    } else if (!senha) {
        return res.status(400).send("Sua senha está indefinida ou vazia!");
    }

    usuarioModel.autenticar(email, senha)
        .then(function (resultadoAutenticar) {
            console.log(`\nResultados encontrados: ${resultadoAutenticar.length}`);
            console.log(`Resultados: ${JSON.stringify(resultadoAutenticar)}`);

            if (resultadoAutenticar.length === 1) {
                var usuario = resultadoAutenticar[0];
                return res.json({
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    fk_empresa: usuario.fk_empresa,
                    fk_tipo_usuario: usuario.fk_tipo_usuario,
                    perfil: usuario.perfil,
                    empresa: usuario.nome_fantasia || usuario.razao_social
                });
            } else if (resultadoAutenticar.length === 0) {
                return res.status(403).send("Email e/ou senha inválido(s)");
            } else {
                return res.status(403).send("Mais de um usuário com o mesmo login e senha!");
            }
        })
        .catch(function (erro) {
            console.error(erro);
            console.error("\nHouve um erro ao realizar o login! Erro: ", erro.sqlMessage || erro.message);
            return res.status(500).json(erro.sqlMessage || erro.message);
        });
}

function cadastrar(req, res) {
    var nome = req.body.nomeServer || req.body.nome;
    var email = req.body.emailServer || req.body.email;
    var senha = req.body.senhaServer || req.body.senha;
    var fkEmpresa = req.body.empresaServer || req.body.fkEmpresa || req.body.fk_empresa;
    var fkTipoUsuario = req.body.perfilServer || req.body.fkTipoUsuario || req.body.fk_tipo_usuario;

    if (!nome || String(nome).trim() === "") {
        return res.status(400).send("Seu nome está undefined ou em branco!");
    }
    if (!email || String(email).trim() === "") {
        return res.status(400).send("Seu email está undefined ou em branco!");
    }
    if (!senha || String(senha).trim() === "") {
        return res.status(400).send("Sua senha está undefined ou em branco!");
    }
    if (!fkEmpresa || String(fkEmpresa).trim() === "") {
        return res.status(400).send("Sua empresa está undefined ou em branco!");
    }
    if (!fkTipoUsuario || String(fkTipoUsuario).trim() === "") {
        return res.status(400).send("Seu perfil está undefined ou em branco!");
    }

    nome = String(nome).trim();
    email = String(email).trim().toLowerCase();
    senha = String(senha);
    fkEmpresa = Number(fkEmpresa);
    fkTipoUsuario = Number(fkTipoUsuario);

    if (isNaN(fkEmpresa) || isNaN(fkTipoUsuario)) {
        return res.status(400).send("ID de empresa ou perfil inválido!");
    }

    if (!email.includes("@")) {
        return res.status(400).send("O e-mail deve conter '@'!");
    }

    if (senha.length < 8) {
        return res.status(400).send("A senha deve ter no mínimo 8 caracteres!");
    }

    if (!/\d/.test(senha)) {
        return res.status(400).send("A senha deve conter pelo menos um número!");
    }

    var regexEspecial = /[!@#$%^&*(),.?":{}|<>_\-+=\\/~`[\]]/;
    if (!regexEspecial.test(senha)) {
        return res.status(400).send("A senha deve conter pelo menos um caractere especial!");
    }

    // Primeiro verifica se o e-mail já existe
    usuarioModel.buscarPorEmail(email)
        .then(function (usuariosExistentes) {
            if (usuariosExistentes.length > 0) {
                return res.status(409).send("Duplicate entry: Esse e-mail já foi cadastrado!");
            }

            return usuarioModel.cadastrar(nome, email, senha, fkEmpresa, fkTipoUsuario)
                .then(function (resultado) {
                    return res.status(201).json({
                        mensagem: "Usuário cadastrado com sucesso!",
                        id: resultado.insertId
                    });
                });
        })
        .catch(function (erro) {
            console.error(erro);
            console.error("\nHouve um erro ao realizar o cadastro! Erro: ", erro.sqlMessage || erro.message);

            if (erro.code === "ER_DUP_ENTRY") {
                return res.status(409).send("Duplicate entry: Esse e-mail já foi cadastrado!");
            }

            if (!res.headersSent) {
                return res.status(500).json(erro.sqlMessage || erro.message);
            }
        });
}

function listarPerfis(req, res) {
    usuarioModel.listarPerfis()
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error(erro);
            return res.status(500).json({
                mensagem: "Erro ao listar perfis de usuário.",
                erro: erro.sqlMessage || erro.message
            });
        });
}

module.exports = {
    autenticar,
    cadastrar,
    listarPerfis
};