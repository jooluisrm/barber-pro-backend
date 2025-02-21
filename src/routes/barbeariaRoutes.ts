import express from 'express';
import { obterBarbeariaPorNome, obterBarbeariasAtivas, obterBarbeariasPorNome, obterBarbeariasProximas, obterBarbeirosPorBarbearia, obterServicosPorBarbearia } 
from '../controllers/barbeariaController';

const router = express.Router();

router.get('/proxima', obterBarbeariasProximas);
router.get('/', obterBarbeariasAtivas);
router.get('/buscar/:nome', obterBarbeariasPorNome);
router.get('/:nome', obterBarbeariaPorNome);
router.get('/:id/servicos', obterServicosPorBarbearia);
router.get('/:id/profissionais', obterBarbeirosPorBarbearia);

export default router;