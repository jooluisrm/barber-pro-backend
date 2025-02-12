import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'seuSegredoSuperSeguro';

export interface AuthRequest extends Request {
    usuario?: { id: string }; // Agora só armazena o ID do usuário
}

export const autenticarToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso não fornecido ou inválido.' });
    }

    const token = authHeader.split(' ')[1]; // Pega apenas o token após "Bearer"

    try {
        const decoded = jwt.verify(token, SECRET_KEY) as { id: string }; // Apenas ID do usuário
        req.usuario = { id: decoded.id }; // Salva apenas o ID do usuário na requisição
        next(); // Continua para a próxima função
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
};
