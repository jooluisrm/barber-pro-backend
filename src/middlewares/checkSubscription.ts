// src/middlewares/checkSubscription.ts - VERSÃO CORRIGIDA

import { Response, NextFunction } from 'express';
import { prisma } from '../libs/prisma';
import { AuthRequest } from './authMiddlewareBarber'; // <-- 1. Importe nossa interface

export const checkSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
    // 2. Pegue o barbeariaId do objeto `user` que o `checkRole` forneceu
    const barbeariaId = req.user?.barbeariaId;

    if (!barbeariaId) {
        // Este erro não deveria acontecer se o checkRole for usado antes
        return res.status(401).json({ error: 'ID da barbearia não encontrado no token.' });
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
            return res.status(403).json({ error: 'Acesso negado. Sua assinatura expirou ou está inativa.' });
        }

        next();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao verificar a assinatura.' });
    }
};