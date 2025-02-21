import { Request, Response } from 'express';
import { BuscarBarbeariasAtivas, BuscarBarbeariasProximas } from '../services/barbeariaService';

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