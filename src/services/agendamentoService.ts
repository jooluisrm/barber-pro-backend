import { format } from 'date-fns';
import { prisma } from '../libs/prisma';

// Interface para os dados de entrada
interface AgendamentoUsuarioInput {
    usuarioId: string;
    barbeariaId: string;
    barbeiroId: string;
    servicoId: string;
    data: string;
    hora: string;
}

export const criarAgendamentoUsuarioService = async ({
    usuarioId,
    barbeariaId,
    barbeiroId,
    servicoId,
    data,
    hora
}: AgendamentoUsuarioInput) => {

    // 1. Validação de campos obrigatórios
    if (!usuarioId || !barbeariaId || !barbeiroId || !servicoId || !data || !hora) {
        const error = new Error('Todos os campos são obrigatórios.');
        (error as any).statusCode = 400;
        throw error;
    }

    // 2. Buscar o serviço para obter o preço atual
    const servico = await prisma.servico.findUnique({
        where: { id: servicoId },
    });

    if (!servico || servico.barbeariaId !== barbeariaId) {
        const error = new Error('Serviço não encontrado para esta barbearia.');
        (error as any).statusCode = 404;
        throw error;
    }

    // 3. Sua verificação de horário existente (continua válida)
    const agendamentoExistente = await prisma.agendamento.findFirst({
        where: {
            barbeiroId,
            data,
            hora,
            status: { not: "Cancelado" },
        },
    });

    if (agendamentoExistente) {
        const error = new Error('Esse horário já está agendado para o barbeiro selecionado.');
        (error as any).statusCode = 409; // 409 Conflict
        throw error;
    }

    // 4. Criar o agendamento e seu primeiro serviço dentro de uma TRANSAÇÃO
    const novoAgendamentoComServico = await prisma.$transaction(async (tx) => {
        // Passo A: Cria o registro principal do Agendamento, agora com usuarioId
        const novoAgendamento = await tx.agendamento.create({
            data: {
                usuarioId, // A diferença principal está aqui
                barbeariaId,
                barbeiroId,
                data,
                hora,
                status: 'Confirmado',
                // Os campos de visitante ficam nulos
            },
        });

        // Passo B: Cria o registro na tabela de ligação AgendamentoServico
        await tx.agendamentoServico.create({
            data: {
                agendamentoId: novoAgendamento.id,
                servicoId: servicoId,
                precoNoMomento: servico.preco || 0,
            },
        });

        return novoAgendamento;
    });

    // 5. Retorna o agendamento criado de forma completa
    return prisma.agendamento.findUnique({
        where: { id: novoAgendamentoComServico.id },
        include: {
            usuario: {
                select: {
                    id: true,
                    nome: true,
                    telefone: true,
                    // 'senha' e 'email' foram omitidos
                },
            },
            servicosRealizados: {
                include: {
                    servico: true,
                },
            },
        },
    });
};

interface GetAgendamentosUsuarioOptions {
    usuarioId: string;
    filtro?: 'futuros' | 'passados'; // Filtro para separar próximos de histórico
}

export const getAgendamentosPorUsuarioService = async (options: GetAgendamentosUsuarioOptions) => {
    const { usuarioId, filtro = 'futuros' } = options; // Padrão é buscar agendamentos futuros

    const hoje = format(new Date(), 'yyyy-MM-dd');
    
    // Constrói a cláusula 'where' dinamicamente
    const whereClause: any = {
        usuarioId: usuarioId,
    };

    if (filtro === 'futuros') {
        whereClause.data = { gte: hoje }; // gte: Greater Than or Equal (Maior ou igual a)
        whereClause.status = { not: 'Cancelado' }; // Não mostra cancelados nos futuros
    } else { // filtro === 'passados'
        whereClause.data = { lt: hoje }; // lt: Less Than (Menor que)
    }

    const direction = filtro === 'futuros' ? 'asc' : 'desc';

    const agendamentos = await prisma.agendamento.findMany({
        where: whereClause,
        include: {
            barbearia: { select: { id: true, nome: true, endereco: true } },
            barbeiro: { select: { id: true, nome: true } },
            servicosRealizados: { include: { servico: true } },
            produtosConsumidos: { include: { produto: true } },
        },
        // Ordena do mais recente para o mais antigo no histórico, e vice-versa
        orderBy: [
            { data: direction },
            { hora: direction },
        ]
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