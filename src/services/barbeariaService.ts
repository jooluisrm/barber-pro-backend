import { Prisma, Produto, Role, StatusProduto, TipoMovimentacao } from "@prisma/client";
import { prisma } from "../libs/prisma";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { del } from "@vercel/blob";
import { Decimal } from "@prisma/client/runtime/library";
import { startOfMonth, subMonths } from "date-fns";

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

export const listarProdutosParaClienteService = async (barbeariaId: string) => {
    return await prisma.produto.findMany({
        where: {
            barbeariaId: barbeariaId,
            status: 'ATIVO', // A MUDANÇA PRINCIPAL: Filtra apenas produtos ativos.
        },
        // MELHORIA: Seleciona apenas os campos necessários para o cliente.
        // Isso evita expor dados sensíveis como o 'custo'.
        select: {
            id: true,
            nome: true,
            descricao: true,
            precoVenda: true,
            imagemUrl: true,
            tipo: true,
        },
        orderBy: {
            nome: 'asc',
        }
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
                    nome: true, // Apenas o nome do usuário
                    fotoPerfil: true
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

// Interface para os novos filtros
interface GetAgendamentosOptions {
    barbeariaId: string;
    data?: string; // Para filtrar por um dia específico, ex: "2025-08-15"
    barbeiroId?: string;
    status?: string;
}

export const getAgendamentosService = async (options: GetAgendamentosOptions) => {
    const { barbeariaId, data, barbeiroId, status } = options;

    // 1. Constrói a cláusula 'where' dinamicamente com base nos filtros recebidos
    const whereClause: any = {
        barbeariaId: barbeariaId,
    };

    if (data) {
        whereClause.data = data;
    }
    if (barbeiroId) {
        whereClause.barbeiroId = barbeiroId;
    }
    if (status) {
        whereClause.status = status;
    }

    // 2. Busca os agendamentos no banco de dados
    const agendamentos = await prisma.agendamento.findMany({
        where: whereClause,
        // 3. ATUALIZAÇÃO CRÍTICA: O novo 'include' para a estrutura de comanda
        include: {
            // Inclui os dados do usuário registrado (se houver)
            usuario: {
                select: {
                    id: true,
                    nome: true,
                    telefone: true,
                    email: true,
                    fotoPerfil: true
                },
            },
            // Inclui os dados do barbeiro
            barbeiro: {
                select: {
                    id: true,
                    nome: true,
                    fotoPerfil: true
                },
            },
            // Inclui a LISTA de serviços realizados na comanda
            servicosRealizados: {
                include: {
                    servico: { // Dentro de cada serviço da comanda, pega os dados do serviço
                        select: {
                            nome: true,
                            preco: true,
                            duracao: true,
                        }
                    }
                }
            },
            // Inclui a LISTA de produtos consumidos na comanda
            produtosConsumidos: {
                include: {
                    produto: { // Pega os dados de cada produto
                        select: {
                            nome: true,
                            precoVenda: true,
                        }
                    }
                }
            }
        },
        orderBy: {
            hora: 'asc', // Ordena os agendamentos do dia por hora
        }
    });

    // --- MUDANÇA NA TRANSFORMAÇÃO DOS DADOS ---
    const agendamentosFormatados = agendamentos.map(ag => {
        // Se for um usuário registrado, preparamos o objeto com seus dados
        const dadosCliente = ag.usuario 
            ? {
                nomeCliente: ag.usuario.nome,
                emailCliente: ag.usuario.email,
                telefoneCliente: ag.usuario.telefone,
                fotoPerfilCliente: ag.usuario.fotoPerfil
            } 
            : { // Se for um visitante, preenchemos com os dados do agendamento
                nomeCliente: ag.nomeVisitante,
                emailCliente: null,
                telefoneCliente: ag.telefoneVisitante,
                fotoPerfilCliente: null
            };

        // Remove os objetos originais para evitar redundância
        const { usuario, nomeVisitante, telefoneVisitante, ...restoDoAgendamento } = ag;

        return {
            ...restoDoAgendamento,
            ...dadosCliente, // Adiciona os novos campos de cliente unificados
        };
    });

    return agendamentosFormatados;
};

export const getAgendamentosPendentesPorBarbeiroService = async (barbeiroId: string) => {
    // 1. Sua lógica de data e hora (mantida, pois está correta)
    const agora = new Date();
    // Ajuste para o fuso horário local de Brasília (-3 horas do UTC)
    agora.setHours(agora.getHours() - 3);
    const hojeString = agora.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const horaAtualString = agora.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }); // "HH:MM"

    // 2. Sua query principal, com o 'include' adaptado para a comanda
    const agendamentosDoBanco = await prisma.agendamento.findMany({
        where: {
            barbeiroId: barbeiroId,
            status: 'Confirmado',
            OR: [
                { data: { lt: hojeString } },
                { data: hojeString, hora: { lt: horaAtualString } },
            ],
        },
        include: {
            usuario: { select: { nome: true } },
            barbeiro: { select: { nome: true } },
            servicosRealizados: {
                include: {
                    servico: { select: { nome: true } },
                },
            },
            produtosConsumidos: {
                include: {
                    produto: { select: { nome: true, precoVenda: true } }
                }
            }
        },
        orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });

    // 3. Formatação do resultado para a nova estrutura
    const agendamentosFormatados = agendamentosDoBanco.map(ag => {
        // Lógica para obter o nome do cliente (registrado ou visitante)
        const nomeCliente = ag.usuario?.nome || ag.nomeVisitante || 'Cliente não informado';
        
        // Calcula o valor total da comanda (somando apenas os serviços por enquanto)
        const valorTotalComanda = ag.servicosRealizados.reduce((total, item) => {
            // Supondo que você queira o preço atual do serviço para essa tela
            // Se você salvou 'precoNoMomento' em AgendamentoServico, use-o aqui
            const preco = item.precoNoMomento; 
            return total.plus(preco);
            //return total; // Implementar o cálculo quando o preço for adicionado
        }, new Decimal(0));

        // Cria uma lista com os nomes dos serviços
        const listaServicos = ag.servicosRealizados.map(item => item.servico.nome);

        return {
            ...ag,
            nomeCliente,
        };
    });

    return agendamentosFormatados;
};


export const updateStatusAgendamentoService = async (agendamentoId: string, status: string) => {
    const updatedAgendamento = await prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { status },
    });

    return updatedAgendamento;
};

export const deleteBarbeiroService = async (barbeiroId: string) => {
    // 2. Validação de agendamentos (continua igual, é uma ótima regra de negócio)
    const agendamentosPendentes = await prisma.agendamento.findFirst({
        where: { barbeiroId, status: "Confirmado" },
    });

    if (agendamentosPendentes) {
        throw { status: 400, message: "Este barbeiro possui agendamentos confirmados e não pode ser excluído." };
    }

    // 3. Encontrar o barbeiro E incluir o usuário do sistema para pegar a URL da foto e o ID de login
    const barbeiroExiste = await prisma.barbeiro.findUnique({
        where: { id: barbeiroId },
        include: {
            usuarioSistema: true // Inclui o registro de login relacionado
        }
    });

    if (!barbeiroExiste) {
        throw { status: 404, message: "Barbeiro não encontrado." };
    }

    // 4. Guardar a URL da imagem e o ID do usuário do sistema
    const fotoParaDeletar = barbeiroExiste.fotoPerfil;
    const usuarioSistemaId = barbeiroExiste.usuarioSistema.id;

    // 5. Usar uma transação para garantir a integridade dos dados
    await prisma.$transaction(async (tx) => {
        // Deleta os horários de trabalho do barbeiro
        await tx.horarioTrabalho.deleteMany({
            where: { barbeiroId },
        });

        // Deleta o perfil do barbeiro
        // A cascade delete cuidaria disso, mas ser explícito na transação é seguro.
        await tx.barbeiro.delete({
            where: { id: barbeiroId },
        });

        // Deleta a conta de login do barbeiro
        await tx.usuarioSistema.delete({
            where: { id: usuarioSistemaId },
        });
    });

    // 6. Após o sucesso da transação, deletar a imagem do Blob
    if (fotoParaDeletar) {
        try {
            await del(fotoParaDeletar); // Deleta usando a URL completa
            console.log(`Blob da foto de perfil deletado: ${fotoParaDeletar}`);
        } catch (error) {
            // Loga o erro, mas não impede a resposta de sucesso, pois o principal (BD) foi feito.
            console.error(`Falha ao deletar o blob da foto de perfil ${fotoParaDeletar}:`, error);
        }
    }

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

interface ListarProdutosOptions {
    barbeariaId: string;
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    status?: StatusProduto; // Filtra por ATIVO ou ARQUIVADO
}

// ALTERADO: Função de listagem totalmente refatorada
export const listarProdutosService = async (options: ListarProdutosOptions) => {
    const { 
        barbeariaId, 
        page = 1,          // Valor padrão da página é 1
        pageSize = 10,     // Valor padrão de 10 itens por página
        searchQuery, 
        status = 'ATIVO' // VALOR PADRÃO: Retorna apenas produtos ATIVOS
    } = options;

    // Constrói a cláusula 'where' dinamicamente
    const whereClause: any = {
        barbeariaId: barbeariaId,
        status: status, // Filtra pelo status recebido (padrão: ATIVO)
    };

    // Adiciona a busca por nome, se um searchQuery for fornecido
    if (searchQuery) {
        whereClause.nome = {
            contains: searchQuery,
            mode: 'insensitive', // Ignora maiúsculas/minúsculas
        };
    }

    const skip = (page - 1) * pageSize;

    // Executa duas queries em paralelo para otimização
    const [produtos, total] = await prisma.$transaction([
        // Query 1: Busca os produtos com paginação e filtros
        prisma.produto.findMany({
            where: whereClause,
            orderBy: { nome: 'asc' },
            skip: skip,
            take: pageSize,
        }),
        // Query 2: Conta o total de produtos que correspondem ao filtro (sem paginação)
        prisma.produto.count({
            where: whereClause,
        }),
    ]);

    // Retorna um objeto estruturado com os dados e a paginação
    return {
        produtos,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
};

// ALTERADO: Interface DTO com os novos campos
interface CriarProdutoDTO {
    barbeariaId: string;
    nome: string;
    descricao?: string;
    tipo: string;
    precoVenda: number; // ALTERADO: de 'preco' para 'precoVenda'
    custo: number; // NOVO
    quantidade: number; // NOVO: Quantidade inicial
    alertaEstoqueBaixo?: number; // NOVO
    dataValidade?: string | Date; // NOVO
    imagemUrl?: string;
    responsavelId: string; // NOVO: ID do usuário que está criando
}

export const criarProdutoService = async (data: CriarProdutoDTO): Promise<Produto> => {
    
    // IMPORTANTE: Usando uma transação para garantir a consistência dos dados
    const novoProduto = await prisma.$transaction(async (tx) => {
        // 1. Cria o produto no banco de dados
        const produtoCriado = await tx.produto.create({
            data: {
                barbeariaId: data.barbeariaId,
                nome: data.nome,
                descricao: data.descricao || null,
                tipo: data.tipo,
                precoVenda: data.precoVenda,
                custo: data.custo,
                quantidade: data.quantidade,
                alertaEstoqueBaixo: data.alertaEstoqueBaixo || null,
                // Converte a string da data para um objeto Date, se fornecido
                dataValidade: data.dataValidade ? new Date(data.dataValidade) : null,
                imagemUrl: data.imagemUrl || null,
            },
        });

        // 2. Se o produto foi criado com uma quantidade inicial, cria a primeira movimentação
        if (produtoCriado && data.quantidade > 0) {
            await tx.movimentacaoEstoque.create({
                data: {
                    produtoId: produtoCriado.id,
                    tipo: TipoMovimentacao.ENTRADA, // A primeira movimentação é uma ENTRADA
                    quantidade: data.quantidade,
                    motivo: 'Cadastro inicial de produto',
                    responsavelId: data.responsavelId,
                }
            });
        }
        
        return produtoCriado;
    });

    return novoProduto;
};

interface EditarProdutoDTO {
    barbeariaId: string;
    produtoId: string;
    responsavelId: string; // NOVO: ID do usuário que faz a alteração
    nome?: string;
    descricao?: string;
    tipo?: string;
    precoVenda?: number;
    custo?: number;
    alertaEstoqueBaixo?: number;
    dataValidade?: string | Date;
    imagemUrl?: string;
    ajusteEstoque?: number; // NOVO: Valor a ser somado/subtraído do estoque (ex: 10, -5)
    motivoAjuste?: string;  // NOVO: Motivo da alteração do estoque
}

export const editarProdutoService = async (data: EditarProdutoDTO): Promise<Produto> => {

    const produtoAtualizado = await prisma.$transaction(async (tx) => {
        // 1. Busca o produto para validar a existência e a posse
        const produtoExistente = await tx.produto.findUnique({
            where: { id: data.produtoId },
        });

        if (!produtoExistente || produtoExistente.barbeariaId !== data.barbeariaId) {
            throw new Error('Produto não encontrado ou não pertence a esta barbearia.');
        }

        // 2. Se uma nova imagem foi enviada, deleta a antiga (sua lógica atual está perfeita)
        if (data.imagemUrl && produtoExistente.imagemUrl) {
            await del(produtoExistente.imagemUrl).catch(err => 
                console.error(`Falha ao deletar o blob antigo ${produtoExistente.imagemUrl}:`, err)
            );
        }

        // 3. Monta o objeto de atualização para os dados descritivos
        const dataToUpdate: any = {};
        if (data.nome !== undefined) dataToUpdate.nome = data.nome;
        if (data.descricao !== undefined) dataToUpdate.descricao = data.descricao;
        if (data.tipo !== undefined) dataToUpdate.tipo = data.tipo;
        if (data.precoVenda !== undefined) dataToUpdate.precoVenda = data.precoVenda;
        if (data.custo !== undefined) dataToUpdate.custo = data.custo;
        if (data.alertaEstoqueBaixo !== undefined) dataToUpdate.alertaEstoqueBaixo = data.alertaEstoqueBaixo;
        if (data.dataValidade !== undefined) dataToUpdate.dataValidade = data.dataValidade ? new Date(data.dataValidade) : null;
        if (data.imagemUrl !== undefined) dataToUpdate.imagemUrl = data.imagemUrl;

        // 4. Lógica para o AJUSTE DE ESTOQUE
        if (data.ajusteEstoque !== undefined && data.ajusteEstoque !== 0) {
            if (!data.motivoAjuste) {
                throw new Error('O motivo do ajuste de estoque é obrigatório.');
            }

            const novaQuantidade = produtoExistente.quantidade + data.ajusteEstoque;
            if (novaQuantidade < 0) {
                throw new Error('Ajuste inválido. O estoque não pode ficar negativo.');
            }
            dataToUpdate.quantidade = novaQuantidade; // Adiciona a nova quantidade ao update

            // Cria o registro de movimentação
            await tx.movimentacaoEstoque.create({
                data: {
                    produtoId: data.produtoId,
                    tipo: data.ajusteEstoque > 0 ? TipoMovimentacao.ENTRADA : TipoMovimentacao.SAIDA,
                    quantidade: Math.abs(data.ajusteEstoque), // A quantidade é sempre positiva
                    motivo: data.motivoAjuste,
                    responsavelId: data.responsavelId,
                }
            });
        }
        
        // 5. Verifica se há algo para atualizar
        if (Object.keys(dataToUpdate).length === 0) {
            throw new Error('Nenhuma alteração foi fornecida.');
        }

        // 6. Atualiza o produto no banco de dados
        return tx.produto.update({
            where: { id: data.produtoId },
            data: dataToUpdate,
        });
    });

    return produtoAtualizado;
};

interface DeletarProdutoDTO {
    barbeariaId: string;
    produtoId: string;
}

// RENOMEADO E ALTERADO: De 'deletar' para 'arquivar'
export const arquivarProdutoService = async ({ barbeariaId, produtoId }: DeletarProdutoDTO): Promise<Produto> => {
    // 1. Busca o produto para validar a posse
    const produtoExistente = await prisma.produto.findFirst({
        where: { 
            id: produtoId,
            barbeariaId: barbeariaId,
        },
    });

    if (!produtoExistente) {
        throw new Error('Produto não encontrado ou não pertence a esta barbearia.');
    }

    // 2. Se o produto já estiver arquivado, podemos lançar um erro ou apenas retorná-lo
    if (produtoExistente.status === 'ARQUIVADO') {
        throw new Error('Este produto já está arquivado.');
    }

    // 3. Em vez de deletar, atualizamos o status para ARQUIVADO
    const produtoArquivado = await prisma.produto.update({
        where: { id: produtoId },
        data: {
            status: 'ARQUIVADO',
        },
    });

    // IMPORTANTE: Não deletamos a imagem do Vercel Blob. 
    // Ela ainda pode ser útil para exibir em relatórios de vendas antigas.

    return produtoArquivado;
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
    servicoId: string; // O ID do primeiro serviço continua sendo essencial
    data: string;
    hora: string;
    // Novos campos que substituem a "gambiarra"
    nomeVisitante: string; 
    telefoneVisitante?: string;
}

export const createAgendamentoVisitanteService = async ({
    barbeariaId,
    barbeiroId,
    servicoId,
    data,
    hora,
    nomeVisitante,
    telefoneVisitante,
}: AgendamentoVisitanteInput) => {

    // 1. Validação de campos obrigatórios (incluindo o nome do visitante)
    if (!barbeariaId || !barbeiroId || !servicoId || !data || !hora || !nomeVisitante) {
        const error = new Error('Todos os campos, incluindo o nome do cliente, são obrigatórios.');
        (error as any).statusCode = 400;
        throw error;
    }

    // 2. Buscar o serviço para obter o preço atual e validar se ele existe
    const servico = await prisma.servico.findUnique({
        where: { id: servicoId },
    });

    if (!servico || servico.barbeariaId !== barbeariaId) {
        const error = new Error('Serviço não encontrado para esta barbearia.');
        (error as any).statusCode = 404;
        throw error;
    }

    // 3. Sua verificação de horário existente (continua a mesma e está correta)
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
        (error as any).statusCode = 409; // 409 Conflict é um bom status para isso
        throw error;
    }

    // 4. Criar o agendamento e seu primeiro serviço DENTRO DE UMA TRANSAÇÃO
    const novoAgendamentoComServico = await prisma.$transaction(async (tx) => {
        // Passo A: Cria o registro principal do Agendamento
        const novoAgendamento = await tx.agendamento.create({
            data: {
                barbeariaId,
                barbeiroId,
                data,
                hora,
                status: 'Confirmado',
                // Adiciona os dados do visitante, sem gambiarra
                nomeVisitante: nomeVisitante,
                telefoneVisitante: telefoneVisitante,
                // O campo usuarioId fica NULO, como planejado
            },
        });

        // Passo B: Cria o registro na tabela de ligação AgendamentoServico
        await tx.agendamentoServico.create({
            data: {
                agendamentoId: novoAgendamento.id,
                servicoId: servicoId,
                // Salva o preço do serviço no momento do agendamento
                precoNoMomento: servico.preco || 0,
            },
        });

        return novoAgendamento;
    });

    // 5. Retorna o agendamento criado (agora sem servicoId direto)
    // Opcional: você pode incluir os serviços para retornar o agendamento completo
    return prisma.agendamento.findUnique({
        where: { id: novoAgendamentoComServico.id },
        include: {
            servicosRealizados: {
                include: {
                    servico: true,
                },
            },
        },
    });
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

// Opcional: Definir um tipo para o retorno formatado
type AgendamentoPendenteFormatado = {
    idAgendamento: string;
    status: string;
    data: string;
    hora: string;
    valorTotalComanda: string;
    nomeCliente: string | null;
    nomeBarbeiro: string | null;
    servicos: string[];
    produtos: { nome: string | null, quantidade: number }[];
};

export const listarAgendamentosPendentesService = async (barbeariaId: string) => {
    // ... lógica de data e hora ...
    const agora = new Date();
    agora.setHours(agora.getHours() - 3);
    const hojeString = agora.toISOString().split('T')[0];
    const horaAtualString = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const agendamentosDoBanco = await prisma.agendamento.findMany({
        where: {
            barbeariaId: barbeariaId,
            status: 'Confirmado',
            OR: [
                { data: { lt: hojeString } },
                { data: hojeString, hora: { lt: horaAtualString } },
            ],
        },
        // --- A CORREÇÃO ESTÁ AQUI ---
        include: {
            usuario: { select: { nome: true } },
            barbeiro: { select: { nome: true } },
            servicosRealizados: {
                include: {
                    servico: { select: { nome: true } },
                },
            },
            produtosConsumidos: {
                include: {
                    produto: { select: { nome: true, precoVenda: true } }
                }
            }
        },
        orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });

    const agendamentosFormatados = agendamentosDoBanco.map(ag => {
        const nomeCliente = ag.usuario?.nome || ag.nomeVisitante || 'Cliente';
        return {
            ...ag,
            nomeCliente,
        };
    });

    return agendamentosFormatados;
};

export interface ConcluirAgendamentoInput {
    // Lista de produtos consumidos com suas quantidades
    produtosConsumidos: {
        produtoId: string;
        quantidade: number;
    }[];
    // Lista de serviços extras realizados (se houver)
    servicosAdicionais?: {
        servicoId: string;
    }[];
    responsavelId: string; // ID do UsuarioSistema que está fechando a comanda
}

export const concluirAgendamentoService = async (agendamentoId: string, barbeariaId: string, data: ConcluirAgendamentoInput): Promise<void> => {
    const { produtosConsumidos = [], servicosAdicionais = [], responsavelId } = data;

    await prisma.$transaction(async (tx) => {
        // 1. Validação inicial: Garante que o agendamento existe e está 'Confirmado'
        const agendamentoInicial = await tx.agendamento.findFirst({
            where: { id: agendamentoId, barbeariaId: barbeariaId, status: 'Confirmado' },
        });

        if (!agendamentoInicial) {
            throw new Error("Operação falhou: Agendamento não encontrado, não pertence a esta barbearia ou já foi finalizado/cancelado.");
        }

        // 2. ADICIONAR NOVOS SERVIÇOS à comanda
        if (servicosAdicionais.length > 0) {
            const servicosData = await tx.servico.findMany({
                where: { id: { in: servicosAdicionais.map(s => s.servicoId) } },
            });
            await tx.agendamentoServico.createMany({
                data: servicosData.map(servico => ({
                    agendamentoId: agendamentoId,
                    servicoId: servico.id,
                    precoNoMomento: servico.preco || 0,
                })),
            });
        }

        // 3. ADICIONAR NOVOS PRODUTOS à comanda
        if (produtosConsumidos.length > 0) {
            const produtosData = await tx.produto.findMany({
                where: { id: { in: produtosConsumidos.map(p => p.produtoId) } },
            });
            await tx.agendamentoProduto.createMany({
                data: produtosConsumidos.map(item => {
                    const produtoInfo = produtosData.find(p => p.id === item.produtoId);
                    return {
                        agendamentoId: agendamentoId,
                        produtoId: item.produtoId,
                        quantidade: item.quantidade,
                        precoVendaNoMomento: produtoInfo?.precoVenda || 0,
                    };
                }),
            });
        }

        // 4. BUSCAR A COMANDA COMPLETA (com itens antigos + novos)
        const comandaCompleta = await tx.agendamento.findUniqueOrThrow({
            where: { id: agendamentoId },
            include: {
                servicosRealizados: { include: { servico: true } },
                produtosConsumidos: { include: { produto: true } },
            },
        });

        // 5. CALCULAR O VALOR TOTAL FINAL
        const valorTotalServicos = comandaCompleta.servicosRealizados.reduce(
            (total, item) => total.plus(item.precoNoMomento), new Decimal(0)
        );
        const valorTotalProdutos = comandaCompleta.produtosConsumidos.reduce(
            (total, item) => total.plus(new Decimal(item.precoVendaNoMomento).times(item.quantidade)), new Decimal(0)
        );
        const valorTotalFinal = valorTotalServicos.plus(valorTotalProdutos);

        // 6. DAR BAIXA NO ESTOQUE de TODOS os produtos da comanda
        for (const item of comandaCompleta.produtosConsumidos) {
            await tx.movimentacaoEstoque.create({
                data: {
                    produtoId: item.produtoId,
                    quantidade: item.quantidade,
                    tipo: 'SAIDA',
                    motivo: `Venda agendamento #${agendamentoId.substring(0, 8)}`,
                    responsavelId: responsavelId,
                },
            });
            await tx.produto.update({
                where: { id: item.produtoId },
                data: { quantidade: { decrement: item.quantidade } },
            });
        }

        // 7. FINALIZAR O AGENDAMENTO com o status e valor total corretos
        await tx.agendamento.update({
            where: { id: agendamentoId },
            data: {
                status: 'Feito',
                valorTotal: valorTotalFinal,
            },
        });
    });
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

interface UpdatePictureProps {
    userId: string;
    userRole: Role;
    newImageUrl: string;
}

export const updateProfilePictureService = async ({ userId, userRole, newImageUrl }: UpdatePictureProps) => {
    // 1. Buscar o usuário atual para pegar a URL da foto antiga
    const usuarioAtual = await prisma.usuarioSistema.findUnique({
        where: { id: userId },
        select: { fotoPerfil: true }
    });

    if (!usuarioAtual) {
        throw new Error('Usuário não encontrado.');
    }

    const oldImageUrl = usuarioAtual.fotoPerfil;

    // 2. Iniciar uma transação para atualizar o(s) registro(s) no banco
    await prisma.$transaction(async (tx) => {
        // Atualiza a tabela principal de login
        await tx.usuarioSistema.update({
            where: { id: userId },
            data: { fotoPerfil: newImageUrl },
        });

        // Se o usuário é um barbeiro, atualiza também o perfil de barbeiro
        if (userRole === Role.BARBEIRO) {
            await tx.barbeiro.update({
                where: { usuarioSistemaId: userId }, // Encontra o perfil pela ligação
                data: { fotoPerfil: newImageUrl },
            });
        }
    });

    // 3. Após a transação bem-sucedida, deletar a imagem antiga do Vercel Blob
    if (oldImageUrl) {
        try {
            await del(oldImageUrl);
        } catch (error) {
            console.error(`Falha ao deletar o blob antigo ${oldImageUrl}:`, error);
        }
    }
};

interface DeletePictureProps {
    userId: string;
    userRole: Role;
}

export const deleteProfilePictureService = async ({ userId, userRole }: DeletePictureProps) => {
    // 1. Buscar o usuário atual para pegar a URL da foto
    const usuarioAtual = await prisma.usuarioSistema.findUnique({
        where: { id: userId },
        select: { fotoPerfil: true }
    });

    // Se o usuário não for encontrado ou já não tiver foto, não há nada a fazer.
    if (!usuarioAtual || !usuarioAtual.fotoPerfil) {
        // Retornamos sucesso, pois o estado final (sem foto) foi alcançado.
        return;
    }

    const imageUrlToDelete = usuarioAtual.fotoPerfil;

    // 2. Iniciar uma transação para remover a URL do banco de dados
    await prisma.$transaction(async (tx) => {
        // Define fotoPerfil como null na tabela principal
        await tx.usuarioSistema.update({
            where: { id: userId },
            data: { fotoPerfil: null },
        });

        // Se o usuário é um barbeiro, define como null no perfil também
        if (userRole === Role.BARBEIRO) {
            await tx.barbeiro.update({
                where: { usuarioSistemaId: userId },
                data: { fotoPerfil: null },
            });
        }
    });

    // 3. Após a transação bem-sucedida, deletar a imagem do Vercel Blob
    try {
        await del(imageUrlToDelete);
    } catch (error) {
        // Loga o erro, mas não falha a operação, pois o mais importante (BD) foi feito.
        console.error(`Falha ao deletar o blob antigo ${imageUrlToDelete}:`, error);
    }
};

export const getBarbeariaByIdService = async (barbeariaId: string) => {
    const barbearia = await prisma.barbearia.findUnique({
        where: {
            id: barbeariaId,
        },
        select: {
            id: true,
            nome: true,
            endereco: true,
            celular: true,
            telefone: true,
            fotoPerfil: true,
            descricao: true,
            status: true,
            stripeCurrentPeriodEnd: true,
            latitude: true,
            longitude: true
        }
    });

    if (!barbearia) {
        throw { status: 404, message: "Barbearia não encontrada." };
    }

    // Se a foto de perfil for uma URL do Vercel Blob, ela já virá completa.
    // Se for um nome de arquivo local, você pode adicionar a lógica de montar a URL aqui.
    // Ex: barbearia.fotoPerfil = `${process.env.BACKEND_URL}/uploads/${barbearia.fotoPerfil}`

    return barbearia;
};

interface UpdateBarbeariaDTO {
    barbeariaId: string;
    nome?: string;
    descricao?: string;
    endereco?: string;
    celular?: string;
    telefone?: string;
    latitude?: number | string;
    longitude?: number | string;
    fotoPerfil?: string;
}

export const updateBarbeariaService = async (data: UpdateBarbeariaDTO) => {
    const { barbeariaId, fotoPerfil, ...outrosDados } = data;

    const barbeariaExistente = await prisma.barbearia.findUnique({
        where: { id: barbeariaId },
    });

    if (!barbeariaExistente) {
        throw { status: 404, message: 'Barbearia не encontrada.' };
    }

    // ✅ NOVA VERIFICAÇÃO DE NOME DUPLICADO
    // Só executa se um novo nome foi enviado e é diferente do nome atual.
    if (outrosDados.nome && outrosDados.nome !== barbeariaExistente.nome) {
        const nomeExistente = await prisma.barbearia.findFirst({
            where: {
                nome: outrosDados.nome,
                // Garante que não estamos comparando a barbearia com ela mesma.
                id: { not: barbeariaId } 
            }
        });

        // Se encontrou outra barbearia com o mesmo nome, lança um erro.
        if (nomeExistente) {
            throw { status: 409, message: 'Este nome de barbearia já está em uso.' };
        }
    }

    // O resto da sua lógica de deletar o blob antigo continua aqui...
    if (fotoPerfil && barbeariaExistente.fotoPerfil) {
        try {
            await del(barbeariaExistente.fotoPerfil);
        } catch (error) {
            console.error(`Falha ao deletar o blob antigo ${barbeariaExistente.fotoPerfil}:`, error);
        }
    }

    const dataToUpdate: any = {};
    let algumaCoisaMudou = false;

    // A sua lógica de comparação de dados continua aqui...
    for (const key in outrosDados) {
        const typedKey = key as keyof typeof outrosDados;
        if (outrosDados[typedKey] !== undefined) {
            const valorAntigo = barbeariaExistente[typedKey];
            const valorNovo = outrosDados[typedKey];
            if (String(valorAntigo) !== String(valorNovo)) {
                if (typedKey === 'latitude' || typedKey === 'longitude') {
                    dataToUpdate[typedKey] = parseFloat(valorNovo as string);
                } else {
                    dataToUpdate[typedKey] = valorNovo;
                }
                algumaCoisaMudou = true;
            }
        }
    }
    
    if (fotoPerfil) {
        dataToUpdate.fotoPerfil = fotoPerfil;
        algumaCoisaMudou = true;
    }
    
    if (!algumaCoisaMudou) {
        throw { status: 400, message: 'Nenhuma alteração foi feita.' };
    }

    const barbeariaAtualizada = await prisma.barbearia.update({
        where: { id: barbeariaId },
        data: dataToUpdate,
    });

    return barbeariaAtualizada;
};