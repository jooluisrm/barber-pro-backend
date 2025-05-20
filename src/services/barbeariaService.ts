import { prisma } from "../libs/prisma";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const BuscarBarbeariasProximas = async (latUser: number, lonUser: number, raioKm: number) => {
    // Buscar todas as barbearias sem expor dados sensíveis
    const barbearias = await prisma.barbearia.findMany({
        select: {
            id: true,
            nome: true,
            endereco: true,
            celular: true,
            telefone: true,
            fotoPerfil: true,
            descricao: true,
            latitude: true,
            longitude: true,
            status: true
        }
    });

    // Calcular distância e filtrar barbearias dentro do raio desejado
    const barbeariasProximas = barbearias
        .map(barbearia => ({
            ...barbearia,
            distancia: calcularDistancia(latUser, lonUser, barbearia.latitude, barbearia.longitude)
        }))
        .filter(barbearia => barbearia.distancia <= raioKm)
        .sort((a, b) => a.distancia - b.distancia);

    return barbeariasProximas;
};

// Função para calcular a distância entre duas coordenadas usando a fórmula de Haversine
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Raio médio da Terra em km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export const BuscarBarbeariasAtivas = async () => {
    // Buscar todas as barbearias ativas (que não estão "Desativadas")
    return await prisma.barbearia.findMany({
        where: {
            status: {
                not: "Desativada"
            }
        },
        select: {
            id: true,
            nome: true,
            endereco: true,
            celular: true,
            telefone: true,
            fotoPerfil: true,
            descricao: true,
            latitude: true,
            longitude: true,
            status: true
        }
    });
};

export const BuscarBarbeariasPorNome = async (nome: string) => {
    // Buscar barbearias cujo nome contém o termo pesquisado e que não estão desativadas
    return await prisma.barbearia.findMany({
        where: {
            nome: {
                contains: nome, // Ignora maiúsculas e minúsculas
            },
            status: {
                not: "Desativada",
            },
        },
        select: {
            id: true,
            nome: true,
            endereco: true,
            celular: true,
            telefone: true,
            fotoPerfil: true,
            descricao: true,
            latitude: true,
            longitude: true,
            status: true,
        },
    });
};

export const BuscarBarbeariaPorNome = async (nome: string) => {
    return await prisma.barbearia.findUnique({
        where: {
            nome,
        },
    });
};

export const BuscarServicosPorBarbearia = async (barbeariaId: string) => {
    return await prisma.servico.findMany({
        where: {
            barbeariaId, // Filtra os serviços pela barbearia
        },
    });
};

export const BuscarBarbeirosPorBarbearia = async (barbeariaId: string) => {
    return await prisma.barbeiro.findMany({
        where: {
            barbeariaId, // Filtra os barbeiros pela barbearia
        },
    });
};

export const BuscarProdutosPorBarbearia = async (barbeariaId: string) => {
    return await prisma.produto.findMany({
        where: {
            barbeariaId, // Filtra os produtos pela barbearia
        },
    });
};

export const BuscarAvaliacoesPorBarbearia = async (barbeariaId: string) => {
    return await prisma.avaliacao.findMany({
        where: { barbeariaId },
        select: {
            id: true,
            nota: true,
            comentario: true,
            dataHora: true,
            usuario: {
                select: {
                    nome: true // Apenas o nome do usuário
                }
            }
        },
        orderBy: {
            dataHora: 'desc' // Ordena da mais recente para a mais antiga
        }
    });
};

export const CriarAvaliacao = async (barbeariaId: string, usuarioId: string, nota: number, comentario?: string) => {
    return await prisma.avaliacao.create({
        data: {
            usuarioId,
            barbeariaId,
            nota,
            comentario: comentario || null, // Comentário é opcional
        },
    });
};

export const ObterHorariosFuncionamento = async (barbeariaId: string) => {
    // Buscar todos os horários de funcionamento da barbearia
    const horarios = await prisma.horariosFuncionamentoBarbearia.findMany({
        where: { barbeariaId },
        select: {
            id: true,
            diaSemana: true,
            horaInicio: true,
            horaFim: true,
        },
        orderBy: {
            diaSemana: 'asc', // Ordena do domingo (0) ao sábado (6)
        },
    });

    // Mapeia os números dos dias para os nomes correspondentes
    const diasSemanaMap = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];

    // Formata os horários antes de retorná-los
    return horarios.map((horario) => ({
        id: horario.id,
        diaSemanaNumero: horario.diaSemana, // Retorna o número do dia da semana
        diaSemanaNome: diasSemanaMap[horario.diaSemana], // Converte número para nome do dia
        horaInicio: horario.horaInicio,
        horaFim: horario.horaFim,
    }));
};

export const ObterFormasPagamento = async (barbeariaId: string) => {
    // Buscar todas as formas de pagamento da barbearia
    return await prisma.formaPagamento.findMany({
        where: { barbeariaId },
        select: {
            id: true,
            tipo: true, // Tipo da forma de pagamento (ex: "Dinheiro", "Cartão", etc.)
        },
    });
};

export const ObterRedesSociais = async (barbeariaId: string) => {
    // Buscar todas as redes sociais da barbearia
    return await prisma.redeSocial.findMany({
        where: { barbeariaId },
        select: {
            id: true,
            link: true,
            rede: true, // Nome da rede social (ex: "Instagram", "Facebook", etc.)
        },
    });
};


interface RegistrarBarbeariaDTO {
    nome: string;
    email: string;
    senha: string;
    endereco: string;
    celular: string;
    telefone?: string;
    latitude: string;
    longitude: string;
    fotoPerfil?: string;
    descricao?: string;
}

export const registrarNovaBarbearia = async (data: RegistrarBarbeariaDTO) => {
    const {
        nome,
        email,
        senha,
        endereco,
        celular,
        telefone,
        latitude,
        longitude,
        fotoPerfil,
        descricao
    } = data;

    // Validação
    if (!nome || !email || !senha || !endereco || !celular || !latitude || !longitude) {
        throw new Error('Todos os campos obrigatórios devem ser preenchidos.');
    }

    // Verificar se já existe barbearia com mesmo nome ou email
    const existente = await prisma.barbearia.findFirst({
        where: {
            OR: [{ email }, { nome }]
        }
    });

    if (existente) {
        throw new Error('Nome ou e-mail já cadastrados.');
    }

    // Criptografar a senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Criar a barbearia
    const novaBarbearia = await prisma.barbearia.create({
        data: {
            nome,
            email,
            senha: senhaHash,
            endereco,
            celular,
            telefone: !telefone ? '' : telefone,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            fotoPerfil,
            descricao,
        }
    });

    return novaBarbearia;
};

const SECRET_KEY = process.env.JWT_SECRET || 'seuSegredoSuperSeguro';

export const loginBarbeariaService = async (email: string, senha: string) => {
    // Validação
    if (!email || !senha) {
        throw { status: 400, message: 'E-mail e senha são obrigatórios.' };
    }

    // Verifica se a barbearia existe
    const barbearia = await prisma.barbearia.findUnique({ where: { email } });

    if (!barbearia) {
        throw { status: 401, message: 'E-mail ou senha inválidos.' };
    }

    // Compara senha
    const senhaValida = await bcrypt.compare(senha, barbearia.senha);
    if (!senhaValida) {
        throw { status: 401, message: 'E-mail ou senha inválidos.' };
    }

    // Gera token
    const token = jwt.sign(
        { id: barbearia.id, email: barbearia.email },
        SECRET_KEY,
        { expiresIn: '2h' }
    );

    return {
        message: 'Login realizado com sucesso!',
        barbearia: {
            id: barbearia.id,
            nome: barbearia.nome,
            email: barbearia.email,
            endereco: barbearia.endereco,
            celular: barbearia.celular,
            telefone: barbearia.telefone,
            fotoPerfil: barbearia.fotoPerfil,
            descricao: barbearia.descricao,
            status: barbearia.status
        },
        token
    };
};


export const getAgendamentosService = async (barbeariaId: string) => {
    const agendamentos = await prisma.agendamento.findMany({
        where: { barbeariaId },
        include: {
            usuario: {
                select: {
                    id: true,
                    nome: true
                },
            },
            barbeiro: {
                select: {
                    id: true,
                    nome: true,
                },
            },
            servico: {
                select: {
                    id: true,
                    nome: true,
                    preco: true,
                },
            },
        },
    });

    return agendamentos;
};

export const updateStatusAgendamentoService = async (agendamentoId: string, status: string) => {
    const updatedAgendamento = await prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { status },
    });

    return updatedAgendamento;
};

interface BarbeiroInput {
    nome: string;
    email: string;
    senha: string;
    telefone: string;
    fotoPerfil?: string;
    barbeariaId: string;
}

export const registerBarbeiroService = async ({
    nome,
    email,
    senha,
    telefone,
    fotoPerfil,
    barbeariaId,
}: BarbeiroInput) => {

    // Verifica se e-mail já existe
    const barbeiroExistente = await prisma.barbeiro.findUnique({
        where: { email },
    });

    if (barbeiroExistente) {
        throw { status: 400, message: 'E-mail já cadastrado.' };
    }

    // Verifica se barbearia existe
    const barbeariaExistente = await prisma.barbearia.findUnique({
        where: { id: barbeariaId },
    });

    if (!barbeariaExistente) {
        throw { status: 404, message: 'Barbearia não encontrada.' };
    }

    // Criptografa senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Cria barbeiro
    const novoBarbeiro = await prisma.barbeiro.create({
        data: {
            nome,
            email,
            senha: senhaHash,
            telefone,
            fotoPerfil,
            barbeariaId,
        },
    });

    return novoBarbeiro;
};

export const deleteBarbeiroService = async (barbeiroId: string) => {
    // Verifica se há agendamentos confirmados
    const agendamentosPendentes = await prisma.agendamento.findFirst({
        where: { barbeiroId, status: "Confirmado" },
    });

    if (agendamentosPendentes) {
        throw { status: 400, message: "Este barbeiro possui agendamentos confirmados e não pode ser excluído." };
    }

    // Verifica se o barbeiro existe
    const barbeiroExiste = await prisma.barbeiro.findUnique({
        where: { id: barbeiroId },
    });

    if (!barbeiroExiste) {
        throw { status: 404, message: "Barbeiro não encontrado." };
    }

    // Deleta horários de trabalho (se houver)
    const horariosExistem = await prisma.horarioTrabalho.findFirst({
        where: { barbeiroId },
    });

    if (horariosExistem) {
        await prisma.horarioTrabalho.deleteMany({
            where: { barbeiroId },
        });
    }

    // Deleta o barbeiro
    await prisma.barbeiro.delete({
        where: { id: barbeiroId },
    });

    return "Barbeiro deletado com sucesso!";
};

interface UpdateBarbeiroDTO {
    nome: string;
    telefone: string;
    email: string;
}

export const updateBarbeiroService = async (barbeiroId: string, { nome, telefone, email }: UpdateBarbeiroDTO) => {
    // Validação de campos
    if (!nome || !telefone || !email) {
        throw { status: 400, message: "Todos os campos (nome, telefone, email) devem ser preenchidos." };
    }

    // Verifica se o barbeiro existe
    const barbeiroExistente = await prisma.barbeiro.findUnique({
        where: { id: barbeiroId },
    });

    if (!barbeiroExistente) {
        throw { status: 404, message: "Barbeiro não encontrado." };
    }

    // Verifica se os dados são iguais
    if (
        nome === barbeiroExistente.nome &&
        telefone === barbeiroExistente.telefone &&
        email === barbeiroExistente.email
    ) {
        throw { status: 400, message: "Altere pelo menos um campo para continuar." };
    }

    // Verifica se o novo e-mail está em uso por outro barbeiro
    const emailEmUso = await prisma.barbeiro.findFirst({
        where: {
            email,
            id: { not: barbeiroId },
        },
    });

    if (emailEmUso) {
        throw { status: 400, message: "Este e-mail já está em uso por outro barbeiro." };
    }

    // Atualiza os dados
    const barbeiroAtualizado = await prisma.barbeiro.update({
        where: { id: barbeiroId },
        data: { nome, telefone, email },
    });

    return barbeiroAtualizado;
};

export const getHorariosPorDiaService = async (barbeiroId: string, diaSemana: string) => {
    const dia = parseInt(diaSemana);

    // Validação do dia da semana
    if (isNaN(dia) || dia < 0 || dia > 6) {
        throw { status: 400, message: "O dia da semana deve ser um número entre 0 (domingo) e 6 (sábado)." };
    }

    // Verifica se o barbeiro existe
    const barbeiro = await prisma.barbeiro.findUnique({
        where: { id: barbeiroId }
    });

    if (!barbeiro) {
        throw { status: 404, message: "Barbeiro não encontrado." };
    }

    // Busca os horários para o dia específico
    const horarios = await prisma.horarioTrabalho.findMany({
        where: {
            barbeiroId,
            diaSemana: dia
        },
        orderBy: {
            hora: "asc"
        }
    });

    return horarios;
};
