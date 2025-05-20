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

export const createHorarioService = async (
    barbeiroId: string,
    diaSemana: number,
    hora: string
) => {
    // 1️⃣ Verificação dos campos obrigatórios
    if (diaSemana === undefined || hora === undefined) {
        throw { status: 400, message: 'O dia da semana e a hora são obrigatórios.' };
    }

    // 2️⃣ Validação do dia da semana
    const diaValido = Number(diaSemana);
    if (isNaN(diaValido) || diaValido < 0 || diaValido > 6) {
        throw { status: 400, message: 'O dia da semana deve estar entre 0 (domingo) e 6 (sábado).' };
    }

    // 3️⃣ Verifica se o horário já existe
    const horarioExistente = await prisma.horarioTrabalho.findFirst({
        where: {
            barbeiroId,
            diaSemana: diaValido,
            hora,
        },
    });

    if (horarioExistente) {
        throw { status: 400, message: `Horário (${hora}) já está cadastrado!` };
    }

    // 4️⃣ Criação do novo horário
    const novoHorario = await prisma.horarioTrabalho.create({
        data: {
            barbeiroId,
            diaSemana: diaValido,
            hora,
        },
    });

    return novoHorario;
};

interface Horario {
    diaSemana: number;
    hora: string;
}

export const deleteHorariosService = async (barbeiroId: string, horarios: Horario[]) => {
    if (!Array.isArray(horarios) || horarios.length === 0) {
        throw { status: 400, message: 'Lista de horários a serem deletados é obrigatória.' };
    }

    const horariosInvalidos = horarios.filter(({ diaSemana, hora }) =>
        diaSemana === undefined || hora === undefined || isNaN(Number(diaSemana)) || diaSemana < 0 || diaSemana > 6
    );

    if (horariosInvalidos.length > 0) {
        throw { status: 400, message: 'Todos os horários devem ter diaSemana (0-6) e hora válidos.' };
    }

    for (const { diaSemana, hora } of horarios) {
        const dia = Number(diaSemana);

        // 1️⃣ Deleta horário de trabalho
        await prisma.horarioTrabalho.deleteMany({
            where: {
                barbeiroId,
                diaSemana: dia,
                hora,
            },
        });

        // 2️⃣ Busca e cancela agendamentos associados ao horário removido
        const agendamentos = await prisma.agendamento.findMany({
            where: {
                barbeiroId,
                hora,
            },
        });

        const agendamentosParaCancelar = agendamentos.filter(agendamento => {
            const data = new Date(agendamento.data);
            return data.getDay() === dia;
        });

        await Promise.all(
            agendamentosParaCancelar.map(agendamento =>
                prisma.agendamento.update({
                    where: { id: agendamento.id },
                    data: { status: 'Cancelado' },
                })
            )
        );
    }
};