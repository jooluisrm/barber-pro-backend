import { Request, Response, Router } from 'express';
import usuarioRoutes from './usuarioRoutes';
import barbeariaRoutes from './barbeariaRoutes';
import barbeiroRoutes from './barbeiroRoutes';
import agendamentoRoutes from './agendamentoRoutes';

import { prisma } from '../libs/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { autenticarToken } from '../middlewares/authMiddleware';

export const mainRouter = Router();

mainRouter.use('/usuario', usuarioRoutes);
mainRouter.use('/barbearia', barbeariaRoutes);
mainRouter.use('/barbeiro', barbeiroRoutes);
mainRouter.use('/agendamentos', agendamentoRoutes);

mainRouter.post('/barbearia/registrar', async (req: Request, res: Response) => {
    try {
        const { nome, email, senha, endereco, celular, telefone, latitude, longitude, fotoPerfil, descricao } = req.body;

        // 1️⃣ Validação de Campos
        if (!nome || !email || !senha || !endereco || !celular || !latitude || !longitude) {
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

// Rota para buscar todos os agendamentos da barbearia logada
mainRouter.get("/barbearia/agendamentos/:barbeariaId", async (req, res) => {
    try {
        const { barbeariaId } = req.params; // Obtém o ID da barbearia autenticada

        const agendamentos = await prisma.agendamento.findMany({
            where: { barbeariaId },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nome: true
                    },
                },
                barbeiro: {
                    select: {
                        id: true,
                        nome: true,
                    },
                },
                servico: {
                    select: {
                        id: true,
                        nome: true,
                        preco: true,
                    },
                },
            },
        });

        return res.json(agendamentos);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao buscar agendamentos" });
    }
});

mainRouter.put("/barbearia/agendamento/status/:agendamentoId", async (req, res) => {
    try {
        const { agendamentoId } = req.params; // Obtém o ID do agendamento
        const { status } = req.body; // Obtém o novo status enviado no corpo da requisição

        // Verifica se o status enviado é válido
        if (!["Confirmado", "Feito", "Cancelado"].includes(status)) {
            return res.status(400).json({ error: "Status inválido. O status deve ser 'Confirmado', 'Feito' ou 'Cancelado'." });
        }

        // Atualiza o status do agendamento no banco de dados
        const updatedAgendamento = await prisma.agendamento.update({
            where: { id: agendamentoId },
            data: { status },
        });

        return res.json(updatedAgendamento); // Retorna o agendamento atualizado
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao atualizar o status do agendamento" });
    }
});

mainRouter.post('/barbearia/barbeiro/register', async (req: Request, res: Response) => {
    try {
        const { nome, email, senha, telefone, fotoPerfil, barbeariaId } = req.body;

        // 1️⃣ Validação de Campos
        if (!nome || !email || !senha || !telefone || !barbeariaId) {
            return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
        }

        // 2️⃣ Verifica se o e-mail já está cadastrado
        const barbeiroExistente = await prisma.barbeiro.findUnique({
            where: { email },
        });

        if (barbeiroExistente) {
            return res.status(400).json({ error: 'E-mail já cadastrado.' });
        }

        // 3️⃣ Verifica se a barbearia existe
        const barbeariaExistente = await prisma.barbearia.findUnique({
            where: { id: barbeariaId },
        });

        if (!barbeariaExistente) {
            return res.status(404).json({ error: 'Barbearia não encontrada.' });
        }

        // 4️⃣ Criptografar a senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // 5️⃣ Criar o barbeiro no banco de dados
        const novoBarbeiro = await prisma.barbeiro.create({
            data: {
                nome,
                email,
                senha: senhaHash,
                telefone,
                fotoPerfil,
                barbeariaId,
            },
        });

        // 6️⃣ Retornar sucesso
        return res.status(201).json({ message: 'Barbeiro cadastrado com sucesso!', barbeiro: novoBarbeiro });
    } catch (error) {
        console.error('Erro ao registrar barbeiro:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.delete('/barbearia/barbeiro/:barbeiroId', async (req: Request, res: Response) => {
    try {
        const { barbeiroId } = req.params;

        // 🔹 Verifica se o barbeiro possui agendamentos pendentes
        const agendamentosPendentes = await prisma.agendamento.findFirst({
            where: { barbeiroId, status: "Confirmado" },
        });

        if (agendamentosPendentes) {
            return res.status(400).json({ error: "Este barbeiro possui agendamentos confirmados e não pode ser excluído." });
        }

        // 🔹 Verifica se o barbeiro existe
        const barbeiroExiste = await prisma.barbeiro.findUnique({
            where: { id: barbeiroId },
        });

        if (!barbeiroExiste) {
            return res.status(404).json({ error: "Barbeiro não encontrado." });
        }

        // 🔹 Verifica se o barbeiro tem horários cadastrados antes de tentar deletá-los
        const horariosExistem = await prisma.horarioTrabalho.findFirst({
            where: { barbeiroId },
        });

        if (horariosExistem) {
            await prisma.horarioTrabalho.deleteMany({
                where: { barbeiroId },
            });
        }

        // 🔹 Deleta o barbeiro
        await prisma.barbeiro.delete({
            where: { id: barbeiroId },
        });

        return res.status(200).json({ message: "Barbeiro deletado com sucesso!" });
    } catch (error) {
        console.error("Erro ao deletar barbeiro:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});

mainRouter.put("/barbearia/barbeiro/:barbeiroId", async (req: Request, res: Response) => {
    try {
        const { barbeiroId } = req.params;
        const { nome, telefone, email } = req.body;

        // 1️⃣ Validação de Campos
        if (!nome || !telefone || !email) {
            return res.status(400).json({ error: "Todos os campos (nome, telefone, email) devem ser preenchidos." });
        }

        // 2️⃣ Verificar se o barbeiro existe
        const barbeiroExistente = await prisma.barbeiro.findUnique({
            where: { id: barbeiroId },
        });

        if (!barbeiroExistente) {
            return res.status(404).json({ error: "Barbeiro não encontrado." });
        }

        // 3️⃣ Verificar se os dados enviados são iguais aos já cadastrados
        if (
            nome === barbeiroExistente.nome &&
            telefone === barbeiroExistente.telefone &&
            email === barbeiroExistente.email
        ) {
            return res.status(400).json({ error: "Altere pelo menos um campo para continuar." });
        }

        // 4️⃣ Verificar se o novo email já está cadastrado por outro barbeiro
        const emailEmUso = await prisma.barbeiro.findFirst({
            where: {
                email,
                id: { not: barbeiroId }, // Exclui o próprio barbeiro da busca
            },
        });

        if (emailEmUso) {
            return res.status(400).json({ error: "Este e-mail já está em uso por outro barbeiro." });
        }

        // 5️⃣ Atualizar os dados do barbeiro
        const barbeiroAtualizado = await prisma.barbeiro.update({
            where: { id: barbeiroId },
            data: { nome, telefone, email },
        });

        return res.status(200).json({ message: "Barbeiro atualizado com sucesso!", barbeiro: barbeiroAtualizado });
    } catch (error) {
        console.error("Erro ao atualizar barbeiro:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});


