import { Request, Response, Router } from 'express';
import usuarioRoutes from './usuarioRoutes';
import barbeariaRoutes from './barbeariaRoutes';
import barbeiroRoutes from './barbeiroRoutes';
import agendamentoRoutes from './agendamentoRoutes';

import { prisma } from '../libs/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { autenticarToken } from '../middlewares/authMiddleware';
import { Prisma } from '@prisma/client';

export const mainRouter = Router();

mainRouter.use('/usuario', usuarioRoutes);
mainRouter.use('/barbearia', barbeariaRoutes);
mainRouter.use('/barbeiro', barbeiroRoutes);
mainRouter.use('/agendamentos', agendamentoRoutes);


mainRouter.post('/barbearia/agendamentos/visitante', async (req: Request, res: Response) => {
    try {
        // ID fixo do usuário (pode ser alterado facilmente aqui)
        const usuarioId = "visitante";

        const { barbeariaId, barbeiroId, servicoId, data, hora } = req.body;

        // Verificação de campos obrigatórios
        if (!barbeariaId || !barbeiroId || !servicoId || !data || !hora) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }

        // Verifica se o horário já está ocupado (mas permite se o status for "Cancelado")
        const agendamentoExistente = await prisma.agendamento.findFirst({
            where: {
                barbeiroId,
                data,
                hora,
            }
        });

        if (agendamentoExistente && agendamentoExistente.status !== "Cancelado") {
            return res.status(400).json({ error: 'Esse horário já está agendado para o barbeiro selecionado.' });
        }

        // Cria o agendamento
        const novoAgendamento = await prisma.agendamento.create({
            data: {
                usuarioId,
                barbeariaId,
                barbeiroId,
                servicoId,
                data,
                hora,
                status: 'Confirmado' // você pode deixar explícito o status se quiser
            }
        });

        return res.status(201).json(novoAgendamento);
    } catch (error) {
        console.error("Erro ao criar agendamento:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});