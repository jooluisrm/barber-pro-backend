import express from 'express';
import { obterBarbeariaPorNome, obterBarbeariasAtivas, obterBarbeariasPorNome, obterBarbeariasProximas } from '../controllers/barbeariaController';

const router = express.Router();

router.get('/proxima', obterBarbeariasProximas);
router.get('/', obterBarbeariasAtivas);
router.get('/buscar/:nome', obterBarbeariasPorNome);
router.get('/:nome', obterBarbeariaPorNome);

export default router;