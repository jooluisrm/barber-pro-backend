// src/routes/usuarioRoutes.ts
import { Router } from 'express';
import { loginUsuario, registrarUsuario } from '../controllers/usuarioController';

const router = Router();

// Rota para registrar um novo usuário
router.post('/register', registrarUsuario);
router.post('/login', loginUsuario);

export default router;
