import { Request, Response, Router } from 'express';
import usuarioRoutes from './usuarioRoutes';
import barbeariaRoutes from './barbeariaRoutes';
import barbeiroRoutes from './barbeiroRoutes';
import agendamentoRoutes from './agendamentoRoutes';

import { prisma } from '../libs/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { autenticarToken } from '../middlewares/authMiddleware';

export const mainRouter = Router();

mainRouter.use('/usuario', usuarioRoutes);
mainRouter.use('/barbearia', barbeariaRoutes);
mainRouter.use('/barbeiro', barbeiroRoutes);
mainRouter.use('/agendamentos', agendamentoRoutes);

mainRouter.post('/barbearia/registrar', async (req: Request, res: Response) => {
    try {
        const { nome, email, senha, endereco, celular, telefone, latitude, longitude, fotoPerfil, descricao } = req.body;

        // 1️⃣ Validação de Campos
        if (!nome || !email || !senha || !endereco || !celular || !latitude || !longitude) {
            return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
        }

        // 2️⃣ Verifica se o e-mail ou nome já estão cadastrados
        const barbeariaExistente = await prisma.barbearia.findFirst({
            where: { OR: [{ email }, { nome }] },
        });

        if (barbeariaExistente) {
            return res.status(400).json({ error: 'Nome ou e-mail já cadastrados.' });
        }

        // 3️⃣ Criptografar a senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // 4️⃣ Criar a barbearia no banco de dados
        const novaBarbearia = await prisma.barbearia.create({
            data: {
                nome,
                email,
                senha: senhaHash,
                endereco,
                celular,
                telefone,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                fotoPerfil,
                descricao,
            },
        });

        // 5️⃣ Retornar sucesso
        return res.status(201).json({ message: 'Barbearia cadastrada com sucesso!', barbearia: novaBarbearia });
    } catch (error) {
        console.error('Erro ao registrar barbearia:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

const SECRET_KEY = process.env.JWT_SECRET || 'seuSegredoSuperSeguro';

mainRouter.post('/barbearia/login', async (req: Request, res: Response) => {
    try {
        const { email, senha } = req.body;

        // 1️⃣ Validação de Campos
        if (!email || !senha) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        }

        // 2️⃣ Verifica se a barbearia existe
        const barbearia = await prisma.barbearia.findUnique({ where: { email } });

        if (!barbearia) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }

        // 3️⃣ Compara a senha enviada com a senha hash no banco
        const senhaValida = await bcrypt.compare(senha, barbearia.senha);

        if (!senhaValida) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }

        // 4️⃣ Gera o token JWT
        const token = jwt.sign(
            { id: barbearia.id, email: barbearia.email },
            SECRET_KEY,
            { expiresIn: '2h' } // Token expira em 2 horas
        );

        // 5️⃣ Retorna o token e os dados da barbearia (exceto a senha)
        return res.status(200).json({
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
        });

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// Rota para buscar todos os agendamentos da barbearia logada
mainRouter.get("/barbearia/agendamentos/:barbeariaId", async (req, res) => {
    try {
        const { barbeariaId } = req.params; // Obtém o ID da barbearia autenticada

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

        return res.json(agendamentos);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao buscar agendamentos" });
    }
});

mainRouter.put("/barbearia/agendamento/status/:agendamentoId", async (req, res) => {
    try {
        const { agendamentoId } = req.params; // Obtém o ID do agendamento
        const { status } = req.body; // Obtém o novo status enviado no corpo da requisição

        // Verifica se o status enviado é válido
        if (!["Confirmado", "Feito", "Cancelado"].includes(status)) {
            return res.status(400).json({ error: "Status inválido. O status deve ser 'Confirmado', 'Feito' ou 'Cancelado'." });
        }

        // Atualiza o status do agendamento no banco de dados
        const updatedAgendamento = await prisma.agendamento.update({
            where: { id: agendamentoId },
            data: { status },
        });

        return res.json(updatedAgendamento); // Retorna o agendamento atualizado
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao atualizar o status do agendamento" });
    }
});

mainRouter.post('/barbearia/barbeiro/register', async (req: Request, res: Response) => {
    try {
        const { nome, email, senha, telefone, fotoPerfil, barbeariaId } = req.body;

        // 1️⃣ Validação de Campos
        if (!nome || !email || !senha || !telefone || !barbeariaId) {
            return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
        }

        // 2️⃣ Verifica se o e-mail já está cadastrado
        const barbeiroExistente = await prisma.barbeiro.findUnique({
            where: { email },
        });

        if (barbeiroExistente) {
            return res.status(400).json({ error: 'E-mail já cadastrado.' });
        }

        // 3️⃣ Verifica se a barbearia existe
        const barbeariaExistente = await prisma.barbearia.findUnique({
            where: { id: barbeariaId },
        });

        if (!barbeariaExistente) {
            return res.status(404).json({ error: 'Barbearia não encontrada.' });
        }

        // 4️⃣ Criptografar a senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // 5️⃣ Criar o barbeiro no banco de dados
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

        // 6️⃣ Retornar sucesso
        return res.status(201).json({ message: 'Barbeiro cadastrado com sucesso!', barbeiro: novoBarbeiro });
    } catch (error) {
        console.error('Erro ao registrar barbeiro:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.delete('/barbearia/barbeiro/:barbeiroId', async (req: Request, res: Response) => {
    try {
        const { barbeiroId } = req.params;

        // 🔹 Verifica se o barbeiro possui agendamentos pendentes
        const agendamentosPendentes = await prisma.agendamento.findFirst({
            where: { barbeiroId, status: "Confirmado" },
        });

        if (agendamentosPendentes) {
            return res.status(400).json({ error: "Este barbeiro possui agendamentos confirmados e não pode ser excluído." });
        }

        // 🔹 Verifica se o barbeiro existe
        const barbeiroExiste = await prisma.barbeiro.findUnique({
            where: { id: barbeiroId },
        });

        if (!barbeiroExiste) {
            return res.status(404).json({ error: "Barbeiro não encontrado." });
        }

        // 🔹 Verifica se o barbeiro tem horários cadastrados antes de tentar deletá-los
        const horariosExistem = await prisma.horarioTrabalho.findFirst({
            where: { barbeiroId },
        });

        if (horariosExistem) {
            await prisma.horarioTrabalho.deleteMany({
                where: { barbeiroId },
            });
        }

        // 🔹 Deleta o barbeiro
        await prisma.barbeiro.delete({
            where: { id: barbeiroId },
        });

        return res.status(200).json({ message: "Barbeiro deletado com sucesso!" });
    } catch (error) {
        console.error("Erro ao deletar barbeiro:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});

mainRouter.put("/barbearia/barbeiro/:barbeiroId", async (req: Request, res: Response) => {
    try {
        const { barbeiroId } = req.params;
        const { nome, telefone, email } = req.body;

        // 1️⃣ Validação de Campos
        if (!nome || !telefone || !email) {
            return res.status(400).json({ error: "Todos os campos (nome, telefone, email) devem ser preenchidos." });
        }

        // 2️⃣ Verificar se o barbeiro existe
        const barbeiroExistente = await prisma.barbeiro.findUnique({
            where: { id: barbeiroId },
        });

        if (!barbeiroExistente) {
            return res.status(404).json({ error: "Barbeiro não encontrado." });
        }

        // 3️⃣ Verificar se os dados enviados são iguais aos já cadastrados
        if (
            nome === barbeiroExistente.nome &&
            telefone === barbeiroExistente.telefone &&
            email === barbeiroExistente.email
        ) {
            return res.status(400).json({ error: "Altere pelo menos um campo para continuar." });
        }

        // 4️⃣ Verificar se o novo email já está cadastrado por outro barbeiro
        const emailEmUso = await prisma.barbeiro.findFirst({
            where: {
                email,
                id: { not: barbeiroId }, // Exclui o próprio barbeiro da busca
            },
        });

        if (emailEmUso) {
            return res.status(400).json({ error: "Este e-mail já está em uso por outro barbeiro." });
        }

        // 5️⃣ Atualizar os dados do barbeiro
        const barbeiroAtualizado = await prisma.barbeiro.update({
            where: { id: barbeiroId },
            data: { nome, telefone, email },
        });

        return res.status(200).json({ message: "Barbeiro atualizado com sucesso!", barbeiro: barbeiroAtualizado });
    } catch (error) {
        console.error("Erro ao atualizar barbeiro:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});

mainRouter.get("/barbearia/barbeiro/:barbeiroId/horarios/:diaSemana", async (req: Request, res: Response) => {
    try {
        const { barbeiroId, diaSemana } = req.params;

        // Validação básica
        const dia = parseInt(diaSemana);
        if (isNaN(dia) || dia < 0 || dia > 6) {
            return res.status(400).json({ error: "O dia da semana deve ser um número entre 0 (domingo) e 6 (sábado)." });
        }

        // Verifica se o barbeiro existe
        const barbeiro = await prisma.barbeiro.findUnique({
            where: { id: barbeiroId }
        });

        if (!barbeiro) {
            return res.status(404).json({ error: "Barbeiro não encontrado." });
        }

        // Busca os horários do barbeiro para o dia da semana específico
        const horarios = await prisma.horarioTrabalho.findMany({
            where: {
                barbeiroId,
                diaSemana: dia
            },
            orderBy: {
                hora: "asc"
            }
        });

        return res.status(200).json({ horarios });
    } catch (error) {
        console.error("Erro ao buscar horários do barbeiro:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});

mainRouter.post('/barbeiro/:barbeiroId/horarios', async (req: Request, res: Response) => {
    try {
        const { barbeiroId } = req.params;
        const { diaSemana, hora } = req.body;

        // 1️⃣ Verificação dos campos obrigatórios
        if (diaSemana === undefined || hora === undefined) {
            return res.status(400).json({ error: 'O dia da semana e a hora são obrigatórios.' });
        }

        // 2️⃣ Validação do dia da semana (de 0 a 6)
        const diaValido = Number(diaSemana);
        if (isNaN(diaValido) || diaValido < 0 || diaValido > 6) {
            return res.status(400).json({ error: 'O dia da semana deve estar entre 0 (domingo) e 6 (sábado).' });
        }

        // 3️⃣ Verifica se o horário já existe para aquele barbeiro e dia
        const horarioExistente = await prisma.horarioTrabalho.findFirst({
            where: {
                barbeiroId,
                diaSemana: diaValido,
                hora,
            }
        });

        if (horarioExistente) {
            return res.status(400).json({ error: `Horário (${hora}) já está cadastrado!` });
        }

        // 4️⃣ Cria o novo horário
        const novoHorario = await prisma.horarioTrabalho.create({
            data: {
                barbeiroId,
                diaSemana: diaValido,
                hora,
            }
        });

        return res.status(201).json({ message: 'Horário criado com sucesso!', horario: novoHorario });

    } catch (error) {
        console.error('Erro ao criar horário de trabalho:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.delete('/barbeiro/:barbeiroId/horarios', async (req: Request, res: Response) => {
    try {
        const { barbeiroId } = req.params;
        const { horarios } = req.body; // Exemplo: [{ diaSemana: 1, hora: "09:00" }, ...]

        if (!Array.isArray(horarios) || horarios.length === 0) {
            return res.status(400).json({ error: 'Lista de horários a serem deletados é obrigatória.' });
        }

        const horariosInvalidos = horarios.filter(({ diaSemana, hora }) =>
            diaSemana === undefined || hora === undefined || isNaN(Number(diaSemana)) || diaSemana < 0 || diaSemana > 6
        );

        if (horariosInvalidos.length > 0) {
            return res.status(400).json({ error: 'Todos os horários devem ter diaSemana (0-6) e hora válidos.' });
        }

        for (const { diaSemana, hora } of horarios) {
            // 1️⃣ Apagar horário de trabalho
            await prisma.horarioTrabalho.deleteMany({
                where: {
                    barbeiroId,
                    diaSemana: Number(diaSemana),
                    hora,
                },
            });

            // 2️⃣ Cancelar agendamentos relacionados
            const agendamentos = await prisma.agendamento.findMany({
                where: {
                    barbeiroId,
                    hora,
                }
            });

            const agendamentosNoMesmoDiaSemana = agendamentos.filter(agendamento => {
                const data = new Date(agendamento.data);
                return data.getDay() === Number(diaSemana);
            });

            if (agendamentosNoMesmoDiaSemana.length > 0) {
                await Promise.all(
                    agendamentosNoMesmoDiaSemana.map(agendamento =>
                        prisma.agendamento.update({
                            where: { id: agendamento.id },
                            data: { status: 'Cancelado' },
                        })
                    )
                );
            }
        }

        return res.status(200).json({ message: 'Horários deletados e agendamentos (se houver) cancelados com sucesso!' });

    } catch (error) {
        console.error('Erro ao deletar horários e cancelar agendamentos:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.get('/barbearia/:barbeariaId/servicos', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        // Busca os serviços da barbearia específica
        const servicos = await prisma.servico.findMany({
            where: { barbeariaId },
            orderBy: { nome: 'asc' }, // opcional: ordena por nome
        });

        return res.status(200).json(servicos);
    } catch (error) {
        console.error('Erro ao buscar serviços da barbearia:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.post('/barbearia/:barbeariaId/servicos', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;
        const { nome, duracao, preco } = req.body;

        // Verificação de campos obrigatórios
        if (!nome || typeof nome !== 'string') {
            return res.status(400).json({ error: 'Nome do serviço é obrigatório e deve ser uma string.' });
        }

        if (duracao === undefined || isNaN(Number(duracao)) || Number(duracao) <= 0) {
            return res.status(400).json({ error: 'Duração do serviço é obrigatória e deve ser um número positivo.' });
        }

        // Verificação de preço opcional
        let precoFormatado: any = null;
        if (preco !== undefined) {
            const precoNumber = Number(preco);
            if (isNaN(precoNumber) || precoNumber < 0) {
                return res.status(400).json({ error: 'Preço, se fornecido, deve ser um número positivo.' });
            }
            precoFormatado = precoNumber;
        }

        // Criação do serviço
        const novoServico = await prisma.servico.create({
            data: {
                barbeariaId,
                nome,
                duracao: Number(duracao),
                preco: precoFormatado,
            },
        });

        return res.status(201).json({
            message: 'Serviço criado com sucesso!',
            servico: novoServico,
        });
    } catch (error) {
        console.error('Erro ao criar serviço:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.put('/barbearia/:barbeariaId/servicos/:servicoId', async (req: Request, res: Response) => {
    try {
        const { barbeariaId, servicoId } = req.params;
        const { nome, duracao, preco } = req.body;

        // Verificação de campos obrigatórios
        if (!nome || typeof nome !== 'string') {
            return res.status(400).json({ error: 'Nome do serviço é obrigatório e deve ser uma string.' });
        }

        if (duracao === undefined || isNaN(Number(duracao)) || Number(duracao) < 5) {
            return res.status(400).json({ error: 'Duração do serviço é obrigatória e deve ser no mínimo 5 minutos.' });
        }

        let precoFormatado: any = null;
        if (preco !== undefined) {
            const precoNumber = Number(preco);
            if (isNaN(precoNumber) || precoNumber < 0) {
                return res.status(400).json({ error: 'Preço, se fornecido, deve ser um número positivo.' });
            }
            precoFormatado = precoNumber;
        }

        // Verifica se o serviço existe e pertence à barbearia
        const servicoExistente = await prisma.servico.findUnique({
            where: { id: servicoId },
        });

        if (!servicoExistente || servicoExistente.barbeariaId !== barbeariaId) {
            return res.status(404).json({ error: 'Serviço não encontrado para esta barbearia.' });
        }

        // Verifica se houve alguma alteração
        const semAlteracoes =
            servicoExistente.nome === nome &&
            servicoExistente.duracao === Number(duracao) &&
            String(servicoExistente.preco || '') === String(precoFormatado || '');

        if (semAlteracoes) {
            return res.status(400).json({ error: 'Nenhuma alteração foi feita.' });
        }

        // Atualização do serviço
        const servicoAtualizado = await prisma.servico.update({
            where: { id: servicoId },
            data: {
                nome,
                duracao: Number(duracao),
                preco: precoFormatado,
            },
        });

        return res.status(200).json({
            message: 'Serviço atualizado com sucesso!',
            servico: servicoAtualizado,
        });

    } catch (error) {
        console.error('Erro ao editar serviço:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.delete('/barbearia/:barbeariaId/servicos/:servicoId', async (req: Request, res: Response) => {
    try {
        const { barbeariaId, servicoId } = req.params;

        // Verifica se o serviço existe e pertence à barbearia
        const servicoExistente = await prisma.servico.findFirst({
            where: {
                id: servicoId,
                barbeariaId,
            },
        });

        if (!servicoExistente) {
            return res.status(404).json({ error: 'Serviço não encontrado para esta barbearia.' });
        }

        // Deleta o serviço (e os agendamentos vinculados, por causa do onDelete: Cascade)
        await prisma.servico.delete({
            where: {
                id: servicoId,
            },
        });

        return res.status(200).json({ message: 'Serviço deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar serviço:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});
