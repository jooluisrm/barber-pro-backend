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

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'minhaSuperChaveSecreta';

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
            status: barbearia.status,
            stripeCurrentPeriodEnd: barbearia.stripeCurrentPeriodEnd
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
export const listarServicosDaBarbeariaService = async (barbeariaId: string) => {
    if (!barbeariaId) {
        throw { status: 400, message: 'ID da barbearia é obrigatório.' };
    }

    const servicos = await prisma.servico.findMany({
        where: { barbeariaId },
        orderBy: { nome: 'asc' }, // ordenação opcional
    });

    return servicos;
};

interface CriarServicoProps {
    barbeariaId: string;
    nome: string;
    duracao: number;
    preco?: number;
}

export const criarServicoService = async ({ barbeariaId, nome, duracao, preco }: CriarServicoProps) => {
    if (!nome || typeof nome !== 'string') {
        throw { status: 400, message: 'Nome do serviço é obrigatório e deve ser uma string.' };
    }

    if (duracao === undefined || isNaN(Number(duracao)) || Number(duracao) <= 0) {
        throw { status: 400, message: 'Duração do serviço é obrigatória e deve ser um número positivo.' };
    }

    let precoFormatado: number | null = null;
    if (preco !== undefined) {
        const precoNumber = Number(preco);
        if (isNaN(precoNumber) || precoNumber < 0) {
            throw { status: 400, message: 'Preço, se fornecido, deve ser um número positivo.' };
        }
        precoFormatado = precoNumber;
    }

    const novoServico = await prisma.servico.create({
        data: {
            barbeariaId,
            nome,
            duracao: Number(duracao),
            preco: precoFormatado,
        },
    });

    return novoServico;
};

interface EditarServicoProps {
    barbeariaId: string;
    servicoId: string;
    nome: string;
    duracao: number;
    preco?: number;
}

export const editarServicoService = async ({ barbeariaId, servicoId, nome, duracao, preco }: EditarServicoProps) => {
    if (!nome || typeof nome !== 'string') {
        throw { status: 400, message: 'Nome do serviço é obrigatório e deve ser uma string.' };
    }

    if (duracao === undefined || isNaN(Number(duracao)) || Number(duracao) < 5) {
        throw { status: 400, message: 'Duração do serviço é obrigatória e deve ser no mínimo 5 minutos.' };
    }

    let precoFormatado: number | null = null;
    if (preco !== undefined) {
        const precoNumber = Number(preco);
        if (isNaN(precoNumber) || precoNumber < 0) {
            throw { status: 400, message: 'Preço, se fornecido, deve ser um número positivo.' };
        }
        precoFormatado = precoNumber;
    }

    const servicoExistente = await prisma.servico.findUnique({
        where: { id: servicoId },
    });

    if (!servicoExistente || servicoExistente.barbeariaId !== barbeariaId) {
        throw { status: 404, message: 'Serviço não encontrado para esta barbearia.' };
    }

    const semAlteracoes =
        servicoExistente.nome === nome &&
        servicoExistente.duracao === Number(duracao) &&
        String(servicoExistente.preco || '') === String(precoFormatado || '');

    if (semAlteracoes) {
        throw { status: 400, message: 'Nenhuma alteração foi feita.' };
    }

    const servicoAtualizado = await prisma.servico.update({
        where: { id: servicoId },
        data: {
            nome,
            duracao: Number(duracao),
            preco: precoFormatado,
        },
    });

    return servicoAtualizado;
};

interface DeletarServicoProps {
    barbeariaId: string;
    servicoId: string;
}

export const deletarServicoService = async ({ barbeariaId, servicoId }: DeletarServicoProps) => {
    const servicoExistente = await prisma.servico.findFirst({
        where: {
            id: servicoId,
            barbeariaId,
        },
    });

    if (!servicoExistente) {
        throw { status: 404, message: 'Serviço não encontrado para esta barbearia.' };
    }

    await prisma.servico.delete({
        where: { id: servicoId },
    });
};

export const listarProdutosService = async (barbeariaId: string) => {
    const produtos = await prisma.produto.findMany({
        where: { barbeariaId },
        orderBy: { nome: 'asc' },
    });

    return produtos;
};

interface CriarProdutoDTO {
    barbeariaId: string;
    nome: string;
    descricao?: string;
    tipo: string;
    preco: number;
    imagemUrl?: string;
}

export const criarProdutoService = async ({
    barbeariaId,
    nome,
    descricao,
    tipo,
    preco,
    imagemUrl,
}: CriarProdutoDTO) => {
    const novoProduto = await prisma.produto.create({
        data: {
            barbeariaId,
            nome,
            descricao: descricao || null,
            tipo,
            preco,
            imagemUrl: imagemUrl || null,
            estoque: true,
        },
    });

    return novoProduto;
};

interface EditarProdutoDTO {
    barbeariaId: string;
    produtoId: string;
    nome: string;
    descricao?: string;
    tipo: string;
    preco: number;
}

export const editarProdutoService = async ({
    barbeariaId,
    produtoId,
    nome,
    descricao,
    tipo,
    preco,
}: EditarProdutoDTO) => {
    const produtoExistente = await prisma.produto.findUnique({
        where: { id: produtoId },
    });

    if (!produtoExistente || produtoExistente.barbeariaId !== barbeariaId) {
        return null;
    }

    const dadosIguais =
        produtoExistente.nome === nome &&
        produtoExistente.descricao === descricao &&
        produtoExistente.tipo === tipo &&
        Number(produtoExistente.preco) === preco;

    if (dadosIguais) {
        throw new Error('Nenhuma alteração foi feita no produto.');
    }

    const produtoAtualizado = await prisma.produto.update({
        where: { id: produtoId },
        data: {
            nome,
            descricao,
            tipo,
            preco,
        },
    });

    return produtoAtualizado;
};

interface DeletarProdutoDTO {
    barbeariaId: string;
    produtoId: string;
}

export const deletarProdutoService = async ({ barbeariaId, produtoId }: DeletarProdutoDTO) => {
    const produtoExistente = await prisma.produto.findUnique({
        where: { id: produtoId },
    });

    if (!produtoExistente || produtoExistente.barbeariaId !== barbeariaId) {
        return false;
    }

    await prisma.produto.delete({
        where: { id: produtoId },
    });

    return true;
};

export const listarRedesSociaisService = async (barbeariaId: string) => {
    return await prisma.redeSocial.findMany({
        where: { barbeariaId },
        orderBy: { rede: 'asc' },
    });
};

export const criarRedeSocialService = async (barbeariaId: string, rede: string, link: string) => {
    // Verifica se já existe
    const redeExistente = await prisma.redeSocial.findFirst({
        where: {
            barbeariaId,
            rede,
        },
    });

    if (redeExistente) {
        throw new Error(`A rede social "${rede}" já está cadastrada para esta barbearia.`);
    }

    // Cria a nova rede social
    return await prisma.redeSocial.create({
        data: {
            barbeariaId,
            rede,
            link,
        },
    });
};

export const editarRedeSocialService = async (barbeariaId: string, redeId: string, link: string) => {
    const redeExistente = await prisma.redeSocial.findFirst({
        where: {
            id: redeId,
            barbeariaId,
        },
    });

    if (!redeExistente) {
        throw new Error('Rede social não encontrada para esta barbearia.');
    }

    if (redeExistente.link === link) {
        throw new Error('Nenhuma alteração detectada. O link é igual ao atual.');
    }

    return await prisma.redeSocial.update({
        where: { id: redeId },
        data: { link },
    });
};

export const deletarRedeSocialService = async (barbeariaId: string, redeId: string) => {
    const redeExistente = await prisma.redeSocial.findFirst({
        where: {
            id: redeId,
            barbeariaId,
        },
    });

    if (!redeExistente) {
        throw new Error('Rede social não encontrada para esta barbearia.');
    }

    await prisma.redeSocial.delete({
        where: { id: redeId },
    });
};

export const getFormasPagamentoService = async (barbeariaId: string) => {
    return await prisma.formaPagamento.findMany({
        where: { barbeariaId },
        orderBy: { tipo: 'asc' },
    });
};

export const createFormaPagamentoService = async (barbeariaId: string, tipo: string) => {
    // Verifica duplicidade antes de criar
    const formaExistente = await prisma.formaPagamento.findFirst({
        where: { barbeariaId, tipo },
    });

    if (formaExistente) {
        const error: any = new Error('Forma de pagamento já existe');
        error.code = 'P2002'; // Código custom para simular erro de duplicidade
        throw error;
    }

    const novaForma = await prisma.formaPagamento.create({
        data: {
            barbeariaId,
            tipo,
        },
    });

    return novaForma;
};

export const deleteFormaPagamentoService = async (barbeariaId: string, formaPagamentoId: string) => {
    const formaPagamento = await prisma.formaPagamento.findFirst({
        where: {
            id: formaPagamentoId,
            barbeariaId,
        },
    });

    if (!formaPagamento) {
        const error: any = new Error('Forma de pagamento não encontrada');
        error.code = 'NOT_FOUND';
        throw error;
    }

    await prisma.formaPagamento.delete({
        where: { id: formaPagamentoId },
    });
};

export const getHorariosFuncionamentoService = async (barbeariaId: string) => {
    const horarios = await prisma.horariosFuncionamentoBarbearia.findMany({
        where: { barbeariaId },
        orderBy: { diaSemana: 'asc' },
    });

    return horarios;
};

interface CreateHorarioParams {
    barbeariaId: string;
    diaSemana: number;
    horaInicio: string;
    horaFim: string;
}

export const createHorarioFuncionamentoService = async ({
    barbeariaId,
    diaSemana,
    horaInicio,
    horaFim,
}: CreateHorarioParams) => {
    // Verifica se já existe horário cadastrado para o dia
    const horarioExistente = await prisma.horariosFuncionamentoBarbearia.findFirst({
        where: {
            barbeariaId,
            diaSemana,
        },
    });

    if (horarioExistente) {
        const error = new Error('Já existe um horário cadastrado para esse dia da semana nesta barbearia.');
        (error as any).statusCode = 400;
        throw error;
    }

    // Validação: horaInicio < horaFim
    const [inicioHoras, inicioMinutos] = horaInicio.split(':').map(Number);
    const [fimHoras, fimMinutos] = horaFim.split(':').map(Number);
    const inicioEmMinutos = inicioHoras * 60 + inicioMinutos;
    const fimEmMinutos = fimHoras * 60 + fimMinutos;

    if (inicioEmMinutos >= fimEmMinutos) {
        const error = new Error('O horário de início deve ser menor que o horário de término.');
        (error as any).statusCode = 400;
        throw error;
    }

    // Criação do horário
    const novoHorario = await prisma.horariosFuncionamentoBarbearia.create({
        data: {
            barbeariaId,
            diaSemana,
            horaInicio,
            horaFim,
        },
    });

    return novoHorario;
};

interface UpdateHorarioParams {
    barbeariaId: string;
    horarioId: string;
    horaInicio: string;
    horaFim: string;
}

export const updateHorarioFuncionamentoService = async ({
    barbeariaId,
    horarioId,
    horaInicio,
    horaFim,
}: UpdateHorarioParams) => {
    // Valida se horaInicio < horaFim
    const [hInicioH, hInicioM] = horaInicio.split(':').map(Number);
    const [hFimH, hFimM] = horaFim.split(':').map(Number);
    const minutosInicio = hInicioH * 60 + hInicioM;
    const minutosFim = hFimH * 60 + hFimM;

    if (minutosInicio >= minutosFim) {
        const error = new Error('O horário de início deve ser menor que o horário de fim.');
        (error as any).statusCode = 400;
        throw error;
    }

    // Verifica se o horário existe
    const horarioExistente = await prisma.horariosFuncionamentoBarbearia.findFirst({
        where: {
            id: horarioId,
            barbeariaId,
        },
    });

    if (!horarioExistente) {
        const error = new Error('Horário de funcionamento não encontrado.');
        (error as any).statusCode = 404;
        throw error;
    }

    // Verifica se houve alteração
    if (horarioExistente.horaInicio === horaInicio && horarioExistente.horaFim === horaFim) {
        const error = new Error('Nenhuma alteração detectada nos horários.');
        (error as any).statusCode = 400;
        throw error;
    }

    const horarioAtualizado = await prisma.horariosFuncionamentoBarbearia.update({
        where: { id: horarioId },
        data: { horaInicio, horaFim },
    });

    return horarioAtualizado;
};

interface DeleteHorarioParams {
    barbeariaId: string;
    horarioId: string;
}

export const deleteHorarioFuncionamentoService = async ({ barbeariaId, horarioId }: DeleteHorarioParams) => {
    const horario = await prisma.horariosFuncionamentoBarbearia.findFirst({
        where: {
            id: horarioId,
            barbeariaId,
        },
    });

    if (!horario) {
        const error = new Error('Horário de funcionamento não encontrado para esta barbearia.');
        (error as any).statusCode = 404;
        throw error;
    }

    await prisma.horariosFuncionamentoBarbearia.delete({
        where: { id: horarioId },
    });
};

interface AgendamentoVisitanteInput {
    barbeariaId: string;
    barbeiroId: string;
    servicoId: string;
    data: string;
    hora: string;
}

export const createAgendamentoVisitanteService = async ({
    barbeariaId,
    barbeiroId,
    servicoId,
    data,
    hora
}: AgendamentoVisitanteInput) => {
    const usuarioId = "visitante";

    // Verificação de campos obrigatórios
    if (!barbeariaId || !barbeiroId || !servicoId || !data || !hora) {
        const error = new Error('Todos os campos são obrigatórios.');
        (error as any).statusCode = 400;
        throw error;
    }

    // Verifica se o horário já está ocupado (exceto se estiver cancelado)
    const agendamentoExistente = await prisma.agendamento.findFirst({
        where: {
            barbeiroId,
            data,
            hora,
        },
    });

    if (agendamentoExistente && agendamentoExistente.status !== "Cancelado") {
        const error = new Error('Esse horário já está agendado para o barbeiro selecionado.');
        (error as any).statusCode = 400;
        throw error;
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
            status: 'Confirmado',
        },
    });

    return novoAgendamento;
};