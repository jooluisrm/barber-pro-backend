import { Router } from 'express';
import { prisma } from '../libs/prisma';
import { autenticarToken } from '../middlewares/authMiddleware';
import usuarioRoutes from './usuarioRoutes';
import barbeariaRoutes from './barbeariaRoutes';
import barbeiroRoutes from './barbeiroRoutes';
import agendamentoRoutes from './agendamentoRoutes';

export const mainRouter = Router();

mainRouter.use('/usuario', usuarioRoutes);
mainRouter.use('/barbearia', barbeariaRoutes);
mainRouter.use('/barbeiro', barbeiroRoutes);
mainRouter.use('/agendamentos', agendamentoRoutes);

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