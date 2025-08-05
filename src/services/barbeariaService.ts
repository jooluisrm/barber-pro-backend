import { Prisma, Role } from "@prisma/client";
import { prisma } from "../libs/prisma";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises'; 
import path from 'path';
import { del } from "@vercel/blob";

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
            barbeariaId, // O filtro continua o mesmo, está perfeito.
        },
        // A MÁGICA ACONTECE AQUI:
        include: {
            usuarioSistema: { // 1. Incluímos a relação com UsuarioSistema
                select: {      // 2. Selecionamos APENAS os campos que queremos
                    email: true, //   para evitar enviar dados sensíveis como a senha.
                }
            }
        }
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

export const getAgendamentosPorBarbeiroService = async (barbeiroId: string) => {
    if (!barbeiroId) {
        throw new Error('ID do barbeiro é obrigatório.');
    }

    const agendamentos = await prisma.agendamento.findMany({
        where: {
            barbeiroId: barbeiroId
        },
        include: {
            usuario: {
                select: { id: true, nome: true }
            },
            barbeiro: {
                select: { id: true, nome: true }
            },
            servico: {
                select: { id: true, nome: true, preco: true }
            },
        },
        orderBy: {
            data: 'asc' // Ordena por data
        }
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
        orderBy: { nome: 'asc' },
    });

    // Não precisamos mais montar a URL! Ela já vem pronta do banco.
    return servicos;
};

interface CriarServicoProps {
    barbeariaId: string;
    nome: string;
    duracao: number | string; // Aceita string pois vem do form-data
    preco?: number | string;  // Aceita string pois vem do form-data
    imagemUrl?: string;       // <-- MUDANÇA: Novo campo opcional
}

export const criarServicoService = async ({ barbeariaId, nome, duracao, preco, imagemUrl }: CriarServicoProps) => {
    if (!nome || typeof nome !== 'string') {
        throw { status: 400, message: 'Nome do serviço é obrigatório.' };
    }

    if (duracao === undefined || isNaN(Number(duracao)) || Number(duracao) <= 0) {
        throw { status: 400, message: 'Duração do serviço é obrigatória e deve ser um número positivo.' };
    }

    let precoFormatado: number | null = null;
    if (preco !== undefined && preco !== '') {
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
            duracao: Number(duracao), // Garante que será salvo como número
            preco: precoFormatado,
            imagemUrl: imagemUrl, // <-- MUDANÇA: Adiciona a URL da imagem
        },
    });

    return novoServico;
};

interface EditarServicoProps {
    barbeariaId: string;
    servicoId: string;
    nome: string;
    duracao: number | string; // Aceita string do form-data
    preco?: number | string; // Aceita string do form-data
    imagemUrl?: string;     // <-- Adiciona o novo campo de imagem opcional
}

export const editarServicoService = async ({ barbeariaId, servicoId, nome, duracao, preco, imagemUrl }: EditarServicoProps) => {
    // 1. Busca o serviço para validar a existência e a posse
    const servicoExistente = await prisma.servico.findUnique({
        where: { id: servicoId },
    });

    if (!servicoExistente || servicoExistente.barbeariaId !== barbeariaId) {
        throw { status: 404, message: 'Serviço não encontrado para esta barbearia.' };
    }

    // Formata o preço para comparação e para o banco de dados
    const precoFormatado = (preco !== undefined && preco !== '') ? Number(preco) : servicoExistente.preco;
    
    // 2. Verifica se houve alguma alteração nos campos de texto
    const semAlteracoesDeTexto =
        servicoExistente.nome === nome &&
        servicoExistente.duracao === Number(duracao) &&
        String(servicoExistente.preco || '') === String(precoFormatado || '');

    // 3. Valida se algo foi alterado (texto OU imagem)
    // Se os textos não mudaram E nenhuma nova imagem foi enviada, lança o erro.
    if (semAlteracoesDeTexto && !imagemUrl) {
        throw { status: 400, message: 'Nenhuma alteração foi feita.' };
    }

     // Se uma nova imagem foi enviada E uma antiga existia, deleta a antiga do Blob.
    if (imagemUrl && servicoExistente.imagemUrl) {
        try {
            await del(servicoExistente.imagemUrl); // 👈 Deleta usando a URL completa
        } catch (error) {
            console.error(`Falha ao deletar o blob antigo ${servicoExistente.imagemUrl}:`, error);
        }
    }

    // 5. Atualiza o serviço no banco de dados
    const servicoAtualizado = await prisma.servico.update({
        where: { id: servicoId },
        data: {
            nome,
            duracao: Number(duracao),
            preco: precoFormatado,
            // Se imagemUrl for undefined, mantém a URL antiga. Se for uma string, usa a nova.
            imagemUrl: imagemUrl === undefined ? servicoExistente.imagemUrl : imagemUrl,
        },
    });

    return servicoAtualizado;
};

interface DeletarServicoProps {
    barbeariaId: string;
    servicoId: string;
}

export const deletarServicoService = async ({ barbeariaId, servicoId }: DeletarServicoProps) => {
    const servicoExistente = await prisma.servico.findFirst({ where: { id: servicoId, barbeariaId } });

    if (!servicoExistente) {
        throw { status: 404, message: 'Serviço não encontrado.' };
    }

    const urlDaImagem = servicoExistente.imagemUrl;

    await prisma.servico.delete({ where: { id: servicoId } });

    // Se havia uma URL, deleta o blob correspondente.
    if (urlDaImagem) {
        try {
            await del(urlDaImagem); // 👈 Deleta usando a URL completa
        } catch (error) {
            console.error(`Falha ao deletar o blob ${urlDaImagem}:`, error);
        }
    }
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

interface UpdateParams {
    usuarioId: string;
    dadosUpdate: { nome?: string; email?: string };
    usuarioLogado: any;
}

export const atualizarUsuarioService = async ({ usuarioId, dadosUpdate, usuarioLogado }: UpdateParams) => {
    // 1. Lógica de autorização
    if (usuarioLogado.role !== Role.ADMIN && usuarioId !== usuarioLogado.id) {
        throw new Error('Acesso negado. Você só pode alterar o seu próprio perfil.');
    }

    // 2. Busca o usuário que será atualizado no banco
    const usuarioAtual = await prisma.usuarioSistema.findUnique({
        where: { id: usuarioId },
    });

    if (!usuarioAtual) {
        throw new Error('Usuário a ser atualizado não encontrado.');
    }

    // 3. Limpeza e preparação dos dados
    const novoNome = dadosUpdate.nome?.trim();
    const novoEmail = dadosUpdate.email?.trim().toLowerCase();

    // 4. Validação de dados contra o estado atual do banco
    if (novoEmail && novoEmail !== usuarioAtual.email) {
        const emailExistente = await prisma.usuarioSistema.findUnique({
            where: { email: novoEmail },
        });
        if (emailExistente) {
            throw new Error('Este email já está em uso por outra conta.');
        }
    }

    const isNomeIgual = !novoNome || novoNome === usuarioAtual.nome;
    const isEmailIgual = !novoEmail || novoEmail === usuarioAtual.email;

    if (isNomeIgual && isEmailIgual) {
        throw new Error('Nenhum dado novo para atualizar.');
    }

    // 5. Construção do objeto de atualização
    const dadosParaAtualizar: { nome?: string; email?: string } = {};
    if (!isNomeIgual) dadosParaAtualizar.nome = novoNome;
    if (!isEmailIgual) dadosParaAtualizar.email = novoEmail;

    // 6. Execução da atualização no banco
    const usuarioAtualizado = await prisma.usuarioSistema.update({
        where: { id: usuarioId },
        data: dadosParaAtualizar,
    });

    // 7. Remoção de dados sensíveis antes de retornar
    const { senha, ...dadosParaRetorno } = usuarioAtualizado;

    return dadosParaRetorno;
};

interface AlterarSenhaParams {
    usuarioId: string;
    currentPassword?: string;
    newPassword?: string;
    usuarioLogado: any;
}

export const alterarSenhaService = async ({
    usuarioId,
    currentPassword,
    newPassword,
    usuarioLogado,
}: AlterarSenhaParams): Promise<void> => {

    // 1. Lógica de Autorização
    if (usuarioLogado.role !== Role.ADMIN && usuarioId !== usuarioLogado.id) {
        throw new Error('Acesso negado. Você só pode alterar sua própria senha.');
    }

    // 2. Validação de Entrada
    if (!currentPassword || !newPassword) {
        throw new Error('A senha atual e a nova senha são obrigatórias.');
    }
    if (newPassword.length < 6) {
        throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
    }
    if (currentPassword === newPassword) {
        throw new Error('A nova senha não pode ser igual à senha atual.');
    }

    // 3. Busca do Usuário no Banco
    const usuario = await prisma.usuarioSistema.findUnique({
        where: { id: usuarioId },
    });

    if (!usuario) {
        throw new Error('Usuário não encontrado.');
    }

    // 4. Verificação da Senha Atual
    const isSenhaAtualValida = await bcrypt.compare(currentPassword, usuario.senha);

    if (!isSenhaAtualValida) {
        throw new Error('Senha atual incorreta.');
    }

    // 5. Hashing e Atualização da Nova Senha
    const novaSenhaHasheada = await bcrypt.hash(newPassword, 10);

    await prisma.usuarioSistema.update({
        where: { id: usuarioId },
        data: { senha: novaSenhaHasheada },
    });
};

type AgendamentoPendenteFormatado = {
    idAgendamento: string;
    status: string;
    data: string;
    hora: string;
    valor: number;
    nomeCliente: string | null;
    nomeBarbeiro: string | null;
    nomeServico: string;
};

export const listarAgendamentosPendentesService = async (barbeariaId: string): Promise<AgendamentoPendenteFormatado[]> => {
    // Adicionamos uma verificação para garantir que a barbearia existe
    const barbeariaExiste = await prisma.barbearia.findUnique({
        where: { id: barbeariaId }
    });

    if (!barbeariaExiste) {
        throw new Error('Barbearia não encontrada.');
    }

    // 1. Lógica para obter data e hora atuais
    const agora = new Date();
    const hojeString = agora.toISOString().split('T')[0];
    const horaAtualString = agora.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    // 2. Consulta ao banco de dados
    const agendamentosDoBanco = await prisma.agendamento.findMany({
        where: {
            barbeariaId: barbeariaId,
            status: 'Confirmado',
            OR: [
                { data: { lt: hojeString } },
                { data: hojeString, hora: { lt: horaAtualString } },
            ],
        },
        select: {
            id: true,
            status: true,
            data: true,
            hora: true,
            usuario: { select: { nome: true } },
            servico: { select: { nome: true, preco: true } },
            barbeiro: { select: { nome: true } }
        },
        orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });

    // 3. Formatação dos dados para a API
    const agendamentosFormatados = agendamentosDoBanco.map(agendamento => ({
        idAgendamento: agendamento.id,
        status: agendamento.status,
        data: agendamento.data,
        hora: agendamento.hora,
        valor: agendamento.servico.preco?.toNumber() ?? 0,
        nomeCliente: agendamento.usuario?.nome ?? null,
        nomeBarbeiro: agendamento.barbeiro?.nome ?? null,
        nomeServico: agendamento.servico.nome
    }));

    return agendamentosFormatados;
};

export const concluirAgendamentoService = async (agendamentoId: string, barbeariaId: string): Promise<void> => {
    try {
        // 1. A lógica de negócio principal: a atualização atômica
        await prisma.agendamento.update({
            where: {
                id: agendamentoId,
                barbeariaId: barbeariaId,
                status: 'Confirmado', // Só atualiza se o status for 'Confirmado'
            },
            data: {
                status: 'Feito',
            },
        });
    } catch (error) {
        // 2. Tradução do erro específico do Prisma para um erro de negócio
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new Error(
                "Operação falhou: o agendamento não foi encontrado, não pertence a esta barbearia ou seu status não permite a alteração."
            );
        }
        // 3. Lançamento de outros erros inesperados
        throw error;
    }
};

export const cancelarAgendamentoService = async (agendamentoId: string, barbeariaId: string): Promise<void> => {
    try {
        // A lógica atômica é a mesma, só muda o dado a ser atualizado
        await prisma.agendamento.update({
            where: {
                id: agendamentoId,
                barbeariaId: barbeariaId,
                status: 'Confirmado', // Só pode cancelar o que está confirmado
            },
            data: {
                status: 'Cancelado', // <-- ÚNICA MUDANÇA REAL
            },
        });
    } catch (error) {
        // O tratamento de erro é exatamente o mesmo
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new Error(
                "Operação falhou: o agendamento não foi encontrado, não pertence a esta barbearia ou seu status não permite a alteração."
            );
        }
        throw error;
    }
};