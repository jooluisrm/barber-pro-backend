import express from 'express';
import {
    createHorarioController,
    deleteHorariosController,
    obterHorariosDisponiveis,
} from '../controllers/barbeiroController';

const router = express.Router();

router.get('/:barbeiroId/horarios/:data/:hora', obterHorariosDisponiveis);
router.post('/:barbeiroId/horarios', createHorarioController);
router.delete('/:barbeiroId/horarios', deleteHorariosController);

export default router;
