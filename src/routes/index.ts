import { Router } from 'express';
import { prisma } from '../libs/prisma';
import { autenticarToken } from '../middlewares/authMiddleware';
import usuarioRoutes from './usuarioRoutes';
import barbeariaRoutes from './barbeariaRoutes';

export const mainRouter = Router();

mainRouter.use('/usuario', usuarioRoutes);
mainRouter.use('/barbearia', barbeariaRoutes);

mainRouter.get("/barbearia/:barbeariaId/redes-sociais", async (req, res) => {
    const { barbeariaId } = req.params;

    try {
        const redesSociais = await prisma.redeSocial.findMany({
            where: { barbeariaId },
            select: {
                id: true,
                link: true,
                rede: true,
            },
        });

        if (redesSociais.length === 0) {
            return res.status(404).json({ error: "Nenhuma rede social cadastrada para essa barbearia." });
        }

        res.status(200).json(redesSociais);
    } catch (error) {
        console.error("Erro ao buscar redes sociais:", error);
        res.status(500).json({ error: "Erro ao buscar redes sociais." });
    }
});


mainRouter.get('/barbeiro/:barbeiroId/horarios/:data/:hora', async (req, res) => {
    const { barbeiroId, data, hora } = req.params;

    try {
        // 🔥 Garantir que a data seja interpretada corretamente no fuso local
        const [ano, mes, dia] = data.split("-").map(Number);
        const dataEscolhida = new Date(ano, mes - 1, dia); // Ajuste para o mês (0-indexado)
        const diaSemana = dataEscolhida.getDay();

        // Buscar os horários de trabalho do barbeiro apenas para esse dia da semana
        const horarios = await prisma.horarioTrabalho.findMany({
            where: {
                barbeiroId: barbeiroId,
                diaSemana: diaSemana, // Filtra pelo dia da semana correspondente
            },
            select: {
                hora: true,
                id: true
            },
        });

        // Se não houver horários cadastrados para esse dia da semana, retorna erro
        if (horarios.length === 0) {
            return res.status(404).json({ error: 'Nenhum horário cadastrado para este barbeiro neste dia da semana.' });
        }

        // Buscar os agendamentos existentes para o barbeiro e a data específica
        const agendamentos = await prisma.agendamento.findMany({
            where: {
                barbeiroId: barbeiroId,
                data: data,
            },
        });

        // Criar um array de horários ocupados (horários que já têm agendamentos)
        const horariosOcupados = agendamentos.map(agendamento => {
            // Verificar o status do agendamento
            if (agendamento.status !== 'Cancelado') {
                return agendamento.hora;
            }
            // Se estiver cancelado, permitir que seja mostrado
            return null; // Não bloqueia horário cancelado
        }).filter(Boolean); // Remover valores nulos (cancelados)

        // Filtrar os horários disponíveis (remover os horários ocupados)
        let horariosDisponiveis = horarios.filter(horario => !horariosOcupados.includes(horario.hora));

        // 🔥 Se a data da requisição for hoje, remover horários que já passaram
        const agora = new Date();
        const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString().split("T")[0];

        if (data === hoje) {
            // Converter a hora passada na URL para minutos do dia
            const [horaAtual, minutoAtual] = hora.split(":").map(Number);
            const minutosAgora = horaAtual * 60 + minutoAtual;

            // Filtrar horários que ainda não passaram
            horariosDisponiveis = horariosDisponiveis.filter(horario => {
                const [hora, minuto] = horario.hora.split(":").map(Number);
                const minutosHorario = hora * 60 + minuto;
                return minutosHorario > minutosAgora;
            });
        }

        // Se não houver horários disponíveis, retorna erro
        if (horariosDisponiveis.length === 0) {
            return res.status(404).json({ error: 'Nenhum horário disponível para este barbeiro nesta data.' });
        }

        // Retornar os horários disponíveis
        res.status(200).json(horariosDisponiveis);
    } catch (error) {
        console.error('Erro ao buscar os horários:', error);
        res.status(500).json({ error: 'Erro ao buscar horários de trabalho do barbeiro.' });
    }
});





mainRouter.post('/agendamentos', autenticarToken, async (req, res) => {
    const { usuarioId, barbeariaId, barbeiroId, servicoId, data, hora } = req.body;

    try {
        // Verificar se já existe um agendamento nesse horário para o barbeiro, mas permite se estiver cancelado
        const agendamentoExistente = await prisma.agendamento.findFirst({
            where: {
                barbeiroId,
                data,
                hora,
            },
        });

        // Se existir um agendamento, verificar se o status é Cancelado e permitir agendamento nesse caso
        if (agendamentoExistente && agendamentoExistente.status !== 'Cancelado') {
            return res.status(400).json({ error: 'Horário já agendado. Escolha outro horário.' });
        }

        // Se o agendamento estiver cancelado, podemos criar um novo agendamento nesse horário
        const novoAgendamento = await prisma.agendamento.create({
            data: {
                usuarioId,
                barbeariaId,
                barbeiroId,
                servicoId,
                data,
                hora,
                status: 'Confirmado', // Agendamento será confirmado automaticamente
            },
        });

        res.status(201).json(novoAgendamento);
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        res.status(500).json({ error: 'Erro ao criar agendamento.' });
    }
});


mainRouter.get('/agendamentos/:usuarioId', autenticarToken, async (req, res) => {
    const { usuarioId } = req.params;

    try {
        // Buscar todos os agendamentos do usuário
        const agendamentos = await prisma.agendamento.findMany({
            where: { usuarioId },
            select: {
                id: true,
                data: true,
                hora: true,
                status: true,
                barbearia: {
                    select: {
                        id: true,
                        nome: true,
                        endereco: true,
                        celular: true,
                    }
                },
                barbeiro: {
                    select: {
                        id: true,
                        nome: true,
                    }
                },
                servico: {
                    select: {
                        id: true,
                        nome: true,
                        preco: true,
                        duracao: true,
                    }
                }
            },
            orderBy: {
                data: 'asc', // Ordena os agendamentos pela data
            }
        });

        if (agendamentos.length === 0) {
            return res.status(404).json({ error: "Nenhum agendamento encontrado para este usuário." });
        }

        res.status(200).json(agendamentos);
    } catch (error) {
        console.error("Erro ao buscar agendamentos:", error);
        res.status(500).json({ error: "Erro ao buscar agendamentos." });
    }
});

mainRouter.put('/agendamentos/:agendamentoId/cancelar', autenticarToken, async (req, res) => {
    const { agendamentoId } = req.params;

    try {
        // Verificar se o agendamento existe
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId }
        });

        if (!agendamento) {
            return res.status(404).json({ error: "Agendamento não encontrado." });
        }

        // Verificar se o status do agendamento é diferente de "Cancelado" e "Feito"
        if (agendamento.status === "Cancelado" || agendamento.status === "Feito") {
            return res.status(400).json({ error: "Este agendamento não pode ser cancelado." });
        }

        // Atualizar o status para "Cancelado"
        const agendamentoCancelado = await prisma.agendamento.update({
            where: { id: agendamentoId },
            data: { status: "Cancelado" }
        });

        res.status(200).json({
            message: "Agendamento cancelado com sucesso.",
            agendamento: agendamentoCancelado
        });
    } catch (error) {
        console.error("Erro ao cancelar agendamento:", error);
        res.status(500).json({ error: "Erro ao cancelar o agendamento." });
    }
});

mainRouter.delete('/agendamentos/:agendamentoId', autenticarToken, async (req, res) => {
    const { agendamentoId } = req.params;

    try {
        // Verificar se o agendamento existe
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId }
        });

        if (!agendamento) {
            return res.status(404).json({ error: "Agendamento não encontrado." });
        }

        // Verificar se o status do agendamento é "Cancelado"
        if (agendamento.status !== "Cancelado") {
            return res.status(400).json({ error: "Este agendamento não pode ser deletado. Ele precisa estar com o status 'Cancelado'." });
        }

        // Deletar o agendamento
        await prisma.agendamento.delete({
            where: { id: agendamentoId }
        });

        res.status(200).json({
            message: "Agendamento deletado com sucesso."
        });
    } catch (error) {
        console.error("Erro ao deletar agendamento:", error);
        res.status(500).json({ error: "Erro ao deletar o agendamento." });
    }
});