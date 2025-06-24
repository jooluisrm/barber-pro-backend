// src/middlewares/authMiddlewareBarber.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'minhaSuperChaveSecreta';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    barbeariaId: string;
  };
}

/**
 * Middleware flexível para verificar autenticação e permissões (roles).
 * @param allowedRoles - Um array de STRINGS com as funções permitidas (ex: ["ADMIN", "BARBEIRO"]).
 */
export const checkRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
    }

    try {
      const decoded = jwt.verify(token, SECRET_KEY) as { id: string, email: string, role: string, barbeariaId: string };

      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Acesso proibido. Você não tem permissão.' });
      }
      
      req.user = decoded;
      return next();

    } catch (err) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
  };
};