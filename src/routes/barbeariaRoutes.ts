import express from 'express';
import { obterBarbeariasProximas } from '../controllers/barbeariaController';

const router = express.Router();

router.get('/proxima', obterBarbeariasProximas);

export default router;