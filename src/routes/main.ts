import { Router } from 'express';
import { prisma } from '../libs/prisma';
import { BuscarEmail } from '../services/usuario';
import { autenticarToken, AuthRequest } from '../middlewares/authMiddleware';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const mainRouter = Router();

mainRouter.get('/ping', (req, res) => {
    res.json({ pong: true });
});

mainRouter.post('/usuario/register', async (req, res) => {
    try {
        const { nome, email, senha, telefone } = req.body;

        // 1️⃣ Validação de Campos
        if (!nome || !email || !senha || !telefone) {
            return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
        }

        // 2️⃣ Verificar se o e-mail já está cadastrado
        const usuarioExistente = await BuscarEmail(email);

        if (usuarioExistente) {
            return res.status(400).json({ error: 'E-mail já cadastrado. Tente outro.' });
        }

        // 3️⃣ Criptografar a senha
        const senhaHash = await bcrypt.hash(senha, 10); // Hash da senha com salt 10

        // 4️⃣ Criar o usuário no banco
        const novoUsuario = await prisma.usuario.create({
            data: {
                nome,
                email,
                senha: senhaHash, // Salvar a senha criptografada
                telefone
            }
        });

        // 5️⃣ Retornar sucesso
        return res.status(201).json({ message: 'Usuário cadastrado com sucesso!', usuario: novoUsuario });

    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

const SECRET_KEY = process.env.JWT_SECRET || 'seuSegredoSuperSeguro';

mainRouter.post('/usuario/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        // 1️⃣ Validação de Campos
        if (!email || !senha) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        }

        // 2️⃣ Verifica se o usuário existe
        const usuario = await BuscarEmail(email);

        if (!usuario) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }

        // 3️⃣ Compara a senha enviada com a senha hash no banco
        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }

        // 4️⃣ Gera o token JWT
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email },
            SECRET_KEY,
            { expiresIn: '2h' } // Token expira em 2 horas
        );

        // 5️⃣ Retorna o token e os dados do usuário (exceto a senha)
        return res.status(200).json({
            message: 'Login realizado com sucesso!',
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                telefone: usuario.telefone,
                fotoPerfil: usuario.fotoPerfil
            },
            token
        });

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

mainRouter.get('/usuario/perfil', autenticarToken, async (req: any, res) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.usuario.id }, // Pegamos o ID do token
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                fotoPerfil: true
            }
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        return res.status(200).json(usuario);
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

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
        const { latitude, longitude, raio = 50 } = req.query; // Raio padrão de 10km

        if (!latitude || !longitude) {
            return res.status(400).json({ error: "Latitude e longitude são obrigatórios." });
        }

        const latUser = parseFloat(latitude as string);
        const lonUser = parseFloat(longitude as string);
        const raioKm = parseFloat(raio as string);

        // Buscar todas as barbearias
        const barbearias = await prisma.barbearia.findMany({
            include: {
                barbeiros: true, // Inclui barbeiros vinculados à barbearia
            },
        });

        // Calcular distância e filtrar barbearias dentro do raio desejado
        const barbeariasProximas = barbearias
            .map(barbearia => {
                const distancia = calcularDistancia(latUser, lonUser, barbearia.latitude, barbearia.longitude);
                return { ...barbearia, distancia };
            })
            .filter(barbearia => barbearia.distancia <= raioKm) // Apenas barbearias dentro do raio
            .sort((a, b) => a.distancia - b.distancia); // Ordena por proximidade

        return res.json(barbeariasProximas);
    } catch (error) {
        console.error("Erro ao buscar barbeiros próximos:", error);
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

mainRouter.post('/barbearia/:id/avaliacoes', async (req, res) => {
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



mainRouter.get('/barbeiro/:barbeiroId/horarios/:data', async (req, res) => {
    const { barbeiroId, data } = req.params;

    try {
        // Buscar os agendamentos existentes para o barbeiro e a data específica
        const agendamentos = await prisma.agendamento.findMany({
            where: {
                barbeiroId: barbeiroId,
                data: data, // Considera a data passada como parâmetro
            },
        });

        // Obter os horários de trabalho do barbeiro
        const horarios = await prisma.horarioTrabalho.findMany({
            where: {
                barbeiroId: barbeiroId,
            },
            select: {
                hora: true,
                id: true
            },
        });

        // Criar um array de horários ocupados (horários que já têm agendamentos)
        const horariosOcupados = agendamentos.map(agendamento => agendamento.hora);

        // Filtrar os horários disponíveis (remover os horários ocupados)
        const horariosDisponiveis = horarios.filter(horario => !horariosOcupados.includes(horario.hora));

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

mainRouter.post('/agendamentos', async (req, res) => {
    const { usuarioId, barbeariaId, barbeiroId, servicoId, data, hora } = req.body;

    try {
        // Verificar se já existe um agendamento nesse horário para o barbeiro
        const agendamentoExistente = await prisma.agendamento.findFirst({
            where: {
                barbeiroId,
                data,
                hora,
            },
        });

        if (agendamentoExistente) {
            return res.status(400).json({ error: 'Horário já agendado. Escolha outro horário.' });
        }

        // Criar o agendamento
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

        res.status(201).json(novoAgendamento);
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        res.status(500).json({ error: 'Erro ao criar agendamento.' });
    }
});
