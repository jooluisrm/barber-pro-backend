import { Request, Response } from 'express';
import { BuscarBarbeariaPorNome, BuscarBarbeariasAtivas, BuscarBarbeariasPorNome, BuscarBarbeariasProximas, BuscarBarbeirosPorBarbearia, BuscarProdutosPorBarbearia, BuscarServicosPorBarbearia } from '../services/barbeariaService';

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