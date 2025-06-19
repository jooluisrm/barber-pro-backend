import express from 'express';
import {
    obterBarbeariasAtivas,
    obterBarbeariasProximas,
    obterBarbeariasPorNome,
    obterBarbeariaPorNome,
    obterServicosPorBarbearia,
    obterBarbeirosPorBarbearia,
    obterProdutosPorBarbearia,
    obterAvaliacoesPorBarbearia,
    criarAvaliacao,
    obterHorariosFuncionamento,
    obterFormasPagamento,
    obterRedesSociais,
    registrarBarbearia,
    loginBarbeariaController,
    getAgendamentosController,
    updateStatusAgendamentoController,
    registerBarbeiroController,
    deleteBarbeiroController,
    updateBarbeiroController,
    getHorariosPorDiaController,
    listarServicosController,
    criarServicoController,
    editarServicoController,
    deletarServicoController,
    listarProdutosController,
    criarProdutoController,
    editarProdutoController,
    deletarProdutoController,
    listarRedesSociaisController,
    criarRedeSocialController,
    editarRedeSocialController,
    deletarRedeSocialController,
    getFormasPagamentoController,
    createFormaPagamentoController,
    deleteFormaPagamentoController,
    getHorariosFuncionamentoController,
    createHorarioFuncionamentoController,
    updateHorarioFuncionamentoController,
    deleteHorarioFuncionamentoController,
    createAgendamentoVisitanteController,
} from '../controllers/barbeariaController';
import { autenticarToken } from '../middlewares/authMiddleware';
import { checkSubscription } from '../middlewares/checkSubscription';
import { authMiddlewareBarber } from '../middlewares/authMiddlewareBarber';

const router = express.Router();

router.get('/proxima', obterBarbeariasProximas);
router.get('/', obterBarbeariasAtivas);
router.get('/buscar/:nome', obterBarbeariasPorNome);
router.get('/:nome', obterBarbeariaPorNome);
router.get('/:id/servicos', obterServicosPorBarbearia);
router.get('/:id/profissionais', obterBarbeirosPorBarbearia);
router.get('/:id/produtos', obterProdutosPorBarbearia);
router.get('/:id/avaliacoes', obterAvaliacoesPorBarbearia);
router.post('/:id/avaliacoes', autenticarToken, criarAvaliacao);
router.get('/:barbeariaId/horarios', obterHorariosFuncionamento);
router.get('/:barbeariaId/formas-pagamento', obterFormasPagamento);
router.get('/:barbeariaId/redes-sociais', obterRedesSociais);


router.post('/registrar', registrarBarbearia);
router.post('/login', loginBarbeariaController);

router.get('/agendamentos/:barbeariaId', getAgendamentosController);
router.put('/agendamento/status/:agendamentoId', authMiddlewareBarber, checkSubscription, updateStatusAgendamentoController);
router.post('/agendamentos/visitante', createAgendamentoVisitanteController);

router.post('/barbeiro/register', authMiddlewareBarber, checkSubscription, registerBarbeiroController);
router.delete('/barbeiro/:barbeiroId', authMiddlewareBarber, checkSubscription, deleteBarbeiroController);
router.put('/barbeiro/:barbeiroId', authMiddlewareBarber, checkSubscription, updateBarbeiroController);
router.get('/barbeiro/:barbeiroId/horarios/:diaSemana', getHorariosPorDiaController);

router.get('/:barbeariaId/servicos', listarServicosController);
router.post('/:barbeariaId/servicos', authMiddlewareBarber, checkSubscription, criarServicoController);
router.put('/:barbeariaId/servicos/:servicoId', authMiddlewareBarber, checkSubscription, editarServicoController);
router.delete('/:barbeariaId/servicos/:servicoId', authMiddlewareBarber, checkSubscription, deletarServicoController);

router.get('/:barbeariaId/produtos', listarProdutosController);
router.post('/:barbeariaId/produtos', authMiddlewareBarber, checkSubscription, criarProdutoController);
router.put('/:barbeariaId/produtos/:produtoId', authMiddlewareBarber, checkSubscription, editarProdutoController);
router.delete('/:barbeariaId/produtos/:produtoId', authMiddlewareBarber, checkSubscription, deletarProdutoController);

router.get('/:barbeariaId/redes-sociais', listarRedesSociaisController);
router.post('/:barbeariaId/redes-sociais', authMiddlewareBarber, checkSubscription, criarRedeSocialController);
router.put('/:barbeariaId/redes-sociais/:redeId', authMiddlewareBarber, checkSubscription, editarRedeSocialController);
router.delete('/:barbeariaId/redes-sociais/:redeId', authMiddlewareBarber, checkSubscription, deletarRedeSocialController);

router.get('/:barbeariaId/formas-pagamento', getFormasPagamentoController);
router.post('/:barbeariaId/formas-pagamento', authMiddlewareBarber, checkSubscription, createFormaPagamentoController);
router.delete('/:barbeariaId/formas-pagamento/:formaPagamentoId', authMiddlewareBarber, checkSubscription, deleteFormaPagamentoController);

router.get('/:barbeariaId/horarios-funcionamento', getHorariosFuncionamentoController);
router.post('/:barbeariaId/horario-funcionamento', authMiddlewareBarber, checkSubscription, createHorarioFuncionamentoController);
router.put('/:barbeariaId/horario-funcionamento/:horarioId', authMiddlewareBarber, checkSubscription, updateHorarioFuncionamentoController);
router.delete('/:barbeariaId/horario-funcionamento/:horarioId', authMiddlewareBarber, checkSubscription, deleteHorarioFuncionamentoController);

export default router;