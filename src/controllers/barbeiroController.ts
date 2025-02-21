import { Request, Response } from 'express';
import { ObterHorariosDisponiveis } from '../services/barbeiroService';

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
