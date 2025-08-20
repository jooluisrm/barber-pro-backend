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