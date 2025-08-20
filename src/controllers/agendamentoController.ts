import { Request, Response } from 'express';
import { BuscarAgendamentosUsuario, CancelarAgendamento, criarAgendamentoUsuarioService, DeletarAgendamento } from '../services/agendamentoService';

export const criarAgendamento = async (req: Request, res: Response) => {
    try {
        const data = req.body;

        // Chama o Service refatorado para criar o agendamento
        const novoAgendamento = await criarAgendamentoUsuarioService(data);

        return res.status(201).json(novoAgendamento);
    } catch (error: any) {
        console.error('Erro ao criar agendamento:', error);
        return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao criar agendamento.' });
    }
};

export const buscarAgendamentosUsuario = async (req: Request, res: Response) => {
    try {
        const { usuarioId } = req.params;

        // Chama o Service para buscar os agendamentos do usuário
        const agendamentos = await BuscarAgendamentosUsuario(usuarioId);

        if (agendamentos.length === 0) {
            return res.status(404).json({ error: "Nenhum agendamento encontrado para este usuário." });
        }

        return res.status(200).json(agendamentos);
    } catch (error) {
        console.error("Erro ao buscar agendamentos:", error);
        return res.status(500).json({ error: "Erro ao buscar agendamentos." });
    }
};

export const cancelarAgendamento = async (req: Request, res: Response) => {
    try {
        const { agendamentoId } = req.params;

        // Chama o Service para cancelar o agendamento
        const agendamentoCancelado = await CancelarAgendamento(agendamentoId);

        if (!agendamentoCancelado) {
            return res.status(404).json({ error: "Agendamento não encontrado." });
        }

        return res.status(200).json({
            message: "Agendamento cancelado com sucesso.",
            agendamento: agendamentoCancelado
        });
    } catch (error) {
        console.error("Erro ao cancelar agendamento:", error);
        return res.status(500).json({ error: "Erro ao cancelar o agendamento." });
    }
};

export const deletarAgendamento = async (req: Request, res: Response) => {
    try {
        const { agendamentoId } = req.params;

        // Chama o Service para deletar o agendamento
        const agendamentoDeletado = await DeletarAgendamento(agendamentoId);

        if (!agendamentoDeletado) {
            return res.status(404).json({ error: "Agendamento não encontrado." });
        }

        return res.status(200).json({
            message: "Agendamento deletado com sucesso."
        });
    } catch (error: any) {
        console.error("Erro ao deletar agendamento:", error);

        // Verifica se o erro foi causado pelo status não ser "Cancelado"
        if (error.message === "Este agendamento não pode ser deletado. Ele precisa estar com o status 'Cancelado'.") {
            return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({ error: "Erro ao deletar o agendamento." });
    }
};