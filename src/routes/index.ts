import { Request, Response, Router } from 'express';
import usuarioRoutes from './usuarioRoutes';
import barbeariaRoutes from './barbeariaRoutes';
import barbeiroRoutes from './barbeiroRoutes';
import agendamentoRoutes from './agendamentoRoutes';

import { prisma } from '../libs/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { autenticarToken } from '../middlewares/authMiddleware';
import { Prisma } from '@prisma/client';

export const mainRouter = Router();

mainRouter.use('/usuario', usuarioRoutes);
mainRouter.use('/barbearia', barbeariaRoutes);
mainRouter.use('/barbeiro', barbeiroRoutes);
mainRouter.use('/agendamentos', agendamentoRoutes);


mainRouter.get('/barbearia/:barbeariaId/horarios-funcionamento', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        const horarios = await prisma.horariosFuncionamentoBarbearia.findMany({
            where: { barbeariaId },
            orderBy: { diaSemana: 'asc' }, // Ordena de Domingo (0) até Sábado (6)
        });

        return res.status(200).json(horarios);
    } catch (error) {
        console.error('Erro ao buscar horários de funcionamento:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.post('/barbearia/:barbeariaId/horario-funcionamento', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;
        const { diaSemana, horaInicio, horaFim } = req.body;

        if (!barbeariaId || diaSemana === undefined || !horaInicio || !horaFim) {
            return res.status(400).json({ error: 'Campos obrigatórios: barbeariaId, diaSemana, horaInicio, horaFim.' });
        }

        const dia = Number(diaSemana);
        if (isNaN(dia) || dia < 0 || dia > 6) {
            return res.status(400).json({ error: 'O campo "diaSemana" deve ser um número entre 0 e 6.' });
        }

        // Verificar se o horário já existe para esse dia na barbearia
        const horarioExistente = await prisma.horariosFuncionamentoBarbearia.findFirst({
            where: {
                barbeariaId,
                diaSemana: dia,
            },
        });

        if (horarioExistente) {
            return res.status(400).json({ error: 'Já existe um horário cadastrado para esse dia da semana nesta barbearia.' });
        }

        // Validar se horaInicio < horaFim
        const [inicioHoras, inicioMinutos] = horaInicio.split(':').map(Number);
        const [fimHoras, fimMinutos] = horaFim.split(':').map(Number);
        const inicioEmMinutos = inicioHoras * 60 + inicioMinutos;
        const fimEmMinutos = fimHoras * 60 + fimMinutos;

        if (inicioEmMinutos >= fimEmMinutos) {
            return res.status(400).json({ error: 'O horário de início deve ser menor que o horário de término.' });
        }

        // Criar novo horário
        const novoHorario = await prisma.horariosFuncionamentoBarbearia.create({
            data: {
                barbeariaId,
                diaSemana: dia,
                horaInicio,
                horaFim,
            },
        });

        return res.status(201).json({
            message: 'Horário de funcionamento cadastrado com sucesso!',
            horario: novoHorario,
        });
    } catch (error) {
        console.error('Erro ao cadastrar horário de funcionamento:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.put('/barbearia/:barbeariaId/horario-funcionamento/:horarioId', async (req: Request, res: Response) => {
    try {
        const { barbeariaId, horarioId } = req.params;
        const { horaInicio, horaFim } = req.body;

        // Verifica se os dados obrigatórios foram enviados
        if (!horaInicio || !horaFim) {
            return res.status(400).json({ error: 'Horário de início e fim são obrigatórios.' });
        }

        // Verifica se o horário de início é menor que o horário de fim
        const [hInicioH, hInicioM] = horaInicio.split(':').map(Number);
        const [hFimH, hFimM] = horaFim.split(':').map(Number);

        const minutosInicio = hInicioH * 60 + hInicioM;
        const minutosFim = hFimH * 60 + hFimM;

        if (minutosInicio >= minutosFim) {
            return res.status(400).json({ error: 'O horário de início deve ser menor que o horário de fim.' });
        }

        // Busca o horário existente
        const horarioExistente = await prisma.horariosFuncionamentoBarbearia.findFirst({
            where: {
                id: horarioId,
                barbeariaId,
            },
        });

        if (!horarioExistente) {
            return res.status(404).json({ error: 'Horário de funcionamento não encontrado.' });
        }

        // Verifica se os dados enviados são os mesmos
        if (
            horarioExistente.horaInicio === horaInicio &&
            horarioExistente.horaFim === horaFim
        ) {
            return res.status(400).json({ error: 'Nenhuma alteração detectada nos horários.' });
        }

        // Atualiza o horário
        const horarioAtualizado = await prisma.horariosFuncionamentoBarbearia.update({
            where: { id: horarioId },
            data: {
                horaInicio,
                horaFim,
            },
        });

        return res.status(200).json({
            message: 'Horário de funcionamento atualizado com sucesso!',
            horario: horarioAtualizado,
        });
    } catch (error) {
        console.error('Erro ao atualizar horário de funcionamento:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.delete('/barbearia/:barbeariaId/horario-funcionamento/:horarioId', async (req: Request, res: Response) => {
    try {
        const { barbeariaId, horarioId } = req.params;

        // Verifica se o horário existe e pertence à barbearia
        const horario = await prisma.horariosFuncionamentoBarbearia.findFirst({
            where: {
                id: horarioId,
                barbeariaId,
            },
        });

        if (!horario) {
            return res.status(404).json({ error: 'Horário de funcionamento não encontrado para esta barbearia.' });
        }

        // Deleta o horário
        await prisma.horariosFuncionamentoBarbearia.delete({
            where: { id: horarioId },
        });

        return res.status(200).json({ message: 'Horário de funcionamento deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar horário de funcionamento:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.post('/barbearia/agendamentos/visitante', async (req: Request, res: Response) => {
    try {
        // ID fixo do usuário (pode ser alterado facilmente aqui)
        const usuarioId = "visitante";

        const { barbeariaId, barbeiroId, servicoId, data, hora } = req.body;

        // Verificação de campos obrigatórios
        if (!barbeariaId || !barbeiroId || !servicoId || !data || !hora) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }

        // Verifica se o horário já está ocupado (mas permite se o status for "Cancelado")
        const agendamentoExistente = await prisma.agendamento.findFirst({
            where: {
                barbeiroId,
                data,
                hora,
            }
        });

        if (agendamentoExistente && agendamentoExistente.status !== "Cancelado") {
            return res.status(400).json({ error: 'Esse horário já está agendado para o barbeiro selecionado.' });
        }

        // Cria o agendamento
        const novoAgendamento = await prisma.agendamento.create({
            data: {
                usuarioId,
                barbeariaId,
                barbeiroId,
                servicoId,
                data,
                hora,
                status: 'Confirmado' // você pode deixar explícito o status se quiser
            }
        });

        return res.status(201).json(novoAgendamento);
    } catch (error) {
        console.error("Erro ao criar agendamento:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});