import express from 'express';
import { criarAgendamento } from '../controllers/agendamentoController';
import { autenticarToken } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', autenticarToken, criarAgendamento);

export default router;
