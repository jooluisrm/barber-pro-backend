import { prisma } from '../libs/prisma';

export const ObterHorariosDisponiveis = async (barbeiroId: string, data: string, hora: string) => {
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

    // Se não houver horários cadastrados para esse dia da semana, retorna um array vazio
    if (horarios.length === 0) {
        return [];
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

    return horariosDisponiveis;
};
