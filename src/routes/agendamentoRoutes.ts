import express from 'express';
import { cancelarAgendamento, criarAgendamento, deletarAgendamento, getMeusAgendamentosController } from '../controllers/agendamentoController';
import { autenticarToken } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', autenticarToken, criarAgendamento);
router.get('/:usuarioId', autenticarToken, getMeusAgendamentosController);
router.put('/:agendamentoId/cancelar', autenticarToken, cancelarAgendamento);
router.delete('/:agendamentoId', autenticarToken, deletarAgendamento);

export default router;
