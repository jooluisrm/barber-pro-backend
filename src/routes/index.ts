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

mainRouter.get('/barbearia/:barbeariaId/redes-sociais', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        // Busca as redes sociais da barbearia específica
        const redesSociais = await prisma.redeSocial.findMany({
            where: { barbeariaId },
            orderBy: { rede: 'asc' }, // ordena por nome da rede social (opcional)
        });

        return res.status(200).json(redesSociais);
    } catch (error) {
        console.error('Erro ao buscar redes sociais da barbearia:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.post('/barbearia/:barbeariaId/redes-sociais', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;
        const { rede, link } = req.body;

        if (!barbeariaId || !rede || !link) {
            return res.status(400).json({ error: 'Barbearia, nome da rede e link são obrigatórios.' });
        }

        // Verifica se a rede já está cadastrada para essa barbearia
        const redeExistente = await prisma.redeSocial.findFirst({
            where: {
                barbeariaId,
                rede: {
                    equals: rede
                }
            }
        });

        if (redeExistente) {
            return res.status(400).json({ error: `A rede social "${rede}" já está cadastrada para esta barbearia.` });
        }

        // Cria a rede social
        const novaRede = await prisma.redeSocial.create({
            data: {
                barbeariaId,
                rede,
                link
            }
        });

        return res.status(201).json({
            message: 'Rede social criada com sucesso!',
            redeSocial: novaRede
        });

    } catch (error) {
        console.error('Erro ao criar rede social:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.put('/barbearia/:barbeariaId/redes-sociais/:redeId', async (req: Request, res: Response) => {
    try {
        const { barbeariaId, redeId } = req.params;
        const { link } = req.body;

        if (!link || typeof link !== 'string') {
            return res.status(400).json({ error: 'O link é obrigatório.' });
        }

        // Verifica se a rede social existe
        const redeExistente = await prisma.redeSocial.findFirst({
            where: {
                id: redeId,
                barbeariaId,
            },
        });

        if (!redeExistente) {
            return res.status(404).json({ error: 'Rede social não encontrada para esta barbearia.' });
        }

        // Verifica se houve alteração
        if (redeExistente.link === link) {
            return res.status(400).json({ error: 'Nenhuma alteração detectada. O link é igual ao atual.' });
        }

        // Atualiza o link
        const redeAtualizada = await prisma.redeSocial.update({
            where: { id: redeId },
            data: { link },
        });

        return res.status(200).json({
            message: 'Link da rede social atualizado com sucesso!',
            redeSocial: redeAtualizada,
        });
    } catch (error) {
        console.error('Erro ao editar link da rede social:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.delete('/barbearia/:barbeariaId/redes-sociais/:redeId', async (req: Request, res: Response) => {
    try {
        const { barbeariaId, redeId } = req.params;

        // Verifica se a rede social existe
        const redeExistente = await prisma.redeSocial.findFirst({
            where: {
                id: redeId,
                barbeariaId,
            },
        });

        if (!redeExistente) {
            return res.status(404).json({ error: 'Rede social não encontrada para esta barbearia.' });
        }

        // Deleta a rede social
        await prisma.redeSocial.delete({
            where: { id: redeId },
        });

        return res.status(200).json({ message: 'Rede social deletada com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar rede social:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.get('/barbearia/:barbeariaId/formas-pagamento', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        // Busca todas as formas de pagamento da barbearia
        const formasPagamento = await prisma.formaPagamento.findMany({
            where: { barbeariaId },
            orderBy: { tipo: 'asc' }, // Ordena por tipo de pagamento (opcional)
        });

        return res.status(200).json(formasPagamento);
    } catch (error) {
        console.error('Erro ao buscar formas de pagamento da barbearia:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.post('/barbearia/:barbeariaId/formas-pagamento', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;
        const { tipo } = req.body;

        // Verificação de dados obrigatórios
        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        if (!tipo || typeof tipo !== 'string' || tipo.trim() === '') {
            return res.status(400).json({ error: 'O tipo da forma de pagamento é obrigatório e deve ser uma string válida.' });
        }

        // Verifica se já existe essa forma de pagamento cadastrada
        const formaExistente = await prisma.formaPagamento.findFirst({
            where: {
                barbeariaId,
                tipo: {
                    equals: tipo
                },
            },
        });

        if (formaExistente) {
            return res.status(400).json({ error: 'Essa forma de pagamento já está cadastrada para a barbearia.' });
        }

        // Criação da forma de pagamento
        const novaForma = await prisma.formaPagamento.create({
            data: {
                barbeariaId,
                tipo: tipo.trim(),
            },
        });

        return res.status(201).json({
            message: 'Forma de pagamento criada com sucesso!',
            formaPagamento: novaForma,
        });
    } catch (error) {
        console.error('Erro ao criar forma de pagamento:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.delete('/barbearia/:barbeariaId/formas-pagamento/:formaPagamentoId', async (req: Request, res: Response) => {
    try {
        const { barbeariaId, formaPagamentoId } = req.params;

        if (!barbeariaId || !formaPagamentoId) {
            return res.status(400).json({ error: 'ID da barbearia e da forma de pagamento são obrigatórios.' });
        }

        // Verifica se a forma de pagamento existe e pertence à barbearia
        const formaPagamento = await prisma.formaPagamento.findFirst({
            where: {
                id: formaPagamentoId,
                barbeariaId: barbeariaId,
            },
        });

        if (!formaPagamento) {
            return res.status(404).json({ error: 'Forma de pagamento não encontrada para esta barbearia.' });
        }

        // Deleta a forma de pagamento
        await prisma.formaPagamento.delete({
            where: { id: formaPagamentoId },
        });

        return res.status(200).json({ message: 'Forma de pagamento deletada com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar forma de pagamento:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

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