import express from 'express';
import { buscarAgendamentosUsuario, criarAgendamento } from '../controllers/agendamentoController';
import { autenticarToken } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', autenticarToken, criarAgendamento);
router.get('/:usuarioId', autenticarToken, buscarAgendamentosUsuario);

export default router;
