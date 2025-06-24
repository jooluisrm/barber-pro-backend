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
    registrarNovaBarbeariaController,
    loginController,
    getAgendamentosPorBarbeiroController,
    getAgendamentosPendentesPorBarbeiroController,
} from '../controllers/barbeariaController';
import { autenticarToken } from '../middlewares/authMiddleware';
import { checkSubscription } from '../middlewares/checkSubscription';
import { Role } from '@prisma/client';
import { checkRole } from '../middlewares/authMiddlewareBarber';

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


router.post('/registrar', registrarNovaBarbeariaController);
router.post('/login', loginController);

router.get('/agendamentos/pendente/barbeiro/:barbeiroId', checkRole([Role.ADMIN, Role.BARBEIRO]), getAgendamentosPendentesPorBarbeiroController);
router.get('/agendamentos/barbeiro/:barbeiroId', checkRole([Role.ADMIN, Role.BARBEIRO]), getAgendamentosPorBarbeiroController);
router.get('/agendamentos/:barbeariaId', getAgendamentosController);
router.put('/agendamento/status/:agendamentoId', checkSubscription, updateStatusAgendamentoController);
router.post('/agendamentos/visitante', checkRole([Role.ADMIN, Role.BARBEIRO]), createAgendamentoVisitanteController);

router.post('/barbeiro/register', checkRole([Role.ADMIN]), checkSubscription, registerBarbeiroController);
router.delete('/barbeiro/:barbeiroId', checkRole([Role.ADMIN]), deleteBarbeiroController);
router.put('/barbeiro/:barbeiroId', checkRole([Role.ADMIN, Role.BARBEIRO]), updateBarbeiroController);
router.get('/barbeiro/:barbeiroId/horarios/:diaSemana', checkRole([Role.ADMIN, Role.BARBEIRO]), getHorariosPorDiaController);

router.get('/:barbeariaId/adm/servicos', checkRole([Role.ADMIN, Role.BARBEIRO]), listarServicosController);
router.post('/:barbeariaId/servicos', checkRole([Role.ADMIN]), criarServicoController);
router.put('/:barbeariaId/servicos/:servicoId', checkRole([Role.ADMIN]), editarServicoController);
router.delete('/:barbeariaId/servicos/:servicoId', checkRole([Role.ADMIN]), deletarServicoController);

router.get('/:barbeariaId/adm/produtos', checkRole([Role.ADMIN, Role.BARBEIRO]), listarProdutosController);
router.post('/:barbeariaId/produtos', checkRole([Role.ADMIN]), criarProdutoController);
router.put('/:barbeariaId/produtos/:produtoId', checkRole([Role.ADMIN]), editarProdutoController);
router.delete('/:barbeariaId/produtos/:produtoId', checkRole([Role.ADMIN]), deletarProdutoController);

router.get('/:barbeariaId/adm/redes-sociais', checkRole([Role.ADMIN, Role.BARBEIRO]), listarRedesSociaisController);
router.post('/:barbeariaId/redes-sociais', checkRole([Role.ADMIN]), criarRedeSocialController);
router.put('/:barbeariaId/redes-sociais/:redeId', checkRole([Role.ADMIN]), editarRedeSocialController);
router.delete('/:barbeariaId/redes-sociais/:redeId', checkRole([Role.ADMIN]), deletarRedeSocialController);

router.get('/:barbeariaId/adm/formas-pagamento', checkRole([Role.ADMIN, Role.BARBEIRO]), getFormasPagamentoController);
router.post('/:barbeariaId/formas-pagamento', checkRole([Role.ADMIN]), createFormaPagamentoController);
router.delete('/:barbeariaId/formas-pagamento/:formaPagamentoId', checkRole([Role.ADMIN]), deleteFormaPagamentoController);

router.get('/:barbeariaId/adm/horarios-funcionamento', checkRole([Role.ADMIN, Role.BARBEIRO]), getHorariosFuncionamentoController);
router.post('/:barbeariaId/horario-funcionamento', checkRole([Role.ADMIN]), createHorarioFuncionamentoController);
router.put('/:barbeariaId/horario-funcionamento/:horarioId', checkRole([Role.ADMIN]), updateHorarioFuncionamentoController);
router.delete('/:barbeariaId/horario-funcionamento/:horarioId', checkRole([Role.ADMIN]), deleteHorarioFuncionamentoController);

export default router;