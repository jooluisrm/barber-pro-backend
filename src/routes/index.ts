import { Request, Response, Router } from 'express';
import usuarioRoutes from './usuarioRoutes';
import barbeariaRoutes from './barbeariaRoutes';
import barbeiroRoutes from './barbeiroRoutes';
import agendamentoRoutes from './agendamentoRoutes';

import { prisma } from '../libs/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { autenticarToken } from '../middlewares/authMiddleware';
import { Prisma } from '@prisma/client';

export const mainRouter = Router();

mainRouter.use('/usuario', usuarioRoutes);
mainRouter.use('/barbearia', barbeariaRoutes);
mainRouter.use('/barbeiro', barbeiroRoutes);
mainRouter.use('/agendamentos', agendamentoRoutes);


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


mainRouter.get('/barbearia/:barbeariaId/produtos', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        // Busca os produtos da barbearia específica
        const produtos = await prisma.produto.findMany({
            where: { barbeariaId },
            orderBy: { nome: 'asc' }, // ordena por nome (opcional)
        });

        return res.status(200).json(produtos);
    } catch (error) {
        console.error('Erro ao buscar produtos da barbearia:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.post('/barbearia/:barbeariaId/produtos', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;
        const { nome, descricao, tipo, preco, imagemUrl } = req.body;

        // Verificação de campos obrigatórios
        if (!nome || typeof nome !== 'string') {
            return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
        }

        if (!tipo || typeof tipo !== 'string') {
            return res.status(400).json({ error: 'Tipo do produto é obrigatório.' });
        }

        if (preco === undefined || isNaN(Number(preco)) || Number(preco) < 0) {
            return res.status(400).json({ error: 'Preço do produto é obrigatório.' });
        }

        // Criação do produto
        const novoProduto = await prisma.produto.create({
            data: {
                barbeariaId,
                nome,
                descricao: descricao || null,
                tipo,
                preco: Number(preco),
                imagemUrl: imagemUrl || null,
                estoque: true, // Define estoque como true por padrão
            },
        });

        return res.status(201).json({
            message: 'Produto criado com sucesso!',
            produto: novoProduto,
        });
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.put('/barbearia/:barbeariaId/produtos/:produtoId', async (req: Request, res: Response) => {
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
            return res.status(400).json({ error: 'Preço do produto é obrigatório.' });
        }

        // Busca o produto atual
        const produtoExistente = await prisma.produto.findUnique({
            where: {
                id: produtoId,
            },
        });

        if (!produtoExistente || produtoExistente.barbeariaId !== barbeariaId) {
            return res.status(404).json({ error: 'Produto não encontrado para esta barbearia.' });
        }

        // Verifica se houve alguma alteração
        const dadosIguais =
            produtoExistente.nome === nome &&
            produtoExistente.descricao === descricao &&
            produtoExistente.tipo === tipo &&
            Number(produtoExistente.preco) === Number(preco);

        if (dadosIguais) {
            return res.status(400).json({ error: 'Nenhuma alteração foi feita no produto.' });
        }

        // Atualiza o produto
        const produtoAtualizado = await prisma.produto.update({
            where: { id: produtoId },
            data: {
                nome,
                descricao,
                tipo,
                preco: Number(preco),
            },
        });

        return res.status(200).json({
            message: 'Produto atualizado com sucesso!',
            produto: produtoAtualizado,
        });
    } catch (error) {
        console.error('Erro ao editar produto:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.delete('/barbearia/:barbeariaId/produtos/:produtoId', async (req: Request, res: Response) => {
    try {
        const { barbeariaId, produtoId } = req.params;

        if (!barbeariaId || !produtoId) {
            return res.status(400).json({ error: 'ID da barbearia e do produto são obrigatórios.' });
        }

        // Verifica se o produto existe
        const produtoExistente = await prisma.produto.findUnique({
            where: { id: produtoId },
        });

        if (!produtoExistente || produtoExistente.barbeariaId !== barbeariaId) {
            return res.status(404).json({ error: 'Produto não encontrado para esta barbearia.' });
        }

        // Deleta o produto
        await prisma.produto.delete({
            where: { id: produtoId },
        });

        return res.status(200).json({ message: 'Produto deletado com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.get('/barbearia/:barbeariaId/redes-sociais', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        // Busca as redes sociais da barbearia específica
        const redesSociais = await prisma.redeSocial.findMany({
            where: { barbeariaId },
            orderBy: { rede: 'asc' }, // ordena por nome da rede social (opcional)
        });

        return res.status(200).json(redesSociais);
    } catch (error) {
        console.error('Erro ao buscar redes sociais da barbearia:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.post('/barbearia/:barbeariaId/redes-sociais', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;
        const { rede, link } = req.body;

        if (!barbeariaId || !rede || !link) {
            return res.status(400).json({ error: 'Barbearia, nome da rede e link são obrigatórios.' });
        }

        // Verifica se a rede já está cadastrada para essa barbearia
        const redeExistente = await prisma.redeSocial.findFirst({
            where: {
                barbeariaId,
                rede: {
                    equals: rede
                }
            }
        });

        if (redeExistente) {
            return res.status(400).json({ error: `A rede social "${rede}" já está cadastrada para esta barbearia.` });
        }

        // Cria a rede social
        const novaRede = await prisma.redeSocial.create({
            data: {
                barbeariaId,
                rede,
                link
            }
        });

        return res.status(201).json({
            message: 'Rede social criada com sucesso!',
            redeSocial: novaRede
        });

    } catch (error) {
        console.error('Erro ao criar rede social:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.put('/barbearia/:barbeariaId/redes-sociais/:redeId', async (req: Request, res: Response) => {
    try {
        const { barbeariaId, redeId } = req.params;
        const { link } = req.body;

        if (!link || typeof link !== 'string') {
            return res.status(400).json({ error: 'O link é obrigatório.' });
        }

        // Verifica se a rede social existe
        const redeExistente = await prisma.redeSocial.findFirst({
            where: {
                id: redeId,
                barbeariaId,
            },
        });

        if (!redeExistente) {
            return res.status(404).json({ error: 'Rede social não encontrada para esta barbearia.' });
        }

        // Verifica se houve alteração
        if (redeExistente.link === link) {
            return res.status(400).json({ error: 'Nenhuma alteração detectada. O link é igual ao atual.' });
        }

        // Atualiza o link
        const redeAtualizada = await prisma.redeSocial.update({
            where: { id: redeId },
            data: { link },
        });

        return res.status(200).json({
            message: 'Link da rede social atualizado com sucesso!',
            redeSocial: redeAtualizada,
        });
    } catch (error) {
        console.error('Erro ao editar link da rede social:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.delete('/barbearia/:barbeariaId/redes-sociais/:redeId', async (req: Request, res: Response) => {
    try {
        const { barbeariaId, redeId } = req.params;

        // Verifica se a rede social existe
        const redeExistente = await prisma.redeSocial.findFirst({
            where: {
                id: redeId,
                barbeariaId,
            },
        });

        if (!redeExistente) {
            return res.status(404).json({ error: 'Rede social não encontrada para esta barbearia.' });
        }

        // Deleta a rede social
        await prisma.redeSocial.delete({
            where: { id: redeId },
        });

        return res.status(200).json({ message: 'Rede social deletada com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar rede social:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.get('/barbearia/:barbeariaId/formas-pagamento', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        // Busca todas as formas de pagamento da barbearia
        const formasPagamento = await prisma.formaPagamento.findMany({
            where: { barbeariaId },
            orderBy: { tipo: 'asc' }, // Ordena por tipo de pagamento (opcional)
        });

        return res.status(200).json(formasPagamento);
    } catch (error) {
        console.error('Erro ao buscar formas de pagamento da barbearia:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.post('/barbearia/:barbeariaId/formas-pagamento', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;
        const { tipo } = req.body;

        // Verificação de dados obrigatórios
        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        if (!tipo || typeof tipo !== 'string' || tipo.trim() === '') {
            return res.status(400).json({ error: 'O tipo da forma de pagamento é obrigatório e deve ser uma string válida.' });
        }

        // Verifica se já existe essa forma de pagamento cadastrada
        const formaExistente = await prisma.formaPagamento.findFirst({
            where: {
                barbeariaId,
                tipo: {
                    equals: tipo
                },
            },
        });

        if (formaExistente) {
            return res.status(400).json({ error: 'Essa forma de pagamento já está cadastrada para a barbearia.' });
        }

        // Criação da forma de pagamento
        const novaForma = await prisma.formaPagamento.create({
            data: {
                barbeariaId,
                tipo: tipo.trim(),
            },
        });

        return res.status(201).json({
            message: 'Forma de pagamento criada com sucesso!',
            formaPagamento: novaForma,
        });
    } catch (error) {
        console.error('Erro ao criar forma de pagamento:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.delete('/barbearia/:barbeariaId/formas-pagamento/:formaPagamentoId', async (req: Request, res: Response) => {
    try {
        const { barbeariaId, formaPagamentoId } = req.params;

        if (!barbeariaId || !formaPagamentoId) {
            return res.status(400).json({ error: 'ID da barbearia e da forma de pagamento são obrigatórios.' });
        }

        // Verifica se a forma de pagamento existe e pertence à barbearia
        const formaPagamento = await prisma.formaPagamento.findFirst({
            where: {
                id: formaPagamentoId,
                barbeariaId: barbeariaId,
            },
        });

        if (!formaPagamento) {
            return res.status(404).json({ error: 'Forma de pagamento não encontrada para esta barbearia.' });
        }

        // Deleta a forma de pagamento
        await prisma.formaPagamento.delete({
            where: { id: formaPagamentoId },
        });

        return res.status(200).json({ message: 'Forma de pagamento deletada com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar forma de pagamento:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.get('/barbearia/:barbeariaId/horarios-funcionamento', async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;

        if (!barbeariaId) {
            return res.status(400).json({ error: 'ID da barbearia é obrigatório.' });
        }

        const horarios = await prisma.horariosFuncionamentoBarbearia.findMany({
            where: { barbeariaId },
            orderBy: { diaSemana: 'asc' }, // Ordena de Domingo (0) até Sábado (6)
        });

        return res.status(200).json(horarios);
    } catch (error) {
        console.error('Erro ao buscar horários de funcionamento:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.post('/barbearia/:barbeariaId/horario-funcionamento', async (req: Request, res: Response) => {
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

        // Verificar se o horário já existe para esse dia na barbearia
        const horarioExistente = await prisma.horariosFuncionamentoBarbearia.findFirst({
            where: {
                barbeariaId,
                diaSemana: dia,
            },
        });

        if (horarioExistente) {
            return res.status(400).json({ error: 'Já existe um horário cadastrado para esse dia da semana nesta barbearia.' });
        }

        // Validar se horaInicio < horaFim
        const [inicioHoras, inicioMinutos] = horaInicio.split(':').map(Number);
        const [fimHoras, fimMinutos] = horaFim.split(':').map(Number);
        const inicioEmMinutos = inicioHoras * 60 + inicioMinutos;
        const fimEmMinutos = fimHoras * 60 + fimMinutos;

        if (inicioEmMinutos >= fimEmMinutos) {
            return res.status(400).json({ error: 'O horário de início deve ser menor que o horário de término.' });
        }

        // Criar novo horário
        const novoHorario = await prisma.horariosFuncionamentoBarbearia.create({
            data: {
                barbeariaId,
                diaSemana: dia,
                horaInicio,
                horaFim,
            },
        });

        return res.status(201).json({
            message: 'Horário de funcionamento cadastrado com sucesso!',
            horario: novoHorario,
        });
    } catch (error) {
        console.error('Erro ao cadastrar horário de funcionamento:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.put('/barbearia/:barbeariaId/horario-funcionamento/:horarioId', async (req: Request, res: Response) => {
    try {
        const { barbeariaId, horarioId } = req.params;
        const { horaInicio, horaFim } = req.body;

        // Verifica se os dados obrigatórios foram enviados
        if (!horaInicio || !horaFim) {
            return res.status(400).json({ error: 'Horário de início e fim são obrigatórios.' });
        }

        // Verifica se o horário de início é menor que o horário de fim
        const [hInicioH, hInicioM] = horaInicio.split(':').map(Number);
        const [hFimH, hFimM] = horaFim.split(':').map(Number);

        const minutosInicio = hInicioH * 60 + hInicioM;
        const minutosFim = hFimH * 60 + hFimM;

        if (minutosInicio >= minutosFim) {
            return res.status(400).json({ error: 'O horário de início deve ser menor que o horário de fim.' });
        }

        // Busca o horário existente
        const horarioExistente = await prisma.horariosFuncionamentoBarbearia.findFirst({
            where: {
                id: horarioId,
                barbeariaId,
            },
        });

        if (!horarioExistente) {
            return res.status(404).json({ error: 'Horário de funcionamento não encontrado.' });
        }

        // Verifica se os dados enviados são os mesmos
        if (
            horarioExistente.horaInicio === horaInicio &&
            horarioExistente.horaFim === horaFim
        ) {
            return res.status(400).json({ error: 'Nenhuma alteração detectada nos horários.' });
        }

        // Atualiza o horário
        const horarioAtualizado = await prisma.horariosFuncionamentoBarbearia.update({
            where: { id: horarioId },
            data: {
                horaInicio,
                horaFim,
            },
        });

        return res.status(200).json({
            message: 'Horário de funcionamento atualizado com sucesso!',
            horario: horarioAtualizado,
        });
    } catch (error) {
        console.error('Erro ao atualizar horário de funcionamento:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.delete('/barbearia/:barbeariaId/horario-funcionamento/:horarioId', async (req: Request, res: Response) => {
    try {
        const { barbeariaId, horarioId } = req.params;

        // Verifica se o horário existe e pertence à barbearia
        const horario = await prisma.horariosFuncionamentoBarbearia.findFirst({
            where: {
                id: horarioId,
                barbeariaId,
            },
        });

        if (!horario) {
            return res.status(404).json({ error: 'Horário de funcionamento não encontrado para esta barbearia.' });
        }

        // Deleta o horário
        await prisma.horariosFuncionamentoBarbearia.delete({
            where: { id: horarioId },
        });

        return res.status(200).json({ message: 'Horário de funcionamento deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar horário de funcionamento:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.post('/barbearia/agendamentos/visitante', async (req: Request, res: Response) => {
    try {
        // ID fixo do usuário (pode ser alterado facilmente aqui)
        const usuarioId = "visitante";

        const { barbeariaId, barbeiroId, servicoId, data, hora } = req.body;

        // Verificação de campos obrigatórios
        if (!barbeariaId || !barbeiroId || !servicoId || !data || !hora) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }

        // Verifica se o horário já está ocupado (mas permite se o status for "Cancelado")
        const agendamentoExistente = await prisma.agendamento.findFirst({
            where: {
                barbeiroId,
                data,
                hora,
            }
        });

        if (agendamentoExistente && agendamentoExistente.status !== "Cancelado") {
            return res.status(400).json({ error: 'Esse horário já está agendado para o barbeiro selecionado.' });
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
                status: 'Confirmado' // você pode deixar explícito o status se quiser
            }
        });

        return res.status(201).json(novoAgendamento);
    } catch (error) {
        console.error("Erro ao criar agendamento:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});