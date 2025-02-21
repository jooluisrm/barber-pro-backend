import express from 'express';
import { buscarAgendamentosUsuario, cancelarAgendamento, criarAgendamento } from '../controllers/agendamentoController';
import { autenticarToken } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', autenticarToken, criarAgendamento);
router.get('/:usuarioId', autenticarToken, buscarAgendamentosUsuario);
router.put('/:agendamentoId/cancelar', autenticarToken, cancelarAgendamento);

export default router;
