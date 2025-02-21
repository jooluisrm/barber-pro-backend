// src/routes/usuarioRoutes.ts
import { Router } from 'express';
import { atualizarPerfil, loginUsuario, obterPerfil, registrarUsuario } from '../controllers/usuarioController';
import { autenticarToken } from '../middlewares/authMiddleware';

const router = Router();

// Rota para registrar um novo usuário
router.post('/register', registrarUsuario);
router.post('/login', loginUsuario);
// 🔒 Rota para obter o perfil do usuário autenticado
router.get('/perfil', autenticarToken, obterPerfil);
router.patch('/perfil', autenticarToken, atualizarPerfil);

export default router;
