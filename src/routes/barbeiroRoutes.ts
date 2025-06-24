import express from 'express';
import {
    createHorarioController,
    deleteHorariosController,
    obterHorariosDisponiveis,
} from '../controllers/barbeiroController';
import { checkRole } from '../middlewares/authMiddlewareBarber';
import { Role } from '@prisma/client';

const router = express.Router();

router.get('/:barbeiroId/horarios/:data/:hora', obterHorariosDisponiveis);

router.post('/:barbeiroId/horarios', checkRole([Role.ADMIN, Role.BARBEIRO]), createHorarioController);
router.delete('/:barbeiroId/horarios', checkRole([Role.ADMIN, Role.BARBEIRO]), deleteHorariosController);

export default router;
