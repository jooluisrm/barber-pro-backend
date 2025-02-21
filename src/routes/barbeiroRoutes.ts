import express from 'express';
import {
    obterHorariosDisponiveis,
} from '../controllers/barbeiroController';

const router = express.Router();

router.get('/:barbeiroId/horarios/:data/:hora', obterHorariosDisponiveis);

export default router;
