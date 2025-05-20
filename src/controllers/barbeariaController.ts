import { Request, Response } from 'express';
import { BuscarAvaliacoesPorBarbearia, BuscarBarbeariaPorNome, BuscarBarbeariasAtivas, BuscarBarbeariasPorNome, BuscarBarbeariasProximas, BuscarBarbeirosPorBarbearia, BuscarProdutosPorBarbearia, BuscarServicosPorBarbearia, createFormaPagamentoService, createHorarioFuncionamentoService, CriarAvaliacao, criarProdutoService, criarRedeSocialService, criarServicoService, deletarProdutoService, deletarRedeSocialService, deletarServicoService, deleteBarbeiroService, deleteFormaPagamentoService, deleteHorarioFuncionamentoService, editarProdutoService, editarRedeSocialService, editarServicoService, getAgendamentosService, getFormasPagamentoService, getHorariosFuncionamentoService, getHorariosPorDiaService, listarProdutosService, listarRedesSociaisService, listarServicosDaBarbeariaService, loginBarbeariaService, ObterFormasPagamento, ObterHorariosFuncionamento, ObterRedesSociais, registerBarbeiroService, registrarNovaBarbearia, updateBarbeiroService, updateHorarioFuncionamentoService, updateStatusAgendamentoService } from '../services/barbeariaService';

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


export const registrarBarbearia = async (req: Request, res: Response) => {
    try {
        const novaBarbearia = await registrarNovaBarbearia(req.body);
        return res.status(201).json({
            message: 'Barbearia cadastrada com sucesso!',
            barbearia: novaBarbearia
        });
    } catch (error: any) {
        console.error('Erro ao registrar barbearia:', error);
        return res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
};

export const loginBarbeariaController = async (req: Request, res: Response) => {
    try {
        const { email, senha } = req.body;
        const resultado = await loginBarbeariaService(email, senha);
        return res.status(200).json(resultado);
    } catch (error: any) {
        console.error('Erro ao fazer login:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Erro interno do servidor.' });
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


export const registerBarbeiroController = async (req: Request, res: Response) => {
    try {
        const { nome, email, senha, telefone, fotoPerfil, barbeariaId } = req.body;

        if (!nome || !email || !senha || !telefone || !barbeariaId) {
            return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
        }

        const novoBarbeiro = await registerBarbeiroService({
            nome,
            email,
            senha,
            telefone,
            fotoPerfil,
            barbeariaId,
        });

        return res.status(201).json({ message: 'Barbeiro cadastrado com sucesso!', barbeiro: novoBarbeiro });
    } catch (error: any) {
        console.error('Erro ao registrar barbeiro:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Erro interno do servidor.' });
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

export const updateBarbeiroController = async (req: Request, res: Response) => {
    try {
        const { barbeiroId } = req.params;
        const { nome, telefone, email } = req.body;

        const resultado = await updateBarbeiroService(barbeiroId, { nome, telefone, email });

        return res.status(200).json({
            message: "Barbeiro atualizado com sucesso!",
            barbeiro: resultado
        });
    } catch (error: any) {
        console.error("Erro ao atualizar barbeiro:", error);
        return res.status(error.status || 500).json({ error: error.message || "Erro interno do servidor." });
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

export const criarServicoController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId } = req.params;
        const { nome, duracao, preco } = req.body;

        const novoServico = await criarServicoService({ barbeariaId, nome, duracao, preco });

        return res.status(201).json({
            message: 'Serviço criado com sucesso!',
            servico: novoServico,
        });
    } catch (error: any) {
        console.error('Erro ao criar serviço:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Erro interno do servidor.' });
    }
};

export const editarServicoController = async (req: Request, res: Response) => {
    try {
        const { barbeariaId, servicoId } = req.params;
        const { nome, duracao, preco } = req.body;

        const servicoAtualizado = await editarServicoService({ barbeariaId, servicoId, nome, duracao, preco });

        return res.status(200).json({
            message: 'Serviço atualizado com sucesso!',
            servico: servicoAtualizado,
        });
    } catch (error: any) {
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