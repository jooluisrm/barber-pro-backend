import { Router } from 'express';
import { prisma } from '../libs/prisma';
import { BuscarEmail } from '../services/usuario';
import { autenticarToken, AuthRequest } from '../middlewares/authMiddleware';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import usuarioRoutes from './usuarioRoutes';

export const mainRouter = Router();

mainRouter.use('/usuario', usuarioRoutes);

mainRouter.patch('/usuario/perfil', autenticarToken, async (req: AuthRequest, res) => {
    try {
        const usuarioId = req.usuario?.id; // Obtém o ID corretamente
        const { nome, email, telefone } = req.body;

        if (!usuarioId) {
            return res.status(401).json({ error: 'Usuário não autenticado.' });
        }

        // 1️⃣ Verifica se pelo menos um campo foi enviado
        if (!nome && !email && !telefone) {
            return res.status(400).json({ error: 'Envie pelo menos um campo para atualização.' });
        }

        // 2️⃣ Se o e-mail for alterado, verificar se já existe no banco
        if (email) {
            const emailExistente = await prisma.usuario.findUnique({ where: { email } });
            if (emailExistente && emailExistente.id !== usuarioId) {
                return res.status(400).json({ error: 'Este e-mail já está em uso.' });
            }
        }

        // 3️⃣ Atualiza os dados do usuário
        const usuarioAtualizado = await prisma.usuario.update({
            where: { id: usuarioId },
            data: {
                nome,
                email,
                telefone
            }
        });

        return res.json({ message: 'Perfil atualizado com sucesso!', usuario: usuarioAtualizado });

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});




mainRouter.get("/barbearia/proxima", async (req, res) => {
    try {
        const { latitude, longitude, raio = 50 } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: "Latitude e longitude são obrigatórios." });
        }

        const latUser = parseFloat(latitude as string);
        const lonUser = parseFloat(longitude as string);
        const raioKm = parseFloat(raio as string);

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

        return res.json(barbeariasProximas);
    } catch (error) {
        console.error("Erro ao buscar barbearias próximas:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});


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

mainRouter.get("/barbearias", async (req, res) => {
    try {
        // Buscar todas as barbearias ativas (que não estão "Desativadas")
        const barbearias = await prisma.barbearia.findMany({
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

        return res.status(200).json(barbearias);
    } catch (error) {
        console.error("Erro ao buscar barbearias:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});

mainRouter.get("/barbearia/buscar/:nome", async (req, res) => {
    try {
        const { nome } = req.params;

        if (!nome || typeof nome !== "string") {
            return res.status(400).json({ error: "O parâmetro 'nome' é obrigatório e deve ser uma string." });
        }

        const barbearias = await prisma.barbearia.findMany({
            where: {
                nome: {
                    contains: nome // Ignora maiúsculas e minúsculas
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

        return res.status(200).json(barbearias);
    } catch (error) {
        console.error("Erro ao buscar barbearias:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});



mainRouter.get("/barbearia/:nome", async (req, res) => {
    try {
        const { nome } = req.params;

        const barbearia = await prisma.barbearia.findUnique({
            where: {
                nome,
            },
        });

        if (!barbearia) {
            return res.status(404).json({ error: "Barbearia não encontrada" });
        }

        return res.json(barbearia);
    } catch (error) {
        console.error("Erro ao buscar barbearia:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// Rota para buscar os serviços de uma barbearia específica
mainRouter.get('/barbearia/:id/servicos', async (req, res) => {
    const { id } = req.params; // Obtém o ID da barbearia da URL

    try {
        // Consulta os serviços da barbearia pelo id
        const servicos = await prisma.servico.findMany({
            where: {
                barbeariaId: id, // Filtra os serviços pela barbearia
            },
        });

        if (servicos.length === 0) {
            return res.status(404).json({ error: 'Nenhum serviço encontrado para esta barbearia.' });
        }

        // Retorna os serviços encontrados
        res.status(200).json(servicos);
    } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        res.status(500).json({ error: 'Erro ao buscar serviços.' });
    }
});


// Rota para obter os barbeiros de uma barbearia específica
mainRouter.get('/barbearia/:id/profissionais', async (req, res) => {
    const { id } = req.params; // Obtém o ID da barbearia da URL

    try {
        // Consulta os barbeiros da barbearia pelo id
        const barbeiros = await prisma.barbeiro.findMany({
            where: {
                barbeariaId: id, // Filtra os barbeiros pela barbearia
            },
        });

        if (barbeiros.length === 0) {
            return res.status(404).json({ error: 'Nenhum barbeiro encontrado para esta barbearia.' });
        }

        // Retorna os barbeiros encontrados
        res.status(200).json(barbeiros);
    } catch (error) {
        console.error('Erro ao buscar barbeiros:', error);
        res.status(500).json({ error: 'Erro ao buscar barbeiros.' });
    }
});

mainRouter.get('/barbearia/:id/produtos', async (req, res) => {
    const { id } = req.params; // Obtém o ID da barbearia da URL

    try {
        // Consulta os produtos da barbearia pelo id
        const produtos = await prisma.produto.findMany({
            where: {
                barbeariaId: id, // Filtra os produtos pela barbearia
            },
        });

        if (produtos.length === 0) {
            return res.status(404).json({ error: 'Nenhum produto encontrado para esta barbearia.' });
        }

        // Retorna os produtos encontrados
        res.status(200).json(produtos);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos.' });
    }
});

mainRouter.get('/barbearia/:id/avaliacoes', async (req, res) => {
    const { id } = req.params; // Obtém o ID da barbearia da URL

    try {
        // Consulta as avaliações da barbearia pelo id
        const avaliacoes = await prisma.avaliacao.findMany({
            where: { barbeariaId: id },
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
                dataHora: "desc" // Ordena da mais recente para a mais antiga
            }
        });

        if (avaliacoes.length === 0) {
            return res.status(404).json({ error: "Nenhuma avaliação encontrada para esta barbearia." });
        }

        // Retorna as avaliações formatadas
        res.status(200).json(avaliacoes.map(avaliacao => ({
            id: avaliacao.id,
            nota: avaliacao.nota,
            nome: avaliacao.usuario.nome,
            data: avaliacao.dataHora,
            comentario: avaliacao.comentario
        })));

    } catch (error) {
        console.error("Erro ao buscar avaliações:", error);
        res.status(500).json({ error: "Erro ao buscar avaliações." });
    }
});

mainRouter.post('/barbearia/:id/avaliacoes', autenticarToken, async (req, res) => {
    const { id } = req.params; // ID da barbearia
    const { usuarioId, nota, comentario } = req.body; // Dados do corpo da requisição

    // Validação dos dados recebidos
    if (!usuarioId || !nota) {
        return res.status(400).json({ error: "Campos obrigatórios não preenchidos!" });
    }

    try {
        // Criando a avaliação no banco de dados
        const avaliacao = await prisma.avaliacao.create({
            data: {
                usuarioId,
                barbeariaId: id,
                nota,
                comentario: comentario || null, // Comentário é opcional
            },
        });

        res.status(201).json({
            message: "Avaliação cadastrada com sucesso!",
            id: avaliacao.id,
        });

    } catch (error) {
        console.error("Erro ao criar avaliação:", error);
        res.status(500).json({ error: "Erro ao salvar avaliação." });
    }
});

mainRouter.get("/barbearia/:barbeariaId/horarios", async (req, res) => {
    const { barbeariaId } = req.params;

    try {
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
                diaSemana: "asc", // Ordena do domingo (0) ao sábado (6)
            },
        });

        if (horarios.length === 0) {
            return res.status(404).json({ error: "Nenhum horário de funcionamento cadastrado para essa barbearia." });
        }

        // Mapeia os números dos dias para os nomes correspondentes
        const diasSemanaMap = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

        const horariosFormatados = horarios.map(horario => ({
            id: horario.id,
            diaSemanaNumero: horario.diaSemana, // Retorna o número do dia da semana
            diaSemanaNome: diasSemanaMap[horario.diaSemana], // Converte número para nome do dia
            horaInicio: horario.horaInicio,
            horaFim: horario.horaFim,
        }));

        res.status(200).json(horariosFormatados);
    } catch (error) {
        console.error("Erro ao buscar horários de funcionamento:", error);
        res.status(500).json({ error: "Erro ao buscar horários de funcionamento." });
    }
});

mainRouter.get("/barbearia/:barbeariaId/formas-pagamento", async (req, res) => {
    const { barbeariaId } = req.params;

    try {
        // Buscar todas as formas de pagamento da barbearia
        const formasPagamento = await prisma.formaPagamento.findMany({
            where: { barbeariaId },
            select: {
                id: true,
                tipo: true, // Tipo da forma de pagamento (ex: "Dinheiro", "Cartão", etc.)
            },
        });

        if (formasPagamento.length === 0) {
            return res.status(404).json({ error: "Nenhuma forma de pagamento cadastrada para essa barbearia." });
        }

        res.status(200).json(formasPagamento);
    } catch (error) {
        console.error("Erro ao buscar formas de pagamento:", error);
        res.status(500).json({ error: "Erro ao buscar formas de pagamento." });
    }
});

mainRouter.get("/barbearia/:barbeariaId/redes-sociais", async (req, res) => {
    const { barbeariaId } = req.params;

    try {
        const redesSociais = await prisma.redeSocial.findMany({
            where: { barbeariaId },
            select: {
                id: true,
                link: true,
                rede: true,
            },
        });

        if (redesSociais.length === 0) {
            return res.status(404).json({ error: "Nenhuma rede social cadastrada para essa barbearia." });
        }

        res.status(200).json(redesSociais);
    } catch (error) {
        console.error("Erro ao buscar redes sociais:", error);
        res.status(500).json({ error: "Erro ao buscar redes sociais." });
    }
});


mainRouter.get('/barbeiro/:barbeiroId/horarios/:data/:hora', async (req, res) => {
    const { barbeiroId, data, hora } = req.params;

    try {
        // 🔥 Garantir que a data seja interpretada corretamente no fuso local
        const [ano, mes, dia] = data.split("-").map(Number);
        const dataEscolhida = new Date(ano, mes - 1, dia); // Ajuste para o mês (0-indexado)
        const diaSemana = dataEscolhida.getDay();

        // Buscar os horários de trabalho do barbeiro apenas para esse dia da semana
        const horarios = await prisma.horarioTrabalho.findMany({
            where: {
                barbeiroId: barbeiroId,
                diaSemana: diaSemana, // Filtra pelo dia da semana correspondente
            },
            select: {
                hora: true,
                id: true
            },
        });

        // Se não houver horários cadastrados para esse dia da semana, retorna erro
        if (horarios.length === 0) {
            return res.status(404).json({ error: 'Nenhum horário cadastrado para este barbeiro neste dia da semana.' });
        }

        // Buscar os agendamentos existentes para o barbeiro e a data específica
        const agendamentos = await prisma.agendamento.findMany({
            where: {
                barbeiroId: barbeiroId,
                data: data,
            },
        });

        // Criar um array de horários ocupados (horários que já têm agendamentos)
        const horariosOcupados = agendamentos.map(agendamento => {
            // Verificar o status do agendamento
            if (agendamento.status !== 'Cancelado') {
                return agendamento.hora;
            }
            // Se estiver cancelado, permitir que seja mostrado
            return null; // Não bloqueia horário cancelado
        }).filter(Boolean); // Remover valores nulos (cancelados)

        // Filtrar os horários disponíveis (remover os horários ocupados)
        let horariosDisponiveis = horarios.filter(horario => !horariosOcupados.includes(horario.hora));

        // 🔥 Se a data da requisição for hoje, remover horários que já passaram
        const agora = new Date();
        const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString().split("T")[0];

        if (data === hoje) {
            // Converter a hora passada na URL para minutos do dia
            const [horaAtual, minutoAtual] = hora.split(":").map(Number);
            const minutosAgora = horaAtual * 60 + minutoAtual;

            // Filtrar horários que ainda não passaram
            horariosDisponiveis = horariosDisponiveis.filter(horario => {
                const [hora, minuto] = horario.hora.split(":").map(Number);
                const minutosHorario = hora * 60 + minuto;
                return minutosHorario > minutosAgora;
            });
        }

        // Se não houver horários disponíveis, retorna erro
        if (horariosDisponiveis.length === 0) {
            return res.status(404).json({ error: 'Nenhum horário disponível para este barbeiro nesta data.' });
        }

        // Retornar os horários disponíveis
        res.status(200).json(horariosDisponiveis);
    } catch (error) {
        console.error('Erro ao buscar os horários:', error);
        res.status(500).json({ error: 'Erro ao buscar horários de trabalho do barbeiro.' });
    }
});





mainRouter.post('/agendamentos', autenticarToken, async (req, res) => {
    const { usuarioId, barbeariaId, barbeiroId, servicoId, data, hora } = req.body;

    try {
        // Verificar se já existe um agendamento nesse horário para o barbeiro, mas permite se estiver cancelado
        const agendamentoExistente = await prisma.agendamento.findFirst({
            where: {
                barbeiroId,
                data,
                hora,
            },
        });

        // Se existir um agendamento, verificar se o status é Cancelado e permitir agendamento nesse caso
        if (agendamentoExistente && agendamentoExistente.status !== 'Cancelado') {
            return res.status(400).json({ error: 'Horário já agendado. Escolha outro horário.' });
        }

        // Se o agendamento estiver cancelado, podemos criar um novo agendamento nesse horário
        const novoAgendamento = await prisma.agendamento.create({
            data: {
                usuarioId,
                barbeariaId,
                barbeiroId,
                servicoId,
                data,
                hora,
                status: 'Confirmado', // Agendamento será confirmado automaticamente
            },
        });

        res.status(201).json(novoAgendamento);
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        res.status(500).json({ error: 'Erro ao criar agendamento.' });
    }
});


mainRouter.get('/agendamentos/:usuarioId', autenticarToken, async (req, res) => {
    const { usuarioId } = req.params;

    try {
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
                    }
                }
            },
            orderBy: {
                data: 'asc', // Ordena os agendamentos pela data
            }
        });

        if (agendamentos.length === 0) {
            return res.status(404).json({ error: "Nenhum agendamento encontrado para este usuário." });
        }

        res.status(200).json(agendamentos);
    } catch (error) {
        console.error("Erro ao buscar agendamentos:", error);
        res.status(500).json({ error: "Erro ao buscar agendamentos." });
    }
});

mainRouter.put('/agendamentos/:agendamentoId/cancelar', autenticarToken, async (req, res) => {
    const { agendamentoId } = req.params;

    try {
        // Verificar se o agendamento existe
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId }
        });

        if (!agendamento) {
            return res.status(404).json({ error: "Agendamento não encontrado." });
        }

        // Verificar se o status do agendamento é diferente de "Cancelado" e "Feito"
        if (agendamento.status === "Cancelado" || agendamento.status === "Feito") {
            return res.status(400).json({ error: "Este agendamento não pode ser cancelado." });
        }

        // Atualizar o status para "Cancelado"
        const agendamentoCancelado = await prisma.agendamento.update({
            where: { id: agendamentoId },
            data: { status: "Cancelado" }
        });

        res.status(200).json({
            message: "Agendamento cancelado com sucesso.",
            agendamento: agendamentoCancelado
        });
    } catch (error) {
        console.error("Erro ao cancelar agendamento:", error);
        res.status(500).json({ error: "Erro ao cancelar o agendamento." });
    }
});

mainRouter.delete('/agendamentos/:agendamentoId', autenticarToken, async (req, res) => {
    const { agendamentoId } = req.params;

    try {
        // Verificar se o agendamento existe
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId }
        });

        if (!agendamento) {
            return res.status(404).json({ error: "Agendamento não encontrado." });
        }

        // Verificar se o status do agendamento é "Cancelado"
        if (agendamento.status !== "Cancelado") {
            return res.status(400).json({ error: "Este agendamento não pode ser deletado. Ele precisa estar com o status 'Cancelado'." });
        }

        // Deletar o agendamento
        await prisma.agendamento.delete({
            where: { id: agendamentoId }
        });

        res.status(200).json({
            message: "Agendamento deletado com sucesso."
        });
    } catch (error) {
        console.error("Erro ao deletar agendamento:", error);
        res.status(500).json({ error: "Erro ao deletar o agendamento." });
    }
});

