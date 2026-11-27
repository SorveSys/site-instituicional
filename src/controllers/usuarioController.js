var usuarioModel = require("../models/usuarioModel");
var concessionariaModel = require("../models/concessionariaModel");
var escopoUsuario = require("../utils/escopoUsuario");

var REGEX_ESPECIAL = /[!@#$%^&*(),.?":{}|<>_\-+=\\/~`\[\]]/;

function validarSenha(senha) {
    if (senha.length < 8) {
        return "A senha deve ter no mínimo 8 caracteres.";
    }
    if (!/\d/.test(senha)) {
        return "A senha deve conter pelo menos um número.";
    }
    if (!REGEX_ESPECIAL.test(senha)) {
        return "A senha deve conter pelo menos um caractere especial.";
    }
    return null;
}

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
                    fk_concessionaria: usuario.fk_concessionaria,
                    fk_tipo_usuario: usuario.fk_tipo_usuario,
                    perfil: usuario.perfil,
                    empresa: usuario.nome_fantasia || usuario.razao_social,
                    nome_praca: usuario.nome_praca || null
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
    var fkConcessionaria = req.body.concessionariaServer || req.body.fkConcessionaria || req.body.fk_concessionaria || null;
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

    if ((!fkEmpresa && !fkConcessionaria) || !fkTipoUsuario) {
        return res.status(400).send("Empresa/concessionária ou perfil não informado.");
    }

    nome = String(nome).trim();
    email = String(email).trim().toLowerCase();
    senha = String(senha);
    fkEmpresa = fkEmpresa ? Number(fkEmpresa) : null;
    fkConcessionaria = fkConcessionaria ? Number(fkConcessionaria) : null;
    fkTipoUsuario = Number(fkTipoUsuario);

    if (
        (fkEmpresa !== null && (!Number.isInteger(fkEmpresa) || fkEmpresa <= 0)) ||
        (fkConcessionaria !== null && (!Number.isInteger(fkConcessionaria) || fkConcessionaria <= 0)) ||
        !Number.isInteger(fkTipoUsuario) || fkTipoUsuario <= 0
    ) {
        return res.status(400).send("ID de empresa, concessionária ou perfil inválido.");
    }

    if (!email.includes("@")) {
        return res.status(400).send("O e-mail deve conter '@'.");
    }

    var erroSenha = validarSenha(senha);
    if (erroSenha) {
        return res.status(400).send(erroSenha);
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
                fkTipoUsuario,
                fkConcessionaria
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

function listar(req, res) {
    var ctx = req.usuarioContexto;

    usuarioModel.listarPorEscopo(ctx)
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error("Erro ao listar usuários:", erro);
            return res.status(500).json({
                mensagem: "Erro ao consultar usuários no banco de dados."
            });
        });
}

function atualizar(req, res) {
    var ctx = req.usuarioContexto;
    var id = escopoUsuario.inteiroPositivo(req.params.id);

    if (!id) {
        return res.status(400).json({ mensagem: "ID de usuário inválido." });
    }

    var body = req.body || {};
    var nome = String(body.nome || body.nomeServer || "").trim();
    var email = String(body.email || body.emailServer || "").trim().toLowerCase();
    var fkTipoUsuario = escopoUsuario.inteiroPositivo(body.fk_tipo_usuario || body.fkTipoUsuario || body.perfilServer);
    var concBruta = body.fk_concessionaria !== undefined ? body.fk_concessionaria : body.fkConcessionaria;
    var fkConcessionaria = (concBruta === "" || concBruta === null || concBruta === undefined)
        ? null
        : escopoUsuario.inteiroPositivo(concBruta);
    var novaSenha = body.senha ? String(body.senha) : "";

    if (!nome || !email || !fkTipoUsuario) {
        return res.status(400).json({
            mensagem: "Preencha os campos obrigatórios (Nome, E-mail e Perfil)."
        });
    }

    if (nome.length > 200) {
        return res.status(400).json({ mensagem: "O nome deve ter no máximo 200 caracteres." });
    }

    if (email.length > 350 || !email.includes("@")) {
        return res.status(400).json({ mensagem: "Informe um e-mail corporativo válido." });
    }

    if (concBruta !== "" && concBruta !== null && concBruta !== undefined && !fkConcessionaria) {
        return res.status(400).json({ mensagem: "ID de concessionária inválido." });
    }

    if (novaSenha) {
        var erroSenha = validarSenha(novaSenha);
        if (erroSenha) {
            return res.status(400).json({ mensagem: erroSenha });
        }
    }

    Promise.all([
        usuarioModel.buscarPorId(id),
        usuarioModel.buscarPerfilPorId(fkTipoUsuario),
        usuarioModel.buscarPorEmail(email),
        fkConcessionaria ? concessionariaModel.buscarPorId(fkConcessionaria) : Promise.resolve([])
    ])
        .then(function (resultados) {
            var encontrados = resultados[0];
            var perfis = resultados[1];
            var usuariosComEmail = resultados[2];
            var concessionarias = resultados[3];

            if (!encontrados || encontrados.length === 0) {
                return res.status(404).json({ mensagem: "Usuário não encontrado." });
            }

            var alvo = encontrados[0];
            if (!escopoUsuario.usuarioNoEscopo(ctx, alvo)) {
                return res.status(403).json({
                    mensagem: "Você não tem permissão para editar este usuário."
                });
            }

            if (!perfis || perfis.length === 0) {
                return res.status(400).json({ mensagem: "Perfil selecionado não existe no banco de dados." });
            }

            var emailEmUso = (usuariosComEmail || []).some(function (u) {
                return Number(u.id) !== id;
            });
            if (emailEmUso) {
                return res.status(409).json({ mensagem: "Esse e-mail já está em uso por outro usuário." });
            }

            if (fkConcessionaria) {
                if (!concessionarias || concessionarias.length === 0) {
                    return res.status(400).json({ mensagem: "Concessionária selecionada não encontrada." });
                }
                if (!escopoUsuario.concessionariaNoEscopo(ctx, concessionarias[0])) {
                    return res.status(403).json({
                        mensagem: "A concessionária selecionada não pertence ao seu escopo de permissão."
                    });
                }
            }

            var ehPerfilAnalista = String(perfis[0].tipo || "").toLowerCase() === "analista";
            var fkEmpresaSalvar = ctx.fk_empresa;
            var fkConcessionariaSalvar = fkConcessionaria;

            // Segue o padrão do banco: Analista vinculado a praça fica com fk_concessionaria e fk_empresa NULL;
            // Gestor da empresa fica com fk_empresa preenchido (e fk_concessionaria NULL se acesso global).
            if (ehPerfilAnalista && fkConcessionariaSalvar) {
                fkEmpresaSalvar = null;
            }

            return usuarioModel.atualizar(
                id,
                nome,
                email,
                fkEmpresaSalvar,
                fkConcessionariaSalvar,
                fkTipoUsuario,
                novaSenha || null
            )
                .then(function () {
                    return usuarioModel.buscarPorId(id);
                })
                .then(function (atualizado) {
                    return res.status(200).json({
                        mensagem: "Usuário atualizado com sucesso!",
                        usuario: atualizado[0] || null
                    });
                });
        })
        .catch(function (erro) {
            console.error("Erro ao atualizar usuário:", erro);
            if (!res.headersSent) {
                return res.status(500).json({
                    mensagem: "Erro ao atualizar usuário no banco de dados."
                });
            }
        });
}

function excluir(req, res) {
    var ctx = req.usuarioContexto;
    var id = escopoUsuario.inteiroPositivo(req.params.id);

    if (!id) {
        return res.status(400).json({ mensagem: "ID de usuário inválido." });
    }

    if (id === ctx.id) {
        return res.status(400).json({
            mensagem: "Você não pode excluir o próprio usuário atualmente autenticado."
        });
    }

    usuarioModel.buscarPorId(id)
        .then(function (encontrados) {
            if (!encontrados || encontrados.length === 0) {
                return res.status(404).json({ mensagem: "Usuário não encontrado." });
            }

            if (!escopoUsuario.usuarioNoEscopo(ctx, encontrados[0])) {
                return res.status(403).json({
                    mensagem: "Você não tem permissão para excluir este usuário."
                });
            }

            return usuarioModel.contarChamadosPorUsuario(id)
                .then(function (resChamados) {
                    var totalChamados = resChamados && resChamados[0] ? Number(resChamados[0].total) : 0;
                    if (totalChamados > 0) {
                        return res.status(409).json({
                            mensagem: "Não é possível excluir este usuário pois existem " + totalChamados + " chamado(s) vinculado(s) a ele."
                        });
                    }

                    return usuarioModel.excluir(id).then(function () {
                        return res.status(200).json({
                            mensagem: "Usuário removido com sucesso!"
                        });
                    });
                });
        })
        .catch(function (erro) {
            console.error("Erro ao excluir usuário:", erro);
            if (erro.code === "ER_ROW_IS_REFERENCED_2") {
                return res.status(409).json({
                    mensagem: "Não é possível excluir este usuário pois existem registros vinculados a ele."
                });
            }
            if (!res.headersSent) {
                return res.status(500).json({
                    mensagem: "Erro ao excluir usuário no banco de dados."
                });
            }
        });
}

module.exports = {
    autenticar,
    cadastrar,
    listarPerfis,
    listarPorEmpresa,
    listar,
    atualizar,
    excluir
};
