import { Request, Response } from 'express';
import { alterarSenhaService, atualizarUsuarioService, BuscarAvaliacoesPorBarbearia, BuscarBarbeariaPorNome, BuscarBarbeariasAtivas, BuscarBarbeariasPorNome, BuscarBarbeariasProximas, BuscarBarbeirosPorBarbearia, BuscarProdutosPorBarbearia, BuscarServicosPorBarbearia, cancelarAgendamentoService, concluirAgendamentoService, createAgendamentoVisitanteService, createFormaPagamentoService, createHorarioFuncionamentoService, CriarAvaliacao, criarProdutoService, criarRedeSocialService, criarServicoService, deletarProdutoService, deletarRedeSocialService, deletarServicoService, deleteBarbeiroService, deleteFormaPagamentoService, deleteHorarioFuncionamentoService, editarProdutoService, editarRedeSocialService, editarServicoService, getAgendamentosPorBarbeiroService, getAgendamentosService, getFormasPagamentoService, getHorariosFuncionamentoService, getHorariosPorDiaService, listarAgendamentosPendentesService, listarProdutosService, listarRedesSociaisService, listarServicosDaBarbeariaService, ObterFormasPagamento, ObterHorariosFuncionamento, ObterRedesSociais, updateHorarioFuncionamentoService, updateStatusAgendamentoService } from '../services/barbeariaService';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../libs/prisma';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middlewares/authMiddlewareBarber';
import sharp from 'sharp'; // <-- Importar o sharp
import path from 'path';   // <-- Importar o path
import crypto from 'crypto';

export const obterBarbeariasProximas = async (req: Request, res: Response) => {
    try {
        const { latitude, longitude, raio = 50 } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: "Latitude e longitude são obrigatórios." });
        }

        const latUser = parseFloat(latitude as string);
        const lonUser = parseFloat(longitude as string);
        const raioKm = parseFloat(raio as string);

        const barbeariasProximas = await BuscarBarbeariasProximas(latUser, lonUser, raioKm);

        return res.json(barbeariasProximas);
    } catch (error) {
        console.error("Erro ao buscar barbearias próximas:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const obterBarbeariasAtivas = async (req: Request, res: Response) => {
    try {
        const barbearias = await BuscarBarbeariasAtivas();
        return res.status(200).json(barbearias);
    } catch (error) {
        console.error("Erro ao buscar barbearias:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const obterBarbeariasPorNome = async (req: Request, res: Response) => {
    try {
        const { nome } = req.params;

        if (!nome || typeof nome !== "string") {
            return res.status(400).json({ error: "O parâmetro 'nome' é obrigatório e deve ser uma string." });
        }

        const barbearias = await BuscarBarbeariasPorNome(nome);
        return res.status(200).json(barbearias);
    } catch (error) {
        console.error("Erro ao buscar barbearias:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const obterBarbeariaPorNome = async (req: Request, res: Response) => {
    try {
        const { nome } = req.params;

        const barbearia = await BuscarBarbeariaPorNome(nome);

        if (!barbearia) {
            return res.status(404).json({ error: "Barbearia não encontrada" });
        }

        return res.json(barbearia);
    } catch (error) {
        console.error("Erro ao buscar barbearia:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};

export const obterServicosPorBarbearia = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const servicos = await BuscarServicosPorBarbearia(id);

        if (servicos.length === 0) {
            return res.status(404).json({ error: 'Nenhum serviço encontrado para esta barbearia.' });
        }

        return res.status(200).json(servicos);
    } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        return res.status(500).json({ error: 'Erro ao buscar serviços.' });
    }
};

export const obterBarbeirosPorBarbearia = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const barbeiros = await BuscarBarbeirosPorBarbearia(id);

        if (barbeiros.length === 0) {
            return res.status(404).json({ error: 'Nenhum barbeiro encontrado para esta barbearia.' });
        }

        return res.status(200).json(barbeiros);
    } catch (error) {
        console.error('Erro ao buscar barbeiros:', error);
        return res.status(500).json({ error: 'Erro ao buscar barbeiros.' });
    }
};

export const obterProdutosPorBarbearia = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const produtos = await BuscarProdutosPorBarbearia(id);

        if (produtos.length === 0) {
            return res.status(404).json({ error: 'Nenhum produto encontrado para esta barbearia.' });
        }

        return res.status(200).json(produtos);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        return res.status(500).json({ error: 'Erro ao buscar produtos.' });
    }
};

export const obterAvaliacoesPorBarbearia = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const avaliacoes = await BuscarAvaliacoesPorBarbearia(id);

        if (avaliacoes.length === 0) {
            return res.status(404).json({ error: 'Nenhuma avaliação encontrada para esta barbearia.' });
        }

        // Formata as avaliações antes de retornar
        const avaliacoesFormatadas = avaliacoes.map(avaliacao => ({
            id: avaliacao.id,
            nota: avaliacao.nota,
            nome: avaliacao.usuario.nome,
            data: avaliacao.dataHora,
            comentario: avaliacao.comentario
        }));

        return res.status(200).json(avaliacoesFormatadas);
    } catch (error) {
        console.error('Erro ao buscar avaliações:', error);
        return res.status(500).json({ error: 'Erro ao buscar avaliações.' });
    }
};

export const criarAvaliacao = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // ID da barbearia
        const { usuarioId, nota, comentario } = req.body; // Dados do corpo da requisição

        // Validação dos dados recebidos
        if (!usuarioId || !nota) {
            return res.status(400).json({ error: 'Campos obrigatórios não preenchidos!' });
        }

        // Chama o Service para criar a avaliação
        const avaliacao = await CriarAvaliacao(id, usuarioId, nota, comentario);

        return res.status(201).json({
            message: 'Avaliação cadastrada com sucesso!',
            id: avaliacao.id,
        });
    } catch (error) {
        console.error('Erro ao criar avaliação:', error);
        return res.status(500).json({ error: 'Erro ao salvar avaliação.' });
    }
};

export const obterHorariosFuncionamento = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        // Chama o Service para obter os horários formatados
        const horarios = await ObterHorariosFuncionamento(barbeariaId);

        if (horarios.length === 0) {
            return res.status(404).json({ error: 'Nenhum horário de funcionamento cadastrado para essa barbearia.' });
        }

        return res.status(200).json(horarios);
    } catch (error) {
        console.error('Erro ao buscar horários de funcionamento:', error);
        return res.status(500).json({ error: 'Erro ao buscar horários de funcionamento.' });
    }
};

export const obterFormasPagamento = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        // Chama o Service para obter as formas de pagamento
        const formasPagamento = await ObterFormasPagamento(barbeariaId);

        if (formasPagamento.length === 0) {
            return res.status(404).json({ error: 'Nenhuma forma de pagamento cadastrada para essa barbearia.' });
        }

        return res.status(200).json(formasPagamento);
    } catch (error) {
        console.error('Erro ao buscar formas de pagamento:', error);
        return res.status(500).json({ error: 'Erro ao buscar formas de pagamento.' });
    }
};

export const obterRedesSociais = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        // Chama o Service para obter as redes sociais
        const redesSociais = await ObterRedesSociais(barbeariaId);

        if (redesSociais.length === 0) {
            return res.status(404).json({ error: 'Nenhuma rede social cadastrada para essa barbearia.' });
        }

        return res.status(200).json(redesSociais);
    } catch (error) {
        console.error('Erro ao buscar redes sociais:', error);
        return res.status(500).json({ error: 'Erro ao buscar redes sociais.' });
    }
};


export const registrarNovaBarbeariaController = async (req: Request, res: Response) => {
    // 1. Extrair os dados para a barbearia e para o seu administrador.
    // O seu frontend precisará enviar estes campos.
    const {
        nomeBarbearia,
        endereco,
        celular,
        telefone,
        latitude,
        longitude,
        // Dados do Admin
        nomeAdmin,
        emailAdmin,
        senhaAdmin,
    } = req.body;

    // 2. Validação dos dados essenciais
    if (!nomeBarbearia || !nomeAdmin || !emailAdmin || !senhaAdmin) {
        return res.status(400).json({ message: 'Campos essenciais para barbearia e admin são obrigatórios.' });
    }

    try {
        // 3. Criptografar a senha do admin
        const senhaHash = await bcrypt.hash(senhaAdmin, 10);

        // 4. Usar uma transação para criar a Barbearia e o UsuarioSistema (Admin)
        const resultado = await prisma.$transaction(async (tx) => {
            // Cria a barbearia
            const novaBarbearia = await tx.barbearia.create({
                data: {
                    nome: nomeBarbearia,
                    endereco,
                    celular,
                    telefone,
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                },
            });

            // Cria o usuário admin e o conecta à barbearia criada acima
            const adminUsuario = await tx.usuarioSistema.create({
                data: {
                    nome: nomeAdmin,
                    email: emailAdmin,
                    senha: senhaHash,
                    role: Role.ADMIN, // Define a função como ADMIN
                    barbeariaId: novaBarbearia.id, // Associa ao ID da nova barbearia
                },
            });

            return { novaBarbearia, adminUsuario };
        });

        // 5. Retornar sucesso (sem a senha, claro)
        const { senha, ...adminSemSenha } = resultado.adminUsuario;

        return res.status(201).json({
            message: 'Barbearia e administrador cadastrados com sucesso!',
            barbearia: resultado.novaBarbearia,
            admin: adminSemSenha,
        });

    } catch (error: any) {
        // Verificamos se o erro é de violação de campo único
        if (error.code === 'P2002') {
            const targetField = error.meta?.target as string[]; // Ex: ['nome'] ou ['email']

            // Se o campo for 'nome', a mensagem é sobre a barbearia
            if (targetField?.includes('nome')) {
                return res.status(409).json({ message: 'O nome desta barbearia já está em uso.' });
            }

            // Se o campo for 'email', a mensagem é sobre o email do admin
            if (targetField?.includes('email')) {
                return res.status(409).json({ message: 'Este e-mail já está em uso por outro administrador.' });
            }
        }

        console.error('Erro ao registrar barbearia:', error);
        return res.status(500).json({ message: error.message || 'Erro interno do servidor.' });
    }
};

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'minhaSuperChaveSecreta';
// No seu controller de login no backend

export const loginController = async (req: Request, res: Response) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
        }

        // ALTERAÇÃO AQUI: Adicionamos o `include`
        const usuario = await prisma.usuarioSistema.findUnique({
            where: { email },
            include: {
                barbearia: { // Incluímos os dados da barbearia relacionada
                    select: {
                        nome: true, // Só precisamos do nome por enquanto
                        stripeCurrentPeriodEnd: true// Se precisar de mais dados da barbearia no futuro, adicione aqui
                    }
                }
            }
        });

        if (!usuario) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }

        let perfilBarbeiro = null;
        if (usuario.role === 'BARBEIRO') {
            perfilBarbeiro = await prisma.barbeiro.findUnique({
                where: { usuarioSistemaId: usuario.id },
                select: { id: true, telefone: true }
            });
        }

        const { senha: _, ...dadosUsuario } = usuario;
        
        // O objeto `dadosUsuario` agora contém um sub-objeto `barbearia: { nome: '...' }`
        const usuarioCompleto = {
            ...dadosUsuario,
            perfilBarbeiro: perfilBarbeiro
        };
        
        const token = jwt.sign({ id: usuario.id, email: usuario.email, role: usuario.role, barbeariaId: usuario.barbeariaId }, SECRET_KEY, { expiresIn: '8h' });

        return res.status(200).json({
            message: 'Login realizado com sucesso!',
            usuario: usuarioCompleto,
            token,
        });

    } catch (error: any) {
        console.error('Erro ao fazer login:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const getAgendamentosController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;
        const agendamentos = await getAgendamentosService(barbeariaId);
        return res.json(agendamentos);
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
};

export const getAgendamentosPorBarbeiroController = async (req: AuthRequest, res: Response) => {
    try {
        const { barbeiroId: barbeiroIdDaUrl } = req.params;
        const usuarioLogado = req.user;

        if (!usuarioLogado) {
            // Este caso é improvável se o middleware checkRole for usado antes.
            return res.status(401).json({ error: 'Não autorizado.' });
        }

        // --- VERIFICAÇÃO DE PERMISSÃO ---
        // REGRA 1: Se o usuário logado é um BARBEIRO, ele só pode ver seus próprios agendamentos.
        if (usuarioLogado.role === 'BARBEIRO') {
            // Buscamos o perfil de barbeiro associado à conta de login
            const perfilDoUsuarioLogado = await prisma.barbeiro.findUnique({
                where: { usuarioSistemaId: usuarioLogado.id },
                select: { id: true }
            });

            if (perfilDoUsuarioLogado?.id !== barbeiroIdDaUrl) {
                return res.status(403).json({ error: 'Acesso proibido. Você só pode visualizar seus próprios agendamentos.' });
            }
        }
        // REGRA 2: Se for ADMIN, verifica se o barbeiro consultado pertence à sua barbearia.
        else if (usuarioLogado.role === 'ADMIN') {
            const barbeiroConsultado = await prisma.barbeiro.findUnique({
                where: { id: barbeiroIdDaUrl },
                select: { barbeariaId: true }
            });
            
            if (barbeiroConsultado?.barbeariaId !== usuarioLogado.barbeariaId) {
                return res.status(403).json({ error: 'Acesso proibido. Este barbeiro não pertence à sua barbearia.' });
            }
        }

        // Se passou nas verificações, busca os agendamentos.
        const agendamentos = await getAgendamentosPorBarbeiroService(barbeiroIdDaUrl);
        return res.json(agendamentos);

    } catch (error) {
        console.error('Erro ao buscar agendamentos do barbeiro:', error);
        return res.status(500).json({ error: 'Erro interno ao buscar agendamentos.' });
    }
};


export const getAgendamentosPendentesPorBarbeiroController = async (req: AuthRequest, res: Response) => {
    // 1. Pegamos o ID do barbeiro da URL e o usuário logado do token
    const { barbeiroId } = req.params;
    const usuarioLogado = req.user;

    // Validação inicial
    if (!barbeiroId) {
        return res.status(400).json({ error: 'ID do barbeiro é obrigatório na URL.' });
    }

    if (!usuarioLogado) {
        return res.status(401).json({ error: 'Não autorizado.' });
    }

    try {
        // --- 2. VERIFICAÇÃO DE PERMISSÃO ---
        if (usuarioLogado.role === 'BARBEIRO') {
            const perfilDoUsuarioLogado = await prisma.barbeiro.findUnique({
                where: { usuarioSistemaId: usuarioLogado.id },
                select: { id: true }
            });
            if (perfilDoUsuarioLogado?.id !== barbeiroId) {
                return res.status(403).json({ error: 'Acesso proibido. Você só pode ver seus próprios agendamentos pendentes.' });
            }
        } else if (usuarioLogado.role === 'ADMIN') {
            const barbeiroConsultado = await prisma.barbeiro.findUnique({
                where: { id: barbeiroId },
                select: { barbeariaId: true }
            });
            if (barbeiroConsultado?.barbeariaId !== usuarioLogado.barbeariaId) {
                return res.status(403).json({ error: 'Acesso proibido. Este barbeiro não pertence à sua barbearia.' });
            }
        }
        
        // --- 3. LÓGICA DE BUSCA (semelhante à sua, mas com filtro por barbeiroId) ---
        const agora = new Date();
        const hojeString = agora.toISOString().split('T')[0]; // "YYYY-MM-DD"
        const horaAtualString = agora.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }); // "HH:MM"

        const agendamentosDoBanco = await prisma.agendamento.findMany({
            where: {
                barbeiroId: barbeiroId, // Filtro principal da rota
                status: 'Confirmado',
                OR: [
                    { data: { lt: hojeString } }, // Agendamentos de dias anteriores
                    { data: hojeString, hora: { lt: horaAtualString } }, // Agendamentos de hoje que já passaram
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

        // --- 4. FORMATAÇÃO DO RESULTADO ---
        const agendamentosFormatados = agendamentosDoBanco.map(agendamento => ({
            idAgendamento: agendamento.id,
            status: agendamento.status,
            data: agendamento.data,
            hora: agendamento.hora,
            valor: String(agendamento.servico.preco), // Convertendo para string como no seu tipo
            nomeCliente: agendamento.usuario.nome,
            nomeBarbeiro: agendamento.barbeiro.nome,
            nomeServico: agendamento.servico.nome
        }));

        // 5. Retorna a lista formatada
        return res.status(200).json(agendamentosFormatados);

    } catch (error) {
        console.error('Erro ao buscar agendamentos pendentes do barbeiro:', error);
        return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
};

export const updateStatusAgendamentoController = async (req: Request, res: Response) => {
    try {
        const { agendamentoId } = req.params;
        const { status } = req.body;

        // Validação básica no controller
        if (!["Confirmado", "Feito", "Cancelado"].includes(status)) {
            return res.status(400).json({ error: "Status inválido. O status deve ser 'Confirmado', 'Feito' ou 'Cancelado'." });
        }

        const agendamentoAtualizado = await updateStatusAgendamentoService(agendamentoId, status);
        return res.json(agendamentoAtualizado);
    } catch (error) {
        console.error('Erro ao atualizar status do agendamento:', error);
        return res.status(500).json({ error: "Erro ao atualizar o status do agendamento" });
    }
};

export const registerBarbeiroController = async (req: AuthRequest, res: Response) => {
    // 1. Pegar o ID da barbearia do ADMIN que está logado (do token!)
    const { barbeariaId } = req.user!; // O '!' diz ao TS: "confie, o middleware garantiu que `user` existe"

    // 2. Pegar os dados do novo barbeiro do corpo da requisição
    const { nome, email, senha, telefone, fotoPerfil } = req.body;

    if (!nome || !email || !senha || !telefone) {
        return res.status(400).json({ error: 'Nome, email, senha e telefone são obrigatórios.' });
    }

    try {
        // 3. Verificar se o email já está em uso no sistema de login
        const emailExistente = await prisma.usuarioSistema.findUnique({
            where: { email },
        });

        if (emailExistente) {
            return res.status(409).json({ error: 'Este e-mail já está em uso no sistema.' });
        }

        // 4. Criptografar a senha do novo barbeiro
        const senhaHash = await bcrypt.hash(senha, 10);

        // 5. Usar uma transação para criar o UsuarioSistema e o Perfil de Barbeiro
        const novoBarbeiroCompleto = await prisma.$transaction(async (tx) => {
            // Primeiro, cria a conta de login com a role 'BARBEIRO'
            const novoUsuario = await tx.usuarioSistema.create({
                data: {
                    nome,
                    email,
                    senha: senhaHash,
                    fotoPerfil,
                    role: Role.BARBEIRO, // <-- A role é definida aqui!
                    barbeariaId: barbeariaId, // <-- O ID da barbearia do admin logado
                },
            });

            // Em seguida, cria o perfil do barbeiro e o conecta à conta de login recém-criada
            const novoPerfilBarbeiro = await tx.barbeiro.create({
                data: {
                    nome,
                    telefone,
                    fotoPerfil,
                    barbearia: {
                        connect: { id: barbeariaId }
                    },
                    usuarioSistema: { // <-- A LIGAÇÃO MÁGICA!
                        connect: { id: novoUsuario.id }
                    }
                }
            });

            return { usuario: novoUsuario, perfil: novoPerfilBarbeiro };
        });

        // Retira a senha da resposta por segurança
        const { senha: _, ...usuarioSemSenha } = novoBarbeiroCompleto.usuario;

        return res.status(201).json({
            message: 'Barbeiro cadastrado com sucesso!',
            barbeiro: {
                ...novoBarbeiroCompleto.perfil,
                usuario: usuarioSemSenha,
            },
        });

    } catch (error: any) {
        console.error('Erro ao registrar barbeiro:', error);
        // O P2002 aqui seria redundante pois já verificamos antes, mas é uma boa prática mantê-lo
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'E-mail já cadastrado.' });
        }
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const deleteBarbeiroController = async (req: Request, res: Response) => {
    try {
        const { barbeiroId } = req.params;

        const resultado = await deleteBarbeiroService(barbeiroId);

        return res.status(200).json({ message: resultado });
    } catch (error: any) {
        console.error('Erro ao deletar barbeiro:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Erro interno do servidor.' });
    }
};

export const updateBarbeiroController = async (req: AuthRequest, res: Response) => {
    // 1. ID do barbeiro a ser atualizado (da URL) e dados do utilizador logado (do token)
    const { barbeiroId } = req.params;
    const usuarioLogado = req.user!; // Sabemos que existe graças ao middleware

    // 2. Dados para atualização (do corpo da requisição)
    const { nome, telefone, email } = req.body;

    if (!nome || !telefone || !email) {
        return res.status(400).json({ error: "Nome, telefone e email são obrigatórios." });
    }

    try {
        // 3. Buscar o perfil do barbeiro que será editado, incluindo o ID da sua conta de login
        const barbeiroParaAtualizar = await prisma.barbeiro.findUnique({
            where: { id: barbeiroId },
            select: { usuarioSistemaId: true, barbeariaId: true } // Pegamos o ID da conta de login e da barbearia
        });

        if (!barbeiroParaAtualizar) {
            return res.status(404).json({ error: "Perfil de barbeiro não encontrado." });
        }

        // 4. VERIFICAÇÃO DE PERMISSÃO (Regra de Negócio Crucial)
        // Se o utilizador logado é um BARBEIRO, ele só pode editar a si mesmo.
        if (usuarioLogado.role === 'BARBEIRO' && usuarioLogado.id !== barbeiroParaAtualizar.usuarioSistemaId) {
            return res.status(403).json({ error: "Acesso proibido. Você só pode editar seu próprio perfil." });
        }
        // Se o utilizador logado é um ADMIN, ele só pode editar barbeiros da sua própria barbearia.
        if (usuarioLogado.role === 'ADMIN' && usuarioLogado.barbeariaId !== barbeiroParaAtualizar.barbeariaId) {
            return res.status(403).json({ error: "Acesso proibido. Este barbeiro não pertence à sua barbearia." });
        }

        // 5. Verificar se o novo email já está em uso por OUTRO utilizador
        const emailEmUso = await prisma.usuarioSistema.findFirst({
            where: {
                email: email,
                id: { not: barbeiroParaAtualizar.usuarioSistemaId } // Exclui o próprio utilizador da busca
            }
        });

        if (emailEmUso) {
            return res.status(409).json({ error: "Este e-mail já está em uso por outro utilizador." });
        }

        // 6. Executar as duas atualizações dentro de uma transação
        const [usuarioAtualizado, perfilAtualizado] = await prisma.$transaction([
            // Atualiza a conta de login
            prisma.usuarioSistema.update({
                where: { id: barbeiroParaAtualizar.usuarioSistemaId },
                data: { nome, email } // Atualiza nome e email no sistema de login
            }),
            // Atualiza o perfil profissional
            prisma.barbeiro.update({
                where: { id: barbeiroId },
                data: { nome, telefone } // Atualiza nome e telefone no perfil
            })
        ]);
        
        const { senha, ...usuarioSemSenha } = usuarioAtualizado;

        return res.status(200).json({
            message: "Barbeiro atualizado com sucesso!",
            barbeiro: {
                ...perfilAtualizado,
                usuario: usuarioSemSenha,
            }
        });

    } catch (error: any) {
        console.error("Erro ao atualizar barbeiro:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const getHorariosPorDiaController = async (req: Request, res: Response) => {
    try {
        const { barbeiroId, diaSemana } = req.params;
        const horarios = await getHorariosPorDiaService(barbeiroId, diaSemana);
        return res.status(200).json({ horarios });
    } catch (error: any) {
        console.error("Erro ao buscar horários do barbeiro:", error);
        return res.status(error.status || 500).json({ error: error.message || "Erro interno do servidor." });
    }
};

export const listarServicosController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        const servicos = await listarServicosDaBarbeariaService(barbeariaId);

        return res.status(200).json(servicos);
    } catch (error: any) {
        console.error('Erro ao buscar serviços da barbearia:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Erro interno do servidor.' });
    }
};

export const criarServicoController = async (req: AuthRequest, res: Response) => {
    try {
        const barbeariaId = req.user?.barbeariaId;
        if (!barbeariaId) {
            throw { status: 403, message: 'Usuário não associado a uma barbearia.' };
        }
        
        const { nome, duracao, preco } = req.body;
        let imagemUrl: string | undefined = undefined; // Variável para o nome final do arquivo

        // 👇 LÓGICA DE PROCESSAMENTO COM O SHARP 👇
        if (req.file) {
            // Gera um nome de arquivo único, mas com a extensão .webp
            const fileHash = crypto.randomBytes(16).toString('hex');
            const fileName = `${fileHash}.webp`;

            const uploadFolder = path.resolve(__dirname, '..', '..', 'uploads');
            const filePath = path.join(uploadFolder, fileName);

            await sharp(req.file.buffer) // Pega o buffer da imagem em memória
                .resize({ 
                    width: 500, // Largura máxima de 500px
                    height: 500, // Altura máxima de 500px
                    fit: 'cover', // 'cover' recorta para preencher as dimensões
                })
                .toFormat('webp', { quality: 80 }) // Converte para o formato WebP com 80% de qualidade
                .toFile(filePath); // Salva o arquivo processado no disco

            imagemUrl = fileName; // Guarda o nome do novo arquivo para salvar no BD
        }

        const novoServico = await criarServicoService({ barbeariaId, nome, duracao, preco, imagemUrl });

        return res.status(201).json({
            message: 'Serviço criado com sucesso!',
            servico: novoServico,
        });
    } catch (error: any) {
        // Tratando o erro de arquivo muito grande do Multer
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. O limite é de 5MB.' });
        }
        console.error('Erro ao criar serviço:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Erro interno do servidor.' });
    }
};

export const editarServicoController = async (req: AuthRequest, res: Response) => {
    try {
        const barbeariaId = req.user?.barbeariaId;
        const { servicoId } = req.params;

        if (!barbeariaId) {
            throw { status: 403, message: 'Usuário não associado a uma barbearia.' };
        }

        const { nome, duracao, preco } = req.body;
        let imagemUrl: string | undefined = undefined;

        // --- LÓGICA DE PROCESSAMENTO COM SHARP (IGUAL À DA CRIAÇÃO) ---
        // Se um novo arquivo foi enviado, processe-o.
        if (req.file) {
            // Gera um nome de arquivo único com a extensão .webp
            const fileHash = crypto.randomBytes(16).toString('hex');
            const fileName = `${fileHash}.webp`;

            const uploadFolder = path.resolve(__dirname, '..', '..', 'uploads');
            const filePath = path.join(uploadFolder, fileName);

            // Processa a imagem do buffer: redimensiona, converte e salva
            await sharp(req.file.buffer)
                .resize({
                    width: 500,
                    height: 500,
                    fit: 'cover',
                })
                .toFormat('webp', { quality: 80 })
                .toFile(filePath);

            // Guarda o nome do NOVO arquivo para ser passado ao serviço
            imagemUrl = fileName;
        }

        // Chama o serviço com todos os dados, incluindo a possível nova imagem processada
        const servicoAtualizado = await editarServicoService({
            barbeariaId,
            servicoId,
            nome,
            duracao,
            preco,
            imagemUrl // Passa o nome do NOVO arquivo para o serviço
        });

        return res.status(200).json({
            message: 'Serviço atualizado com sucesso!',
            servico: servicoAtualizado,
        });

    } catch (error: any) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. O limite é de 5MB.' });
        }
        console.error('Erro ao editar serviço:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Erro interno do servidor.' });
    }
};

export const deletarServicoController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId, servicoId } = req.params;

        await deletarServicoService({ barbeariaId, servicoId });

        return res.status(200).json({ message: 'Serviço deletado com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao deletar serviço:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Erro interno do servidor.' });
    }
};

export const listarProdutosController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        const produtos = await listarProdutosService(barbeariaId);

        return res.status(200).json(produtos);
    } catch (error) {
        console.error('Erro ao buscar produtos da barbearia:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const criarProdutoController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;
        const { nome, descricao, tipo, preco, imagemUrl } = req.body;

        // Validação básica no controller para evitar requisições inválidas
        if (!nome || typeof nome !== 'string') {
            return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
        }
        if (!tipo || typeof tipo !== 'string') {
            return res.status(400).json({ error: 'Tipo do produto é obrigatório.' });
        }
        if (preco === undefined || isNaN(Number(preco)) || Number(preco) < 0) {
            return res.status(400).json({ error: 'Preço do produto é obrigatório e deve ser positivo.' });
        }

        const novoProduto = await criarProdutoService({
            barbeariaId,
            nome,
            descricao,
            tipo,
            preco: Number(preco),
            imagemUrl,
        });

        return res.status(201).json({
            message: 'Produto criado com sucesso!',
            produto: novoProduto,
        });
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const editarProdutoController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId, produtoId } = req.params;
        const { nome, descricao, tipo, preco } = req.body;

        if (!nome || typeof nome !== 'string') {
            return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
        }
        if (!tipo || typeof tipo !== 'string') {
            return res.status(400).json({ error: 'Tipo do produto é obrigatório.' });
        }
        if (preco === undefined || isNaN(Number(preco)) || Number(preco) < 0) {
            return res.status(400).json({ error: 'Preço do produto é obrigatório e deve ser positivo.' });
        }

        const produtoAtualizado = await editarProdutoService({
            barbeariaId,
            produtoId,
            nome,
            descricao,
            tipo,
            preco: Number(preco),
        });

        if (!produtoAtualizado) {
            return res.status(404).json({ error: 'Produto não encontrado para esta barbearia.' });
        }

        return res.status(200).json({
            message: 'Produto atualizado com sucesso!',
            produto: produtoAtualizado,
        });
    } catch (error) {
        console.error('Erro ao editar produto:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const deletarProdutoController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId, produtoId } = req.params;

        if (!barbeariaId || !produtoId) {
            return res.status(400).json({ error: 'ID da barbearia e do produto são obrigatórios.' });
        }

        const sucesso = await deletarProdutoService({ barbeariaId, produtoId });

        if (!sucesso) {
            return res.status(404).json({ error: 'Produto não encontrado para esta barbearia.' });
        }

        return res.status(200).json({ message: 'Produto deletado com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const listarRedesSociaisController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        const redesSociais = await listarRedesSociaisService(barbeariaId);

        return res.status(200).json(redesSociais);
    } catch (error) {
        console.error('Erro ao buscar redes sociais da barbearia:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const criarRedeSocialController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;
        const { rede, link } = req.body;

        if (!barbeariaId || !rede || !link) {
            return res.status(400).json({ error: 'Barbearia, nome da rede e link são obrigatórios.' });
        }

        const novaRede = await criarRedeSocialService(barbeariaId, rede, link);

        return res.status(201).json({
            message: 'Rede social criada com sucesso!',
            redeSocial: novaRede,
        });
    } catch (error: any) {
        if (error.message.includes('já está cadastrada')) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Erro ao criar rede social:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const editarRedeSocialController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId, redeId } = req.params;
        const { link } = req.body;

        if (!link || typeof link !== 'string') {
            return res.status(400).json({ error: 'O link é obrigatório.' });
        }

        const redeAtualizada = await editarRedeSocialService(barbeariaId, redeId, link);

        return res.status(200).json({
            message: 'Link da rede social atualizado com sucesso!',
            redeSocial: redeAtualizada,
        });
    } catch (error: any) {
        if (
            error.message === 'Rede social não encontrada para esta barbearia.' ||
            error.message === 'Nenhuma alteração detectada. O link é igual ao atual.'
        ) {
            return res.status(400).json({ error: error.message });
        }

        console.error('Erro ao editar link da rede social:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const deletarRedeSocialController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId, redeId } = req.params;

        await deletarRedeSocialService(barbeariaId, redeId);

        return res.status(200).json({ message: 'Rede social deletada com sucesso.' });
    } catch (error: any) {
        if (error.message === 'Rede social não encontrada para esta barbearia.') {
            return res.status(404).json({ error: error.message });
        }

        console.error('Erro ao deletar rede social:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const getFormasPagamentoController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        const formasPagamento = await getFormasPagamentoService(barbeariaId);

        return res.status(200).json(formasPagamento);
    } catch (error) {
        console.error('Erro ao buscar formas de pagamento da barbearia:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};


export const createFormaPagamentoController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;
        const { tipo } = req.body;

        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        if (!tipo || typeof tipo !== 'string' || tipo.trim() === '') {
            return res.status(400).json({ error: 'O tipo da forma de pagamento é obrigatório e deve ser uma string válida.' });
        }

        const novaForma = await createFormaPagamentoService(barbeariaId, tipo.trim());

        return res.status(201).json({
            message: 'Forma de pagamento criada com sucesso!',
            formaPagamento: novaForma,
        });
    } catch (error: any) {
        console.error('Erro ao criar forma de pagamento:', error);

        if (error.code === 'P2002') { // Erro de constraint unique no Prisma
            return res.status(400).json({ error: 'Essa forma de pagamento já está cadastrada para a barbearia.' });
        }

        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const deleteFormaPagamentoController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId, formaPagamentoId } = req.params;

        if (!barbeariaId || !formaPagamentoId) {
            return res.status(400).json({ error: 'ID da barbearia e da forma de pagamento são obrigatórios.' });
        }

        await deleteFormaPagamentoService(barbeariaId, formaPagamentoId);

        return res.status(200).json({ message: 'Forma de pagamento deletada com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao deletar forma de pagamento:', error);

        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: 'Forma de pagamento não encontrada para esta barbearia.' });
        }

        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const getHorariosFuncionamentoController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        const horarios = await getHorariosFuncionamentoService(barbeariaId);

        return res.status(200).json(horarios);
    } catch (error) {
        console.error('Erro ao buscar horários de funcionamento:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const createHorarioFuncionamentoController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;
        const { diaSemana, horaInicio, horaFim } = req.body;

        if (!barbeariaId || diaSemana === undefined || !horaInicio || !horaFim) {
            return res.status(400).json({ error: 'Campos obrigatórios: barbeariaId, diaSemana, horaInicio, horaFim.' });
        }

        const dia = Number(diaSemana);
        if (isNaN(dia) || dia < 0 || dia > 6) {
            return res.status(400).json({ error: 'O campo "diaSemana" deve ser um número entre 0 e 6.' });
        }

        const novoHorario = await createHorarioFuncionamentoService({
            barbeariaId,
            diaSemana: dia,
            horaInicio,
            horaFim,
        });

        return res.status(201).json({
            message: 'Horário de funcionamento cadastrado com sucesso!',
            horario: novoHorario,
        });
    } catch (error: any) {
        console.error('Erro ao cadastrar horário de funcionamento:', error);
        return res.status(error.statusCode || 500).json({ error: error.message || 'Erro interno do servidor.' });
    }
};

export const updateHorarioFuncionamentoController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId, horarioId } = req.params;
        const { horaInicio, horaFim } = req.body;

        if (!horaInicio || !horaFim) {
            return res.status(400).json({ error: 'Horário de início e fim são obrigatórios.' });
        }

        const horarioAtualizado = await updateHorarioFuncionamentoService({
            barbeariaId,
            horarioId,
            horaInicio,
            horaFim,
        });

        return res.status(200).json({
            message: 'Horário de funcionamento atualizado com sucesso!',
            horario: horarioAtualizado,
        });
    } catch (error: any) {
        console.error('Erro ao atualizar horário de funcionamento:', error);
        return res.status(error.statusCode || 500).json({ error: error.message || 'Erro interno do servidor.' });
    }
};

export const deleteHorarioFuncionamentoController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId, horarioId } = req.params;

        await deleteHorarioFuncionamentoService({ barbeariaId, horarioId });

        return res.status(200).json({ message: 'Horário de funcionamento deletado com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao deletar horário de funcionamento:', error);
        return res.status(error.statusCode || 500).json({ error: error.message || 'Erro interno do servidor.' });
    }
};

export const createAgendamentoVisitanteController = async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const agendamento = await createAgendamentoVisitanteService(data);

        return res.status(201).json(agendamento);
    } catch (error: any) {
        console.error("Erro ao criar agendamento:", error);
        return res.status(error.statusCode || 500).json({ error: error.message || 'Erro interno do servidor.' });
    }
};


export const atualizarUsuarioController = async (req: AuthRequest, res: Response) => {
    try {
        // 1. Extração de dados da requisição
        const { usuarioId } = req.params;
        const { nome, email } = req.body;
        
        // O middleware 'checkRole' já garante que req.user existe
        const usuarioLogado = req.user!; 

        // 2. Validação de entrada (rápida e inicial)
        if (!nome && !email) {
            return res.status(400).json({ error: 'Nenhum dado fornecido para atualização.' });
        }
        if ((nome && typeof nome !== 'string') || (nome && nome.trim() === '')) {
            return res.status(400).json({ error: 'O nome fornecido é inválido.' });
        }
        if ((email && typeof email !== 'string') || (email && email.trim() === '')) {
            return res.status(400).json({ error: 'O email fornecido é inválido.' });
        }

        // 3. Chamada para a camada de serviço com os dados necessários
        const usuarioAtualizado = await atualizarUsuarioService({
            usuarioId,
            dadosUpdate: { nome, email },
            usuarioLogado
        });

        // 4. Resposta de sucesso
        return res.status(200).json({
            message: 'Usuário atualizado com sucesso!',
            usuario: usuarioAtualizado,
        });

    } catch (error: any) {
        // 5. Tratamento de erros específicos vindos do serviço
        // Mapeia mensagens de erro para status HTTP apropriados
        if (error.message === 'Acesso negado. Você só pode alterar o seu próprio perfil.') {
            return res.status(403).json({ error: error.message });
        }
        if (error.message === 'Usuário a ser atualizado não encontrado.') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Este email já está em uso por outra conta.') {
            return res.status(409).json({ error: error.message });
        }
        if (error.message === 'Nenhum dado novo para atualizar.') {
            return res.status(400).json({ error: error.message });
        }

        // 6. Resposta de erro genérico
        console.error('Erro ao atualizar usuário:', error);
        return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
};


export const alterarSenhaController = async (req: AuthRequest, res: Response) => {
    try {
        // 1. Extração de dados da requisição
        const { usuarioId } = req.params;
        const { currentPassword, newPassword } = req.body;
        const usuarioLogado = req.user!;

        // 2. Chamada para a camada de serviço
        await alterarSenhaService({
            usuarioId,
            currentPassword,
            newPassword,
            usuarioLogado,
        });

        // 3. Resposta de sucesso
        return res.status(200).json({ message: 'Senha alterada com sucesso!' });

    } catch (error: any) {
        // 4. Mapeamento de erros específicos para status HTTP
        const errorMessage = error.message;

        if (errorMessage.includes('Acesso negado')) {
            return res.status(403).json({ error: errorMessage });
        }
        if (
            errorMessage.includes('obrigatórias') ||
            errorMessage.includes('mínimo 6 caracteres') ||
            errorMessage.includes('igual à senha atual')
        ) {
            return res.status(400).json({ error: errorMessage });
        }
        if (errorMessage.includes('Usuário não encontrado')) {
            return res.status(404).json({ error: errorMessage });
        }
        if (errorMessage.includes('Senha atual incorreta')) {
            return res.status(401).json({ error: errorMessage });
        }

        // 5. Erro genérico
        console.error('Erro ao alterar senha:', error);
        return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
};

export const listarAgendamentosPendentesController = async (req: AuthRequest, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        // Validação básica pode ficar no controller
        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }
        
        // Opcional: Validação de permissão (um barbeiro só pode ver sua barbearia)
        if (req.user?.role === 'BARBEIRO' && req.user?.barbeariaId !== barbeariaId) {
            return res.status(403).json({ error: 'Acesso negado aos agendamentos desta barbearia.' });
        }

        const agendamentos = await listarAgendamentosPendentesService(barbeariaId);

        return res.status(200).json(agendamentos);

    } catch (error: any) {
        if (error.message.includes('Barbearia não encontrada')) {
            return res.status(404).json({ error: error.message });
        }

        console.error('Erro ao buscar agendamentos pendentes:', error);
        return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
};

export const concluirAgendamentoController = async (req: AuthRequest, res: Response) => {
    try {
        // 1. Extração de dados da requisição (incluindo o mergeParams)
        const { agendamentoId, barbeariaId } = req.params;
        const usuarioLogado = req.user!;

        // 2. Validação de segurança (Barbeiro só pode alterar da sua barbearia)
        if (usuarioLogado.role === 'BARBEIRO' && usuarioLogado.barbeariaId !== barbeariaId) {
            return res.status(403).json({ error: 'Acesso negado para concluir agendamentos desta barbearia.' });
        }

        // 3. Chamada para a camada de serviço
        await concluirAgendamentoService(agendamentoId, barbeariaId);

        // 4. Resposta de sucesso
        return res.status(200).json({ message: 'Agendamento concluído com sucesso!' });

    } catch (error: any) {
        // 5. Tratamento de erro específico vindo do serviço
        if (error.message.includes('Operação falhou')) {
            return res.status(404).json({ error: error.message });
        }
        
        // 6. Erro genérico
        console.error('Erro ao concluir agendamento:', error);
        return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
};

export const cancelarAgendamentoController = async (req: AuthRequest, res: Response) => {
    try {
        // 1. Extração de dados da requisição
        const { agendamentoId, barbeariaId } = req.params;
        const usuarioLogado = req.user!;

        // 2. Validação de segurança (idêntica à anterior)
        if (usuarioLogado.role === 'BARBEIRO' && usuarioLogado.barbeariaId !== barbeariaId) {
            return res.status(403).json({ error: 'Acesso negado para cancelar agendamentos desta barbearia.' });
        }

        // 3. Chamada para o novo serviço de cancelamento
        await cancelarAgendamentoService(agendamentoId, barbeariaId);

        // 4. Resposta de sucesso
        return res.status(200).json({ message: 'Agendamento cancelado com sucesso!' });

    } catch (error: any) {
        // 5. Tratamento de erro (idêntico ao anterior)
        if (error.message.includes('Operação falhou')) {
            return res.status(404).json({ error: error.message });
        }
        
        console.error('Erro ao cancelar agendamento:', error);
        return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
};