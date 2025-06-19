// src/middlewares/checkSubscription.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../libs/prisma';

export const checkSubscription = async (req: Request, res: Response, next: NextFunction) => {
    // Assumimos que um middleware de autenticação anterior já validou o token
    // e anexou o ID do usuário ao objeto `req`, por exemplo `req.userId`
    const barbeariaId = (req as any).userId; // Adapte para como você anexa o usuário

    if (!barbeariaId) {
        return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
        const barbearia = await prisma.barbearia.findUnique({
            where: { id: barbeariaId },
            select: { stripeCurrentPeriodEnd: true }
        });

        const isActive = barbearia?.stripeCurrentPeriodEnd 
                         ? new Date(barbearia.stripeCurrentPeriodEnd) > new Date() 
                         : false;

        if (!isActive) {
            return res.status(403).json({ error: 'Acesso negado. Requer uma assinatura ativa.' });
        }

        // Se a assinatura estiver ativa, permite que a requisição continue
        next();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao verificar a assinatura.' });
    }
};