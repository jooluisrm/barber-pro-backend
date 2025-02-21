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
