import { prisma } from '../libs/prisma';

export const CriarAgendamento = async (usuarioId: string, barbeariaId: string, barbeiroId: string, servicoId: string, data: string, hora: string) => {
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
        throw new Error('Horário já agendado. Escolha outro horário.');
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

    return novoAgendamento;
};

export const BuscarAgendamentosUsuario = async (usuarioId: string) => {
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
                    imagemUrl: true,
                }
            }
        },
        orderBy: {
            data: 'asc', // Ordena os agendamentos pela data
        }
    });

    return agendamentos;
};

export const CancelarAgendamento = async (agendamentoId: string) => {
    // Verificar se o agendamento existe
    const agendamento = await prisma.agendamento.findUnique({
        where: { id: agendamentoId }
    });

    if (!agendamento) {
        return null;
    }

    // Verificar se o status do agendamento é diferente de "Cancelado" e "Feito"
    if (agendamento.status === "Cancelado" || agendamento.status === "Feito") {
        throw new Error("Este agendamento não pode ser cancelado.");
    }

    // Atualizar o status para "Cancelado"
    const agendamentoCancelado = await prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { status: "Cancelado" }
    });

    return agendamentoCancelado;
};

export const DeletarAgendamento = async (agendamentoId: string) => {
    // Verificar se o agendamento existe
    const agendamento = await prisma.agendamento.findUnique({
        where: { id: agendamentoId }
    });

    if (!agendamento) {
        return null;
    }

    // Verificar se o status do agendamento é "Cancelado"
    if (agendamento.status !== "Cancelado") {
        throw new Error("Este agendamento não pode ser deletado. Ele precisa estar com o status 'Cancelado'.");
    }

    // Deletar o agendamento
    await prisma.agendamento.delete({
        where: { id: agendamentoId }
    });

    return true;
};