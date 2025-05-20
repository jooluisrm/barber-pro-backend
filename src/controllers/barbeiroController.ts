import { Request, Response } from 'express';
import { createHorarioService, deleteHorariosService, ObterHorariosDisponiveis } from '../services/barbeiroService';

export const obterHorariosDisponiveis = async (req: Request, res: Response) => {
    try {
        const { barbeiroId, data, hora } = req.params;

        // Chama o Service para obter os horários disponíveis
        const horariosDisponiveis = await ObterHorariosDisponiveis(barbeiroId, data, hora);

        if (horariosDisponiveis.length === 0) {
            return res.status(404).json({ error: 'Nenhum horário disponível para este barbeiro nesta data.' });
        }

        return res.status(200).json(horariosDisponiveis);
    } catch (error) {
        console.error('Erro ao buscar horários de trabalho do barbeiro:', error);
        return res.status(500).json({ error: 'Erro ao buscar horários de trabalho do barbeiro.' });
    }
};

export const createHorarioController = async (req: Request, res: Response) => {
    try {
        const { barbeiroId } = req.params;
        const { diaSemana, hora } = req.body;

        const novoHorario = await createHorarioService(barbeiroId, diaSemana, hora);

        return res.status(201).json({ message: 'Horário criado com sucesso!', horario: novoHorario });
    } catch (error: any) {
        console.error('Erro ao criar horário de trabalho:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Erro interno do servidor.' });
    }
};

export const deleteHorariosController = async (req: Request, res: Response) => {
    try {
        const { barbeiroId } = req.params;
        const { horarios } = req.body;

        await deleteHorariosService(barbeiroId, horarios);

        return res.status(200).json({ message: 'Horários deletados e agendamentos (se houver) cancelados com sucesso!' });
    } catch (error: any) {
        console.error('Erro ao deletar horários e cancelar agendamentos:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Erro interno do servidor.' });
    }
};