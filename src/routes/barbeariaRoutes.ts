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
} from '../controllers/barbeariaController';
import { autenticarToken } from '../middlewares/authMiddleware';

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
router.put('/agendamento/status/:agendamentoId', updateStatusAgendamentoController);
router.post('/barbeiro/register', registerBarbeiroController);
router.delete('/barbeiro/:barbeiroId', deleteBarbeiroController);
router.put('/barbeiro/:barbeiroId', updateBarbeiroController);
router.get('/barbeiro/:barbeiroId/horarios/:diaSemana', getHorariosPorDiaController);

export default router;