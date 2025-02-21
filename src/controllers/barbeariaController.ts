import { Request, Response } from 'express';
import { BuscarAvaliacoesPorBarbearia, BuscarBarbeariaPorNome, BuscarBarbeariasAtivas, BuscarBarbeariasPorNome, BuscarBarbeariasProximas, BuscarBarbeirosPorBarbearia, BuscarProdutosPorBarbearia, BuscarServicosPorBarbearia, CriarAvaliacao, ObterFormasPagamento, ObterHorariosFuncionamento } from '../services/barbeariaService';

export const obterBarbeariasProximas = async (req: Request, res: Response) => {
    try {
        const { latitude, longitude, raio = 50 } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: "Latitude e longitude são obrigatórios." });
        }

        const latUser = parseFloat(latitude as string);
        const lonUser = parseFloat(longitude as string);
        const raioKm = parseFloat(raio as string);

        const barbeariasProximas = await BuscarBarbeariasProximas(latUser, lonUser, raioKm);

        return res.json(barbeariasProximas);
    } catch (error) {
        console.error("Erro ao buscar barbearias próximas:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const obterBarbeariasAtivas = async (req: Request, res: Response) => {
    try {
        const barbearias = await BuscarBarbeariasAtivas();
        return res.status(200).json(barbearias);
    } catch (error) {
        console.error("Erro ao buscar barbearias:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const obterBarbeariasPorNome = async (req: Request, res: Response) => {
    try {
        const { nome } = req.params;

        if (!nome || typeof nome !== "string") {
            return res.status(400).json({ error: "O parâmetro 'nome' é obrigatório e deve ser uma string." });
        }

        const barbearias = await BuscarBarbeariasPorNome(nome);
        return res.status(200).json(barbearias);
    } catch (error) {
        console.error("Erro ao buscar barbearias:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const obterBarbeariaPorNome = async (req: Request, res: Response) => {
    try {
        const { nome } = req.params;

        const barbearia = await BuscarBarbeariaPorNome(nome);

        if (!barbearia) {
            return res.status(404).json({ error: "Barbearia não encontrada" });
        }

        return res.json(barbearia);
    } catch (error) {
        console.error("Erro ao buscar barbearia:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};

export const obterServicosPorBarbearia = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const servicos = await BuscarServicosPorBarbearia(id);

        if (servicos.length === 0) {
            return res.status(404).json({ error: 'Nenhum serviço encontrado para esta barbearia.' });
        }

        return res.status(200).json(servicos);
    } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        return res.status(500).json({ error: 'Erro ao buscar serviços.' });
    }
};

export const obterBarbeirosPorBarbearia = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const barbeiros = await BuscarBarbeirosPorBarbearia(id);

        if (barbeiros.length === 0) {
            return res.status(404).json({ error: 'Nenhum barbeiro encontrado para esta barbearia.' });
        }

        return res.status(200).json(barbeiros);
    } catch (error) {
        console.error('Erro ao buscar barbeiros:', error);
        return res.status(500).json({ error: 'Erro ao buscar barbeiros.' });
    }
};

export const obterProdutosPorBarbearia = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const produtos = await BuscarProdutosPorBarbearia(id);

        if (produtos.length === 0) {
            return res.status(404).json({ error: 'Nenhum produto encontrado para esta barbearia.' });
        }

        return res.status(200).json(produtos);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        return res.status(500).json({ error: 'Erro ao buscar produtos.' });
    }
};

export const obterAvaliacoesPorBarbearia = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const avaliacoes = await BuscarAvaliacoesPorBarbearia(id);

        if (avaliacoes.length === 0) {
            return res.status(404).json({ error: 'Nenhuma avaliação encontrada para esta barbearia.' });
        }

        // Formata as avaliações antes de retornar
        const avaliacoesFormatadas = avaliacoes.map(avaliacao => ({
            id: avaliacao.id,
            nota: avaliacao.nota,
            nome: avaliacao.usuario.nome,
            data: avaliacao.dataHora,
            comentario: avaliacao.comentario
        }));

        return res.status(200).json(avaliacoesFormatadas);
    } catch (error) {
        console.error('Erro ao buscar avaliações:', error);
        return res.status(500).json({ error: 'Erro ao buscar avaliações.' });
    }
};

export const criarAvaliacao = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // ID da barbearia
        const { usuarioId, nota, comentario } = req.body; // Dados do corpo da requisição

        // Validação dos dados recebidos
        if (!usuarioId || !nota) {
            return res.status(400).json({ error: 'Campos obrigatórios não preenchidos!' });
        }

        // Chama o Service para criar a avaliação
        const avaliacao = await CriarAvaliacao(id, usuarioId, nota, comentario);

        return res.status(201).json({
            message: 'Avaliação cadastrada com sucesso!',
            id: avaliacao.id,
        });
    } catch (error) {
        console.error('Erro ao criar avaliação:', error);
        return res.status(500).json({ error: 'Erro ao salvar avaliação.' });
    }
};

export const obterHorariosFuncionamento = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        // Chama o Service para obter os horários formatados
        const horarios = await ObterHorariosFuncionamento(barbeariaId);

        if (horarios.length === 0) {
            return res.status(404).json({ error: 'Nenhum horário de funcionamento cadastrado para essa barbearia.' });
        }

        return res.status(200).json(horarios);
    } catch (error) {
        console.error('Erro ao buscar horários de funcionamento:', error);
        return res.status(500).json({ error: 'Erro ao buscar horários de funcionamento.' });
    }
};

export const obterFormasPagamento = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        // Chama o Service para obter as formas de pagamento
        const formasPagamento = await ObterFormasPagamento(barbeariaId);

        if (formasPagamento.length === 0) {
            return res.status(404).json({ error: 'Nenhuma forma de pagamento cadastrada para essa barbearia.' });
        }

        return res.status(200).json(formasPagamento);
    } catch (error) {
        console.error('Erro ao buscar formas de pagamento:', error);
        return res.status(500).json({ error: 'Erro ao buscar formas de pagamento.' });
    }
};