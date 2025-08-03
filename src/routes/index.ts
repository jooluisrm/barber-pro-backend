import { Request, Response, Router } from 'express';
import usuarioRoutes from './usuarioRoutes';
import barbeariaRoutes from './barbeariaRoutes';
import barbeiroRoutes from './barbeiroRoutes';
import agendamentoRoutes from './agendamentoRoutes';
import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../libs/prisma';
import { AuthRequest } from '../middlewares/authMiddlewareBarber';

export const mainRouter = Router();

mainRouter.use('/usuario', usuarioRoutes);
mainRouter.use('/barbearia', barbeariaRoutes);
mainRouter.use('/barbeiro', barbeiroRoutes);
mainRouter.use('/agendamentos', agendamentoRoutes);



// Rota usando o seu novo formato - está correta e segura.
mainRouter.patch('/barbearia/:barbeariaId/agendamentos/:agendamentoId/concluir', async (req, res) => {
  // Pega ambos os IDs diretamente dos parâmetros da URL.
  const { agendamentoId, barbeariaId } = req.params;

  // A verificação `if (!barbeariaId)` é uma boa prática, embora o roteamento do Express
  // já garanta que o parâmetro exista se a rota for correspondida.
  if (!barbeariaId || !agendamentoId) {
    return res.status(400).json({
      error: 'O ID da barbearia e do agendamento são obrigatórios.'
    });
  }

  try {
    // A chamada ao Prisma permanece atômica e segura.
    // Ela só executa a atualização se um registro for encontrado
    // com o ID do agendamento, o ID da barbearia E o status "Confirmado".
    const agendamentoAtualizado = await prisma.agendamento.update({
      where: {
        id: agendamentoId,
        barbeariaId: barbeariaId,
        status: 'Confirmado',
      },
      data: {
        status: 'Feito',
      },
    });

    return res.status(200).json({ message: 'Agendamento concluído com sucesso!' });

  } catch (error: any) {
    // O tratamento de erro para o código 'P2025' continua sendo a forma ideal
    // de lidar com falhas na condição do 'where'.
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: "Operação falhou: o agendamento não foi encontrado, não pertence a esta barbearia ou seu status não permite a alteração."
      });
    }

    console.error('Erro ao concluir agendamento:', error);
    return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
  }
});

// Adicione esta rota ao seu arquivo mainRouter
mainRouter.patch('/barbearia/:barbeariaId/agendamentos/:agendamentoId/cancelar', async (req, res) => {
  // 1. Pega os IDs diretamente dos parâmetros da URL
  const { agendamentoId, barbeariaId } = req.params;

  // 2. Validação básica dos parâmetros
  if (!barbeariaId || !agendamentoId) {
    return res.status(400).json({
      error: 'O ID da barbearia e do agendamento são obrigatórios.'
    });
  }

  try {
    // 3. Tenta atualizar o agendamento de forma atômica e segura
    await prisma.agendamento.update({
      where: {
        // CONDIÇÕES PARA CANCELAR (DEVEM SER TODAS VERDADEIRAS):
        id: agendamentoId,          // O ID do agendamento deve corresponder
        barbeariaId: barbeariaId,    // O agendamento deve pertencer à barbearia
        status: 'Confirmado',        // O status atual DEVE ser "Confirmado"
      },
      data: {
        // Ação: Alterar o status para "Cancelado"
        status: 'Cancelado',
      },
    });

    // 4. Retorna uma mensagem de sucesso
    return res.status(200).json({ message: 'Agendamento cancelado com sucesso!' });

  } catch (error: any) {
    // 5. Tratamento de erro idêntico ao anterior, pois as causas da falha são as mesmas
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: "Operação falhou: o agendamento não foi encontrado, não pertence a esta barbearia ou seu status não permite a alteração."
      });
    }

    // Erro genérico para outras falhas inesperadas
    console.error('Erro ao cancelar agendamento:', error);
    return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
  }
});