import { Request, Response } from 'express';
import { alterarSenhaService, arquivarProdutoService, atualizarUsuarioService, BuscarAvaliacoesPorBarbearia, BuscarBarbeariaPorNome, BuscarBarbeariasAtivas, BuscarBarbeariasPorNome, BuscarBarbeariasProximas, BuscarBarbeirosPorBarbearia, BuscarServicosPorBarbearia, cancelarAgendamentoService, ConcluirAgendamentoInput, concluirAgendamentoService, createAgendamentoVisitanteService, createFormaPagamentoService, createHorarioFuncionamentoService, CriarAvaliacao, criarProdutoService, criarRedeSocialService, criarServicoService, deletarRedeSocialService, deletarServicoService, deleteBarbeiroService, deleteFormaPagamentoService, deleteHorarioFuncionamentoService, deleteProfilePictureService, editarProdutoService, editarRedeSocialService, editarServicoService, getAgendamentosPendentesPorBarbeiroService, getAgendamentosService, getBarbeariaByIdService, getFormasPagamentoService, getHorariosFuncionamentoService, getHorariosPorDiaService, listarAgendamentosPendentesService, listarProdutosParaClienteService, listarProdutosService, listarRedesSociaisService, listarServicosDaBarbeariaService, ObterFormasPagamento, ObterHorariosFuncionamento, ObterRedesSociais, updateBarbeariaService, updateHorarioFuncionamentoService, updateProfilePictureService, updateStatusAgendamentoService } from '../services/barbeariaService';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../libs/prisma';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middlewares/authMiddlewareBarber';
import sharp from 'sharp'; // <-- Importar o sharp
import path from 'path';   // <-- Importar o path
import crypto from 'crypto';
import { del, put } from '@vercel/blob';

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

export const listarProdutosClienteController = async (req: Request, res: Response) => {
    try {
        const { id: barbeariaId } = req.params; // 'id' aqui é o barbeariaId

        // Chama o novo serviço
        const produtos = await listarProdutosParaClienteService(barbeariaId);

        // MELHORIA: Em vez de retornar 404, é uma prática comum para APIs
        // retornar um array vazio com status 200. Isso simplifica o
        // tratamento de dados no frontend.
        return res.status(200).json(produtos);

    } catch (error) {
        console.error('Erro ao buscar produtos para o cliente:', error);
        return res.status(500).json({ error: 'Erro interno ao buscar produtos.' });
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
            comentario: avaliacao.comentario,
            fotoPerfil: avaliacao.usuario.fotoPerfil
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
                        stripeCurrentPeriodEnd: true,// Se precisar de mais dados da barbearia no futuro, adicione aqui
                        fotoPerfil: true,
                        endereco: true,
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
        // Extrai os filtros da query string da URL
        const { data, barbeiroId, status } = req.query;

        const agendamentos = await getAgendamentosService({
            barbeariaId,
            data: data as string | undefined,
            barbeiroId: barbeiroId as string | undefined,
            status: status as string | undefined,
        });

        return res.json(agendamentos);
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
};

export const getAgendamentosPorBarbeiroController = async (req: AuthRequest, res: Response) => {
    try {
        const { barbeiroId } = req.params;
        const usuarioLogado = req.user!;
        
        // Extrai filtros de data e status da query string
        const { data, status } = req.query;

        // --- A sua lógica de permissão aqui é excelente e será mantida! ---
        if (usuarioLogado.role === 'BARBEIRO') {
            const perfilDoUsuarioLogado = await prisma.barbeiro.findUnique({
                where: { usuarioSistemaId: usuarioLogado.id },
                select: { id: true }
            });
            if (perfilDoUsuarioLogado?.id !== barbeiroId) {
                return res.status(403).json({ error: 'Acesso proibido. Você só pode ver seus próprios agendamentos.' });
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

        // --- MUDANÇA PRINCIPAL ---
        // Se passou nas verificações, chama o serviço genérico passando os filtros.
        const agendamentos = await getAgendamentosService({
            barbeariaId: usuarioLogado.barbeariaId, // O ID da barbearia vem do usuário logado
            barbeiroId: barbeiroId,                 // Filtra pelo barbeiro específico da URL
            data: data as string | undefined,       // Filtra por data, se fornecido
            status: status as string | undefined,   // Filtra por status, se fornecido
        });

        return res.json(agendamentos);

    } catch (error) {
        console.error('Erro ao buscar agendamentos do barbeiro:', error);
        return res.status(500).json({ error: 'Erro interno ao buscar agendamentos.' });
    }
};


export const getAgendamentosPendentesPorBarbeiroController = async (req: AuthRequest, res: Response) => {
    const { barbeiroId } = req.params;
    const usuarioLogado = req.user!;

    try {
        // --- Sua lógica de permissão (mantida, pois está correta) ---
        if (usuarioLogado.role === 'BARBEIRO') {
            const perfilDoUsuarioLogado = await prisma.barbeiro.findUnique({ where: { usuarioSistemaId: usuarioLogado.id } });
            if (perfilDoUsuarioLogado?.id !== barbeiroId) {
                return res.status(403).json({ error: 'Acesso proibido. Você só pode ver seus próprios agendamentos pendentes.' });
            }
        } else if (usuarioLogado.role === 'ADMIN') {
            const barbeiroConsultado = await prisma.barbeiro.findUnique({ where: { id: barbeiroId } });
            if (barbeiroConsultado?.barbeariaId !== usuarioLogado.barbeariaId) {
                return res.status(403).json({ error: 'Acesso proibido. Este barbeiro não pertence à sua barbearia.' });
            }
        }
        
        // --- Lógica de busca agora está no service ---
        const agendamentosPendentes = await getAgendamentosPendentesPorBarbeiroService(barbeiroId);

        return res.status(200).json(agendamentosPendentes);

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
    const { barbeariaId } = req.user!;

    // Os dados de texto agora vêm do form-data
    const { nome, email, senha, telefone } = req.body;
    
    // Variável para guardar a URL da imagem do Vercel Blob
    let fotoPerfilUrl: string | undefined = undefined;

    if (!nome || !email || !senha || !telefone) {
        return res.status(400).json({ error: 'Nome, email, senha e telefone são obrigatórios.' });
    }

    try {
        // --- LÓGICA DE UPLOAD DA IMAGEM ---
        if (req.file) {
            const fileHash = crypto.randomBytes(16).toString('hex');
            const fileName = `${fileHash}.webp`;

            // Redimensiona para um tamanho ideal para perfil (ex: 200x200)
            const processedImageBuffer = await sharp(req.file.buffer)
                .resize({ width: 200, height: 200, fit: 'cover' })
                .toFormat('webp', { quality: 80 })
                .toBuffer();

            const blob = await put(fileName, processedImageBuffer, {
                access: 'public',
                contentType: 'image/webp',
            });
            
            // Guarda a URL completa retornada pelo Blob
            fotoPerfilUrl = blob.url;
        }
        // --- FIM DA LÓGICA DE UPLOAD ---

        const emailExistente = await prisma.usuarioSistema.findUnique({ where: { email } });
        if (emailExistente) {
            return res.status(409).json({ error: 'Este e-mail já está em uso no sistema.' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const novoBarbeiroCompleto = await prisma.$transaction(async (tx) => {
            const novoUsuario = await tx.usuarioSistema.create({
                data: {
                    nome,
                    email,
                    senha: senhaHash,
                    fotoPerfil: fotoPerfilUrl, // <-- USA A URL DO BLOB
                    role: Role.BARBEIRO,
                    barbeariaId: barbeariaId,
                },
            });

            const novoPerfilBarbeiro = await tx.barbeiro.create({
                data: {
                    nome,
                    telefone,
                    fotoPerfil: fotoPerfilUrl, // <-- USA A URL DO BLOB
                    barbearia: { connect: { id: barbeariaId } },
                    usuarioSistema: { connect: { id: novoUsuario.id } }
                }
            });

            return { usuario: novoUsuario, perfil: novoPerfilBarbeiro };
        });

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
    const { barbeiroId } = req.params;
    const usuarioLogado = req.user!;
    const { nome, telefone, email } = req.body;
    let fotoPerfilUrl: string | undefined = undefined;

    try {
        // --- 1. PROCESSAMENTO DA NOVA IMAGEM (SE ENVIADA) ---
        if (req.file) {
            const fileHash = crypto.randomBytes(16).toString('hex');
            const fileName = `${fileHash}.webp`;

            const processedImageBuffer = await sharp(req.file.buffer)
                .resize({ width: 200, height: 200, fit: 'cover' })
                .toFormat('webp', { quality: 80 })
                .toBuffer();
            
            const blob = await put(fileName, processedImageBuffer, {
                access: 'public',
                contentType: 'image/webp',
            });
            
            fotoPerfilUrl = blob.url; // Guarda a URL da NOVA imagem
        }

        // --- 2. BUSCAR DADOS ATUAIS E VERIFICAR PERMISSÕES ---
        const barbeiroParaAtualizar = await prisma.barbeiro.findUnique({
            where: { id: barbeiroId },
        });

        if (!barbeiroParaAtualizar) {
            return res.status(404).json({ error: "Perfil de barbeiro não encontrado." });
        }

        // Sua lógica de permissão (ótima!) continua aqui
        if (usuarioLogado.role === 'BARBEIRO' && usuarioLogado.id !== barbeiroParaAtualizar.usuarioSistemaId) {
            return res.status(403).json({ error: "Acesso proibido. Você só pode editar seu próprio perfil." });
        }
        if (usuarioLogado.role === 'ADMIN' && usuarioLogado.barbeariaId !== barbeiroParaAtualizar.barbeariaId) {
            return res.status(403).json({ error: "Acesso proibido. Este barbeiro não pertence à sua barbearia." });
        }

        // --- 3. DELETAR IMAGEM ANTIGA DO BLOB (SE UMA NOVA FOI ENVIADA) ---
        if (fotoPerfilUrl && barbeiroParaAtualizar.fotoPerfil) {
            try {
                await del(barbeiroParaAtualizar.fotoPerfil);
            } catch (error) {
                console.error(`Falha ao deletar o blob antigo ${barbeiroParaAtualizar.fotoPerfil}:`, error);
            }
        }

        // --- 4. PREPARAR DADOS PARA ATUALIZAÇÃO (SUPORTE A MUDANÇAS PARCIAIS) ---
        const dataUsuario: any = {};
        const dataBarbeiro: any = {};

        if (nome) { dataUsuario.nome = nome; dataBarbeiro.nome = nome; }
        if (email) { dataUsuario.email = email; }
        if (telefone) { dataBarbeiro.telefone = telefone; }
        if (fotoPerfilUrl) { dataUsuario.fotoPerfil = fotoPerfilUrl; dataBarbeiro.fotoPerfil = fotoPerfilUrl; }
        
        // Verifica se há algo para atualizar
        if (Object.keys(dataUsuario).length === 0 && Object.keys(dataBarbeiro).length === 0) {
            return res.status(400).json({ error: "Nenhuma alteração foi fornecida." });
        }
        
        // --- 5. VERIFICAR CONFLITO DE E-MAIL (SE O E-MAIL FOI ALTERADO) ---
        if (email) {
            const emailEmUso = await prisma.usuarioSistema.findFirst({
                where: { email: email, id: { not: barbeiroParaAtualizar.usuarioSistemaId } }
            });
            if (emailEmUso) {
                return res.status(409).json({ error: "Este e-mail já está em uso por outro utilizador." });
            }
        }

        // --- 6. EXECUTAR ATUALIZAÇÃO EM TRANSAÇÃO ---
        const [usuarioAtualizado, perfilAtualizado] = await prisma.$transaction([
            prisma.usuarioSistema.update({
                where: { id: barbeiroParaAtualizar.usuarioSistemaId },
                data: dataUsuario
            }),
            prisma.barbeiro.update({
                where: { id: barbeiroId },
                data: dataBarbeiro
            })
        ]);
        
        const { senha, ...usuarioSemSenha } = usuarioAtualizado;

        return res.status(200).json({
            message: "Barbeiro atualizado com sucesso!",
            barbeiro: { ...perfilAtualizado, usuario: usuarioSemSenha }
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
        let imagemUrl: string | undefined = undefined;

        if (req.file) {
            // 👇 LÓGICA DE UPLOAD PARA O VERCEL BLOB 👇

            // 2. Gera um nome de arquivo único para o Blob
            const fileHash = crypto.randomBytes(16).toString('hex');
            const fileName = `${fileHash}.webp`;

            // 3. Processa a imagem com o Sharp, mas gera um buffer em vez de um arquivo
            const processedImageBuffer = await sharp(req.file.buffer)
                .resize({ 
                    width: 500,
                    height: 500,
                    fit: 'cover',
                })
                .toFormat('webp', { quality: 80 })
                .toBuffer(); // Gera o resultado em memória

            // 4. Faz o upload do buffer processado para o Vercel Blob
            const blob = await put(fileName, processedImageBuffer, {
                access: 'public', // Torna o arquivo publicamente acessível
                contentType: 'image/webp', // Informa o tipo do arquivo
            });

            // 5. A URL a ser salva no banco agora é a URL completa retornada pelo Vercel Blob
            imagemUrl = blob.url;
        }

        const novoServico = await criarServicoService({ barbeariaId, nome, duracao, preco, imagemUrl });

        return res.status(201).json({
            message: 'Serviço criado com sucesso!',
            servico: novoServico,
        });
    } catch (error: any) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. O limite é de 5MB.' });
        }
        console.error('Erro ao criar serviço:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
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

        if (req.file) {
            // Lógica de processamento e upload para o Vercel Blob (idêntica à da criação)
            const fileHash = crypto.randomBytes(16).toString('hex');
            const fileName = `${fileHash}.webp`;

            const processedImageBuffer = await sharp(req.file.buffer)
                .resize({ width: 500, height: 500, fit: 'cover' })
                .toFormat('webp', { quality: 80 })
                .toBuffer();
            
            const blob = await put(fileName, processedImageBuffer, {
                access: 'public',
                contentType: 'image/webp',
            });
            
            imagemUrl = blob.url; // A URL da NOVA imagem
        }

        const servicoAtualizado = await editarServicoService({
            barbeariaId,
            servicoId,
            nome,
            duracao,
            preco,
            imagemUrl // Passa a URL da nova imagem (ou undefined se nenhuma foi enviada)
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
        return res.status(500).json({ error: 'Erro interno do servidor.' });
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

export const listarProdutosController = async (req: AuthRequest, res: Response) => {
    try {
        // Mais seguro: usar o barbeariaId do token
        const barbeariaId = req.user!.barbeariaId;

        // Extrai os parâmetros de paginação e filtro da query string da URL
        const { 
            page = '1', 
            limit = '10', 
            q, // 'q' de query (para busca)
            status // 'ATIVO' ou 'ARQUIVADO'
        } = req.query;

        const pageNumber = parseInt(page as string, 10);
        const pageSize = parseInt(limit as string, 10);

        // Valida o status para garantir que apenas valores válidos sejam passados
        const statusEnum = status === 'ARQUIVADO' ? 'ARQUIVADO' : 'ATIVO';

        const resultado = await listarProdutosService({
            barbeariaId,
            page: pageNumber,
            pageSize: pageSize,
            searchQuery: q as string,
            status: statusEnum,
        });

        return res.status(200).json(resultado);

    } catch (error) {
        console.error('Erro ao buscar produtos da barbearia:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const criarProdutoController = async (req: AuthRequest, res: Response) => {
    try {
        const barbeariaId = req.user!.barbeariaId;
        const responsavelId = req.user!.id; // NOVO: Captura o ID do usuário logado

        // ALTERADO: Coletando os novos campos do body
        const { nome, descricao, tipo, precoVenda, custo, quantidade, alertaEstoqueBaixo, dataValidade } = req.body;
        
        let imagemUrlFinal: string | undefined = undefined;

        // ALTERADO: Validações para os novos campos obrigatórios
        if (!nome || !tipo || precoVenda === undefined || custo === undefined || quantidade === undefined) {
            return res.status(400).json({ 
                error: 'Campos obrigatórios ausentes. É necessário fornecer: nome, tipo, precoVenda, custo e quantidade.' 
            });
        }

        // --- LÓGICA DE UPLOAD DA IMAGEM (permanece a mesma) ---
        if (req.file) {
            const fileHash = crypto.randomBytes(16).toString('hex');
            const fileName = `${fileHash}.webp`;

            const processedImageBuffer = await sharp(req.file.buffer)
                .resize({ width: 500, height: 500, fit: 'cover' })
                .toFormat('webp', { quality: 80 })
                .toBuffer();

            const blob = await put(fileName, processedImageBuffer, {
                access: 'public',
                contentType: 'image/webp',
            });
            
            imagemUrlFinal = blob.url;
        }
        // --- FIM DA LÓGICA DE UPLOAD ---

        // ALTERADO: Chamada ao serviço com os novos dados
        const novoProduto = await criarProdutoService({
            barbeariaId,
            responsavelId, // NOVO
            nome,
            descricao,
            tipo,
            // IMPORTANTE: Garantir que os valores numéricos sejam de fato números
            precoVenda: Number(precoVenda),
            custo: Number(custo),
            quantidade: Number(quantidade),
            alertaEstoqueBaixo: alertaEstoqueBaixo ? Number(alertaEstoqueBaixo) : undefined,
            dataValidade: dataValidade, // O serviço já trata se é nulo
            imagemUrl: imagemUrlFinal,
        });

        return res.status(201).json({
            message: 'Produto criado com sucesso e estoque inicializado!',
            produto: novoProduto,
        });
    } catch (error: any) {
        console.error('Erro ao criar produto:', error);
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. O limite é de 5MB.' });
        }
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const editarProdutoController = async (req: AuthRequest, res: Response) => {
    try {
        const { produtoId } = req.params;
        const barbeariaId = req.user!.barbeariaId;
        const responsavelId = req.user!.id; // NOVO: Captura o ID do usuário logado

        // ALTERADO: Coletando todos os campos possíveis do body
        const { 
            nome, descricao, tipo, precoVenda, custo, 
            alertaEstoqueBaixo, dataValidade,
            ajusteEstoque, motivoAjuste 
        } = req.body;

        let imagemUrlFinal: string | undefined = undefined;

        // --- LÓGICA DE UPLOAD DA NOVA IMAGEM (permanece a mesma) ---
        if (req.file) {
            // ... seu código de upload ...
            const fileHash = crypto.randomBytes(16).toString('hex');
            const fileName = `${fileHash}.webp`;

            const processedImageBuffer = await sharp(req.file.buffer)
                .resize({ width: 500, height: 500, fit: 'cover' })
                .toFormat('webp', { quality: 80 })
                .toBuffer();

            const blob = await put(fileName, processedImageBuffer, {
                access: 'public',
                contentType: 'image/webp',
            });
            
            imagemUrlFinal = blob.url;
        }
        // --- FIM DA LÓGICA DE UPLOAD ---

        // ALTERADO: Chamada ao serviço com o novo DTO completo
        const produtoAtualizado = await editarProdutoService({
            produtoId,
            barbeariaId,
            responsavelId, // NOVO
            nome,
            descricao,
            tipo,
            // IMPORTANTE: Converter para número apenas se o valor for fornecido
            precoVenda: precoVenda !== undefined ? Number(precoVenda) : undefined,
            custo: custo !== undefined ? Number(custo) : undefined,
            alertaEstoqueBaixo: alertaEstoqueBaixo !== undefined ? Number(alertaEstoqueBaixo) : undefined,
            dataValidade: dataValidade,
            ajusteEstoque: ajusteEstoque !== undefined ? Number(ajusteEstoque) : undefined,
            motivoAjuste: motivoAjuste,
            imagemUrl: imagemUrlFinal,
        });

        return res.status(200).json({
            message: 'Produto atualizado com sucesso!',
            produto: produtoAtualizado,
        });
    } catch (error: any) {
        console.error('Erro ao editar produto:', error);
        // Tratamento de erros específicos do serviço
        if (error.message.includes('não encontrado') || error.message.includes('Nenhuma alteração') || error.message.includes('obrigatório') || error.message.includes('negativo')) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const arquivarProdutoController = async (req: AuthRequest, res: Response) => {
    try {
        const { produtoId } = req.params;
        // Mais seguro: usar o barbeariaId do token do usuário autenticado
        const barbeariaId = req.user!.barbeariaId;

        await arquivarProdutoService({ barbeariaId, produtoId });

        return res.status(200).json({ message: 'Produto arquivado com sucesso!' });
        
    } catch (error: any) {
        console.error('Erro ao arquivar produto:', error);
        if (error.message.includes('não encontrado') || error.message.includes('já está arquivado')) {
            return res.status(404).json({ error: error.message });
        }
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
        const { agendamentoId, barbeariaId } = req.params;
        const usuarioLogado = req.user!;

        // A lógica de permissão continua a mesma
        if (usuarioLogado.role === 'BARBEIRO' && usuarioLogado.barbeariaId !== barbeariaId) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        
        // Monta o DTO com o corpo da requisição e o ID do responsável
        const inputData: ConcluirAgendamentoInput = {
            ...req.body,
            responsavelId: usuarioLogado.id,
        };

        // Chama o serviço com os novos dados
        await concluirAgendamentoService(agendamentoId, barbeariaId, inputData);

        return res.status(200).json({ message: 'Agendamento concluído e comanda fechada com sucesso!' });

    } catch (error: any) {
        if (error.message.includes('Operação falhou')) {
            return res.status(404).json({ error: error.message });
        }
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

export const updateProfilePictureController = async (req: AuthRequest, res: Response) => {
    try {
        const usuarioLogado = req.user!; // ID e role do usuário logado vêm do token

        // 1. Validar se um arquivo foi enviado
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo de imagem foi enviado.' });
        }

        // 2. Processar a imagem com Sharp e fazer upload para o Vercel Blob
        const fileHash = crypto.randomBytes(16).toString('hex');
        const fileName = `${fileHash}.webp`;

        const processedImageBuffer = await sharp(req.file.buffer)
            .resize({ width: 200, height: 200, fit: 'cover' })
            .toFormat('webp', { quality: 80 })
            .toBuffer();
        
        const blob = await put(fileName, processedImageBuffer, {
            access: 'public',
            contentType: 'image/webp',
        });
        
        const newImageUrl = blob.url;

        // 3. Chamar o serviço para atualizar o banco de dados
        await updateProfilePictureService({ 
            userId: usuarioLogado.id, 
            userRole: usuarioLogado.role as Role, 
            newImageUrl 
        });

        return res.status(200).json({ 
            message: "Foto de perfil atualizada com sucesso!",
            fotoPerfilUrl: newImageUrl
        });

    } catch (error: any) {
        console.error("Erro ao atualizar foto de perfil:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const deleteProfilePictureController = async (req: AuthRequest, res: Response) => {
    try {
        const usuarioLogado = req.user!; // ID e role do usuário logado vêm do token

        // Chama o serviço para executar a lógica de exclusão
        await deleteProfilePictureService({ 
            userId: usuarioLogado.id, 
            userRole: usuarioLogado.role as Role 
        });

        return res.status(200).json({ message: "Foto de perfil removida com sucesso!" });

    } catch (error: any) {
        console.error("Erro ao remover foto de perfil:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const getBarbeariaByIdController = async (req: Request, res: Response) => {
    try {
        // 1. O ID da barbearia agora é pego da URL.
        const { barbeariaId } = req.params;

        // 2. Chama o mesmo serviço reutilizado para buscar os dados
        const barbearia = await getBarbeariaByIdService(barbeariaId);

        return res.status(200).json(barbearia);

    } catch (error: any) {
        console.error("Erro ao buscar dados da barbearia por ID:", error);
        return res.status(error.status || 500).json({ error: error.message || "Erro interno do servidor." });
    }
};

export const updateMinhaBarbeariaController = async (req: AuthRequest, res: Response) => {
    try {
        const barbeariaId = req.user!.barbeariaId;
        const dados = req.body;
        let fotoPerfilUrl: string | undefined = undefined;

        // ✅ NOVA VALIDAÇÃO DE ENTRADA
        // Verifica se os campos enviados, caso existam, não estão vazios.
        if (dados.nome !== undefined && !dados.nome.trim()) {
            return res.status(400).json({ error: 'O campo "nome" não pode ser vazio.' });
        }
        if (dados.celular !== undefined && !dados.celular.trim()) {
            return res.status(400).json({ error: 'O campo "celular" não pode ser vazio.' });
        }
        if (dados.endereco !== undefined && !dados.endereco.trim()) {
            return res.status(400).json({ error: 'O campo "endereço" não pode ser vazio.' });
        }
        // Fim da validação

        if (req.file) {
            // ... (lógica de upload para o Vercel Blob, que já está correta)
            const fileHash = crypto.randomBytes(16).toString('hex');
            const fileName = `${fileHash}.webp`;
            const processedImageBuffer = await sharp(req.file.buffer).resize({ width: 400, height: 400, fit: 'cover' }).toFormat('webp', { quality: 80 }).toBuffer();
            const blob = await put(fileName, processedImageBuffer, { access: 'public', contentType: 'image/webp' });
            fotoPerfilUrl = blob.url;
        }

        const barbeariaAtualizada = await updateBarbeariaService({
            barbeariaId,
            ...dados,
            fotoPerfil: fotoPerfilUrl,
        });

        return res.status(200).json({
            message: 'Barbearia atualizada com sucesso!',
            barbearia: barbeariaAtualizada,
        });

    } catch (error: any) {
        console.error('Erro ao editar barbearia:', error);
        if (error.status) { // Verifica se nosso erro customizado tem um status
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};