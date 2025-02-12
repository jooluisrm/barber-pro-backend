import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'seuSegredoSuperSeguro';

interface AuthRequest extends Request {
    usuario?: any; // Adicionamos um campo 'usuario' ao request
}

export const autenticarToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso não fornecido ou inválido.' });
    }

    const token = authHeader.split(' ')[1]; // Pega somente o token após "Bearer"

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.usuario = decoded; // Adiciona os dados do usuário ao request
        next(); // Continua para a próxima função
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
};
