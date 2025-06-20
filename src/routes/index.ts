import { Request, Response, Router } from 'express';
import usuarioRoutes from './usuarioRoutes';
import barbeariaRoutes from './barbeariaRoutes';
import barbeiroRoutes from './barbeiroRoutes';
import agendamentoRoutes from './agendamentoRoutes';
import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../libs/prisma';

export const mainRouter = Router();

mainRouter.use('/usuario', usuarioRoutes);
mainRouter.use('/barbearia', barbeariaRoutes);
mainRouter.use('/barbeiro', barbeiroRoutes);
mainRouter.use('/agendamentos', agendamentoRoutes);


mainRouter.get('/barbearia/agendamentos/pendente/:barbeariaId', async (req, res) => {
  const { barbeariaId } = req.params;

  if (!barbeariaId) {
    return res.status(400).json({ // Mudado para 400 Bad Request, pois o ID é parte da URL
      error: 'ID da barbearia é obrigatório.'
    });
  }

  try {
    const agora = new Date();
    const hojeString = agora.toISOString().split('T')[0];
    const horaAtualString = agora.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // 1. REALIZAR A BUSCA COM 'SELECT' PARA ESCOLHER OS CAMPOS
    const agendamentosDoBanco = await prisma.agendamento.findMany({
      where: {
        barbeariaId: barbeariaId,
        status: 'Confirmado',
        OR: [
          { data: { lt: hojeString } },
          { data: hojeString, hora: { lt: horaAtualString } },
        ],
      },
      // Usando 'select' para buscar apenas os dados necessários
      select: {
        id: true, // id do Agendamento
        status: true,
        data: true,
        hora: true,
        usuario: {
          select: {
            nome: true // nome do Cliente
          }
        },
        servico: {
          select: {
            nome: true, // nome do Serviço
            preco: true // valor do Serviço
          }
        },
        barbeiro: {
          select: {
            nome: true // nome do Barbeiro
          }
        }
      },
      orderBy: [
        { data: 'asc' },
        { hora: 'asc' },
      ],
    });

    // 2. FORMATAR O RESULTADO PARA O JSON FINAL
    // Opcional, mas recomendado para ter uma API mais limpa e desacoplada do schema do banco
    const agendamentosFormatados = agendamentosDoBanco.map(agendamento => {
      return {
        idAgendamento: agendamento.id,
        status: agendamento.status,
        data: agendamento.data,
        hora: agendamento.hora,
        valor: agendamento.servico.preco,
        nomeCliente: agendamento.usuario.nome,
        nomeBarbeiro: agendamento.barbeiro.nome,
        nomeServico: agendamento.servico.nome
      }
    });

    // 3. Retornar a lista de agendamentos já formatada
    return res.status(200).json(agendamentosFormatados);

  } catch (error) {
    console.error('Erro ao buscar agendamentos vencidos:', error);
    return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
  }
});