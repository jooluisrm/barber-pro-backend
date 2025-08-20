import { Request, Response } from 'express';
import { CancelarAgendamento, criarAgendamentoUsuarioService, DeletarAgendamento, getAgendamentosPorUsuarioService } from '../services/agendamentoService';
import { AuthRequest } from '../middlewares/authMiddleware';

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

export const getMeusAgendamentosController = async (req: AuthRequest, res: Response) => {
    try {
        // 1. Pega o ID do usuário DIRETAMENTE DO TOKEN. Muito mais seguro!
        const usuarioId = req.usuario?.id;
        if (!usuarioId) {
            return res.status(401).json({ error: "Usuário não autenticado." });
        }

        // 2. Pega o filtro da query string (ex: ?filtro=passados)
        const { filtro } = req.query as { filtro?: 'futuros' | 'passados' };

        const agendamentos = await getAgendamentosPorUsuarioService({
            usuarioId,
            filtro,
        });

        // Retorna um array vazio com status 200 se não houver agendamentos,
        // o que é melhor para o frontend.
        return res.status(200).json(agendamentos);

    } catch (error) {
        console.error("Erro ao buscar meus agendamentos:", error);
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