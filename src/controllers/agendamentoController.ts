import { Request, Response } from 'express';
import { CriarAgendamento } from '../services/agendamentoService';

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
