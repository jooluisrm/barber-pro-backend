import { Request, Response, Router } from 'express';
import usuarioRoutes from './usuarioRoutes';
import barbeariaRoutes from './barbeariaRoutes';
import barbeiroRoutes from './barbeiroRoutes';
import agendamentoRoutes from './agendamentoRoutes';

import { prisma } from '../libs/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const mainRouter = Router();

mainRouter.use('/usuario', usuarioRoutes);
mainRouter.use('/barbearia', barbeariaRoutes);
mainRouter.use('/barbeiro', barbeiroRoutes);
mainRouter.use('/agendamentos', agendamentoRoutes);

mainRouter.post('/barbearia/registrar', async (req: Request, res: Response) => {
    try {
        const { nome, email, senha, endereco, celular, telefone, latitude, longitude, fotoPerfil, descricao } = req.body;

        // 1️⃣ Validação de Campos
        if (!nome || !email || !senha || !endereco || !celular || !latitude  || !longitude) {
            return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
        }

        // 2️⃣ Verifica se o e-mail ou nome já estão cadastrados
        const barbeariaExistente = await prisma.barbearia.findFirst({
            where: { OR: [{ email }, { nome }] },
        });

        if (barbeariaExistente) {
            return res.status(400).json({ error: 'Nome ou e-mail já cadastrados.' });
        }

        // 3️⃣ Criptografar a senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // 4️⃣ Criar a barbearia no banco de dados
        const novaBarbearia = await prisma.barbearia.create({
            data: {
                nome,
                email,
                senha: senhaHash,
                endereco,
                celular,
                telefone,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                fotoPerfil,
                descricao,
            },
        });

        // 5️⃣ Retornar sucesso
        return res.status(201).json({ message: 'Barbearia cadastrada com sucesso!', barbearia: novaBarbearia });
    } catch (error) {
        console.error('Erro ao registrar barbearia:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

const SECRET_KEY = process.env.JWT_SECRET || 'seuSegredoSuperSeguro';

mainRouter.post('/barbearia/login', async (req: Request, res: Response) => {
    try {
        const { email, senha } = req.body;

        // 1️⃣ Validação de Campos
        if (!email || !senha) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        }

        // 2️⃣ Verifica se a barbearia existe
        const barbearia = await prisma.barbearia.findUnique({ where: { email } });

        if (!barbearia) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }

        // 3️⃣ Compara a senha enviada com a senha hash no banco
        const senhaValida = await bcrypt.compare(senha, barbearia.senha);

        if (!senhaValida) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }

        // 4️⃣ Gera o token JWT
        const token = jwt.sign(
            { id: barbearia.id, email: barbearia.email },
            SECRET_KEY,
            { expiresIn: '2h' } // Token expira em 2 horas
        );

        // 5️⃣ Retorna o token e os dados da barbearia (exceto a senha)
        return res.status(200).json({
            message: 'Login realizado com sucesso!',
            barbearia: {
                id: barbearia.id,
                nome: barbearia.nome,
                email: barbearia.email,
                endereco: barbearia.endereco,
                celular: barbearia.celular,
                telefone: barbearia.telefone,
                fotoPerfil: barbearia.fotoPerfil,
                descricao: barbearia.descricao,
                status: barbearia.status
            },
            token
        });

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});