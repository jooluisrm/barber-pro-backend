import { Request, Response } from 'express';
import { BuscarAgendamentosUsuario, CriarAgendamento } from '../services/agendamentoService';

export const criarAgendamento = async (req: Request, res: Response) => {
    try {
        const { usuarioId, barbeariaId, barbeiroId, servicoId, data, hora } = req.body;

        // Chama o Service para criar o agendamento
        const novoAgendamento = await CriarAgendamento(usuarioId, barbeariaId, barbeiroId, servicoId, data, hora);

        return res.status(201).json(novoAgendamento);
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        return res.status(500).json({ error: 'Erro ao criar agendamento.' });
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