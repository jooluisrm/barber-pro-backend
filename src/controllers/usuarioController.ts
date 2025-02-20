// src/controllers/usuarioController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as usuarioService from '../services/usuario';

// Controlador para registro de novo usuário
export const registrarUsuario = async (req: Request, res: Response) => {
    try {
        const { nome, email, senha, telefone } = req.body;

        // 1️⃣ Validação de Campos
        if (!nome || !email || !senha || !telefone) {
            return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
        }

        // 2️⃣ Verificar se o e-mail já está cadastrado
        const usuarioExistente = await usuarioService.BuscarEmail(email);
        if (usuarioExistente) {
            return res.status(400).json({ error: 'E-mail já cadastrado. Tente outro.' });
        }

        // 3️⃣ Criptografar a senha
        const senhaHash = await bcrypt.hash(senha, 10); // Hash da senha com salt 10

        // 4️⃣ Chama o Service para criar o usuário
        const novoUsuario = await usuarioService.createUser({
            nome,
            email,
            senha: senhaHash, // Salvar a senha criptografada
            telefone
        });

        // 5️⃣ Retornar sucesso
        return res.status(201).json({ message: 'Usuário cadastrado com sucesso!', usuario: novoUsuario });
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const SECRET_KEY = process.env.JWT_SECRET || 'seuSegredoSuperSeguro';

// Controlador para o login do usuário
export const loginUsuario = async (req: Request, res: Response) => {
    try {
        const { email, senha } = req.body;

        // 1️⃣ Validação de Campos
        if (!email || !senha) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        }

        // 2️⃣ Verifica se o usuário existe
        const usuario = await usuarioService.BuscarEmail(email);

        if (!usuario) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }

        // 3️⃣ Compara a senha enviada com a senha hash no banco
        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }

        // 4️⃣ Gera o token JWT
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email },
            SECRET_KEY,
            { expiresIn: '2h' } // Token expira em 2 horas
        );

        // 5️⃣ Retorna o token e os dados do usuário (exceto a senha)
        return res.status(200).json({
            message: 'Login realizado com sucesso!',
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                telefone: usuario.telefone,
                fotoPerfil: usuario.fotoPerfil
            },
            token
        });

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};