
var usuarioModel = require("../models/usuarioModel");

function autenticar(req, res) {
    var email = req.body.emailServer || req.body.email;
    var senha = req.body.senhaServer || req.body.senha;

    if (!email || !senha) {
        return res.status(400).send("Informe o e-mail e a senha.");
    }

    usuarioModel.autenticar(email, senha)
        .then(function (resultado) {
            if (resultado.length === 1) {
                var usuario = resultado[0];

                return res.json({
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    fk_empresa: usuario.fk_empresa,
                    fk_tipo_usuario: usuario.fk_tipo_usuario,
                    perfil: usuario.perfil,
                    empresa: usuario.nome_fantasia || usuario.razao_social
                });
            }

            return res.status(403).send("E-mail e/ou senha inválido(s).");
        })
        .catch(function (erro) {
            console.error(erro);
            return res.status(500).send("Erro ao realizar login.");
        });
}

function cadastrar(req, res) {
    var nome = req.body.nomeServer || req.body.nome;
    var email = req.body.emailServer || req.body.email;
    var senha = req.body.senhaServer || req.body.senha;
    var fkEmpresa = req.body.empresaServer || req.body.fkEmpresa || req.body.fk_empresa;
    var fkTipoUsuario = req.body.perfilServer || req.body.fkTipoUsuario || req.body.fk_tipo_usuario;

    if (!nome || !String(nome).trim()) {
        return res.status(400).send("Informe o nome do usuário.");
    }

    if (!email || !String(email).trim()) {
        return res.status(400).send("Informe o e-mail do usuário.");
    }

    if (!senha) {
        return res.status(400).send("Informe a senha.");
    }

    if (!fkEmpresa || !fkTipoUsuario) {
        return res.status(400).send("Empresa ou perfil não informado.");
    }

    nome = String(nome).trim();
    email = String(email).trim().toLowerCase();
    senha = String(senha);
    fkEmpresa = Number(fkEmpresa);
    fkTipoUsuario = Number(fkTipoUsuario);

    if (!Number.isInteger(fkEmpresa) || fkEmpresa <= 0 ||
        !Number.isInteger(fkTipoUsuario) || fkTipoUsuario <= 0) {
        return res.status(400).send("ID de empresa ou perfil inválido.");
    }

    if (!email.includes("@")) {
        return res.status(400).send("O e-mail deve conter '@'.");
    }

    if (senha.length < 8) {
        return res.status(400).send("A senha deve ter no mínimo 8 caracteres.");
    }

    if (!/\d/.test(senha)) {
        return res.status(400).send("A senha deve conter pelo menos um número.");
    }

    var regexEspecial = /[!@#$%^&*(),.?":{}|<>_\-+=\\/~`\[\]]/;

    if (!regexEspecial.test(senha)) {
        return res.status(400).send("A senha deve conter pelo menos um caractere especial.");
    }

    usuarioModel.buscarPorEmail(email)
        .then(function (usuariosExistentes) {
            if (usuariosExistentes.length > 0) {
                return res.status(409).send("Esse e-mail já foi cadastrado.");
            }

            return usuarioModel.cadastrar(
                nome,
                email,
                senha,
                fkEmpresa,
                fkTipoUsuario
            ).then(function (resultado) {
                return res.status(201).json({
                    mensagem: "Usuário cadastrado com sucesso!",
                    id: resultado.insertId
                });
            });
        })
        .catch(function (erro) {
            console.error(erro);

            if (erro.code === "ER_DUP_ENTRY") {
                return res.status(409).send("Esse e-mail já foi cadastrado.");
            }

            if (!res.headersSent) {
                return res.status(500).send("Erro ao cadastrar usuário.");
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
                mensagem: "Erro ao listar perfis."
            });
        });
}

function listarPorEmpresa(req, res) {
    var fkEmpresa = Number(req.params.id);

    if (!Number.isInteger(fkEmpresa) || fkEmpresa <= 0) {
        return res.status(400).json({
            mensagem: "ID da empresa inválido."
        });
    }

    usuarioModel.listarPorEmpresa(fkEmpresa)
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error(erro);
            return res.status(500).json({
                mensagem: "Erro ao listar usuários da empresa."
            });
        });
}

module.exports = {
    autenticar,
    cadastrar,
    listarPerfis,
    listarPorEmpresa
};
