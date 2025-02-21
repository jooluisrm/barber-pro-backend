import express from 'express';
import { obterBarbeariasAtivas, obterBarbeariasProximas } from '../controllers/barbeariaController';

const router = express.Router();

router.get('/proxima', obterBarbeariasProximas);
router.get('/', obterBarbeariasAtivas);

export default router;