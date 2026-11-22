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
                    fk_concessionaria: usuario.fk_concessionaria,
                    fk_tipo_usuario: usuario.fk_tipo_usuario,
                    perfil: usuario.perfil,
                    empresa: usuario.nome_fantasia || usuario.razao_social,
                    concessionaria: usuario.concessionaria
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
    var fkConcessionaria = req.body.concessionariaServer || req.body.fkConcessionaria || req.body.fk_concessionaria;

    if (!nome || !String(nome).trim()) {
        return res.status(400).send("Informe o nome do usuário.");
    }

    if (!email || !String(email).trim()) {
        return res.status(400).send("Informe o e-mail do usuário.");
    }

    if (!senha) {
        return res.status(400).send("Informe a senha.");
    }

    if (!fkTipoUsuario) {
        return res.status(400).send("Perfil de acesso não informado.");
    }

    nome = String(nome).trim();
    email = String(email).trim().toLowerCase();
    senha = String(senha);
    fkTipoUsuario = Number(fkTipoUsuario);

    if (fkEmpresa !== undefined && fkEmpresa !== null && String(fkEmpresa).trim() !== "") {
        fkEmpresa = Number(fkEmpresa);
        if (!Number.isInteger(fkEmpresa) || fkEmpresa <= 0) {
            return res.status(400).send("ID de empresa inválido.");
        }
    } else {
        fkEmpresa = null;
    }

    if (fkConcessionaria !== undefined && fkConcessionaria !== null && String(fkConcessionaria).trim() !== "") {
        fkConcessionaria = Number(fkConcessionaria);
        if (!Number.isInteger(fkConcessionaria) || fkConcessionaria <= 0) {
            fkConcessionaria = null;
        }
    } else {
        fkConcessionaria = null;
    }

    if (!Number.isInteger(fkTipoUsuario) || fkTipoUsuario <= 0) {
        return res.status(400).send("Perfil de usuário inválido.");
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

function listar(req, res) {
    usuarioModel.listar()
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error("Erro ao listar usuários:", erro);
            return res.status(500).send("Erro ao listar usuários.");
        });
}

function listarPorEmpresa(req, res) {
    var fkEmpresa = req.params.fkEmpresa || req.params.id;

    if (!fkEmpresa || isNaN(Number(fkEmpresa))) {
        return res.status(400).send("ID da empresa inválido.");
    }

    usuarioModel.listarPorEmpresa(Number(fkEmpresa))
        .then(function (resultado) {
            return res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error("Erro ao listar colaboradores da empresa:", erro);
            return res.status(500).send("Erro ao listar usuários da empresa.");
        });
}

function buscarPorId(req, res) {
    var id = req.params.id;

    if (!id || isNaN(Number(id))) {
        return res.status(400).send("ID de usuário inválido.");
    }

    usuarioModel.buscarPorId(Number(id))
        .then(function (resultado) {
            if (resultado.length === 0) {
                return res.status(404).send("Usuário não encontrado.");
            }
            return res.status(200).json(resultado[0]);
        })
        .catch(function (erro) {
            console.error("Erro ao buscar usuário por ID:", erro);
            return res.status(500).send("Erro ao buscar usuário.");
        });
}

function atualizar(req, res) {
    var id = req.params.id || req.body.id;
    var nome = req.body.nomeServer || req.body.nome;
    var email = req.body.emailServer || req.body.email;
    var fkTipoUsuario = req.body.perfilServer || req.body.fkTipoUsuario || req.body.fk_tipo_usuario;
    var fkConcessionaria = req.body.concessionariaServer || req.body.fkConcessionaria || req.body.fk_concessionaria;
    var novaSenha = req.body.senhaServer || req.body.senha || req.body.novaSenha;

    if (!id || isNaN(Number(id))) {
        return res.status(400).send("ID de usuário inválido.");
    }

    if (!nome || !String(nome).trim()) {
        return res.status(400).send("Informe o nome completo.");
    }

    if (!email || !String(email).trim() || !String(email).includes("@")) {
        return res.status(400).send("Informe um e-mail corporativo válido.");
    }

    if (!fkTipoUsuario || isNaN(Number(fkTipoUsuario))) {
        return res.status(400).send("Perfil de acesso inválido.");
    }

    id = Number(id);
    nome = String(nome).trim();
    email = String(email).trim().toLowerCase();
    fkTipoUsuario = Number(fkTipoUsuario);

    if (fkConcessionaria !== undefined && fkConcessionaria !== null && String(fkConcessionaria).trim() !== "" && !isNaN(Number(fkConcessionaria))) {
        fkConcessionaria = Number(fkConcessionaria);
        if (fkConcessionaria <= 0) fkConcessionaria = null;
    } else {
        fkConcessionaria = null;
    }

    if (novaSenha && String(novaSenha).trim() !== "") {
        novaSenha = String(novaSenha);
        if (novaSenha.length < 8) {
            return res.status(400).send("A nova senha deve ter no mínimo 8 caracteres.");
        }
        if (!/\d/.test(novaSenha)) {
            return res.status(400).send("A nova senha deve conter pelo menos um número.");
        }
        var regexEspecial = /[!@#$%^&*(),.?":{}|<>_\-+=\\/~`\[\]]/;
        if (!regexEspecial.test(novaSenha)) {
            return res.status(400).send("A nova senha deve conter pelo menos um caractere especial.");
        }
    } else {
        novaSenha = null;
    }

    // Verificar se o e-mail informado pertence a outro usuário
    usuarioModel.buscarPorEmail(email)
        .then(function (usuariosComMesmoEmail) {
            if (usuariosComMesmoEmail.length > 0 && usuariosComMesmoEmail[0].id !== id) {
                return res.status(409).send("Esse e-mail já está em uso por outro usuário.");
            }

            return usuarioModel.atualizar(id, nome, email, fkTipoUsuario, fkConcessionaria, novaSenha)
                .then(function (resultado) {
                    if (resultado.affectedRows === 0) {
                        return res.status(404).send("Usuário não encontrado.");
                    }

                    return res.status(200).json({
                        mensagem: "Usuário atualizado com sucesso!",
                        id: id
                    });
                });
        })
        .catch(function (erro) {
            console.error("Erro ao atualizar usuário:", erro);
            return res.status(500).send("Erro interno ao atualizar usuário.");
        });
}

function excluir(req, res) {
    var id = req.params.id;

    if (!id || isNaN(Number(id))) {
        return res.status(400).send("ID de usuário inválido.");
    }

    id = Number(id);

    usuarioModel.excluir(id)
        .then(function (resultado) {
            if (resultado.affectedRows === 0) {
                return res.status(404).send("Usuário não encontrado.");
            }
            return res.status(200).json({
                mensagem: "Usuário excluído com sucesso!"
            });
        })
        .catch(function (erro) {
            console.error("Erro ao excluir usuário:", erro);

            // Código MySQL 1451: ER_ROW_IS_REFERENCED_2 (chave estrangeira em chamados)
            if (erro.code === "ER_ROW_IS_REFERENCED_2" || erro.errno === 1451) {
                return res.status(409).send("Não é possível excluir este usuário pois ele possui chamados ou registros vinculados no sistema.");
            }

            return res.status(500).send("Erro interno ao excluir usuário.");
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

module.exports = {
    autenticar,
    cadastrar,
    listar,
    listarPorEmpresa,
    buscarPorId,
    atualizar,
    excluir,
    listarPerfis
};
