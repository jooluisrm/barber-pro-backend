import { Router } from 'express';
import { prisma } from '../libs/prisma';
import { autenticarToken } from '../middlewares/authMiddleware';
import usuarioRoutes from './usuarioRoutes';
import barbeariaRoutes from './barbeariaRoutes';
import barbeiroRoutes from './barbeiroRoutes';

export const mainRouter = Router();

mainRouter.use('/usuario', usuarioRoutes);
mainRouter.use('/barbearia', barbeariaRoutes);
mainRouter.use('/barbeiro', barbeiroRoutes);

mainRouter.post('/agendamentos', autenticarToken, async (req, res) => {
    const { usuarioId, barbeariaId, barbeiroId, servicoId, data, hora } = req.body;

    try {
        // Verificar se já existe um agendamento nesse horário para o barbeiro, mas permite se estiver cancelado
        const agendamentoExistente = await prisma.agendamento.findFirst({
            where: {
                barbeiroId,
                data,
                hora,
            },
        });

        // Se existir um agendamento, verificar se o status é Cancelado e permitir agendamento nesse caso
        if (agendamentoExistente && agendamentoExistente.status !== 'Cancelado') {
            return res.status(400).json({ error: 'Horário já agendado. Escolha outro horário.' });
        }

        // Se o agendamento estiver cancelado, podemos criar um novo agendamento nesse horário
        const novoAgendamento = await prisma.agendamento.create({
            data: {
                usuarioId,
                barbeariaId,
                barbeiroId,
                servicoId,
                data,
                hora,
                status: 'Confirmado', // Agendamento será confirmado automaticamente
            },
        });

        res.status(201).json(novoAgendamento);
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        res.status(500).json({ error: 'Erro ao criar agendamento.' });
    }
});

mainRouter.get('/agendamentos/:usuarioId', autenticarToken, async (req, res) => {
    const { usuarioId } = req.params;

    try {
        // Buscar todos os agendamentos do usuário
        const agendamentos = await prisma.agendamento.findMany({
            where: { usuarioId },
            select: {
                id: true,
                data: true,
                hora: true,
                status: true,
                barbearia: {
                    select: {
                        id: true,
                        nome: true,
                        endereco: true,
                        celular: true,
                    }
                },
                barbeiro: {
                    select: {
                        id: true,
                        nome: true,
                    }
                },
                servico: {
                    select: {
                        id: true,
                        nome: true,
                        preco: true,
                        duracao: true,
                    }
                }
            },
            orderBy: {
                data: 'asc', // Ordena os agendamentos pela data
            }
        });

        if (agendamentos.length === 0) {
            return res.status(404).json({ error: "Nenhum agendamento encontrado para este usuário." });
        }

        res.status(200).json(agendamentos);
    } catch (error) {
        console.error("Erro ao buscar agendamentos:", error);
        res.status(500).json({ error: "Erro ao buscar agendamentos." });
    }
});

mainRouter.put('/agendamentos/:agendamentoId/cancelar', autenticarToken, async (req, res) => {
    const { agendamentoId } = req.params;

    try {
        // Verificar se o agendamento existe
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId }
        });

        if (!agendamento) {
            return res.status(404).json({ error: "Agendamento não encontrado." });
        }

        // Verificar se o status do agendamento é diferente de "Cancelado" e "Feito"
        if (agendamento.status === "Cancelado" || agendamento.status === "Feito") {
            return res.status(400).json({ error: "Este agendamento não pode ser cancelado." });
        }

        // Atualizar o status para "Cancelado"
        const agendamentoCancelado = await prisma.agendamento.update({
            where: { id: agendamentoId },
            data: { status: "Cancelado" }
        });

        res.status(200).json({
            message: "Agendamento cancelado com sucesso.",
            agendamento: agendamentoCancelado
        });
    } catch (error) {
        console.error("Erro ao cancelar agendamento:", error);
        res.status(500).json({ error: "Erro ao cancelar o agendamento." });
    }
});

mainRouter.delete('/agendamentos/:agendamentoId', autenticarToken, async (req, res) => {
    const { agendamentoId } = req.params;

    try {
        // Verificar se o agendamento existe
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId }
        });

        if (!agendamento) {
            return res.status(404).json({ error: "Agendamento não encontrado." });
        }

        // Verificar se o status do agendamento é "Cancelado"
        if (agendamento.status !== "Cancelado") {
            return res.status(400).json({ error: "Este agendamento não pode ser deletado. Ele precisa estar com o status 'Cancelado'." });
        }

        // Deletar o agendamento
        await prisma.agendamento.delete({
            where: { id: agendamentoId }
        });

        res.status(200).json({
            message: "Agendamento deletado com sucesso."
        });
    } catch (error) {
        console.error("Erro ao deletar agendamento:", error);
        res.status(500).json({ error: "Erro ao deletar o agendamento." });
    }
});