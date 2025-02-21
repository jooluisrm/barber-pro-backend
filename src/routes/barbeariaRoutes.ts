import express from 'express';
import { obterBarbeariasAtivas, obterBarbeariasPorNome, obterBarbeariasProximas } from '../controllers/barbeariaController';

const router = express.Router();

router.get('/proxima', obterBarbeariasProximas);
router.get('/', obterBarbeariasAtivas);
router.get('/buscar/:nome', obterBarbeariasPorNome);

export default router;