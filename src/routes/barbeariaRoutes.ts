import express from 'express';
import {
    obterBarbeariasAtivas,
    obterBarbeariasProximas,
    obterBarbeariasPorNome,
    obterBarbeariaPorNome,
    obterServicosPorBarbearia,
    obterBarbeirosPorBarbearia,
    obterProdutosPorBarbearia,
    obterAvaliacoesPorBarbearia,
    criarAvaliacao,
    obterHorariosFuncionamento,
    obterFormasPagamento,
    obterRedesSociais,
    getAgendamentosController,
    updateStatusAgendamentoController,
    registerBarbeiroController,
    deleteBarbeiroController,
    updateBarbeiroController,
    getHorariosPorDiaController,
    listarServicosController,
    criarServicoController,
    editarServicoController,
    deletarServicoController,
    listarProdutosController,
    criarProdutoController,
    editarProdutoController,
    deletarProdutoController,
    listarRedesSociaisController,
    criarRedeSocialController,
    editarRedeSocialController,
    deletarRedeSocialController,
    getFormasPagamentoController,
    createFormaPagamentoController,
    deleteFormaPagamentoController,
    getHorariosFuncionamentoController,
    createHorarioFuncionamentoController,
    updateHorarioFuncionamentoController,
    deleteHorarioFuncionamentoController,
    createAgendamentoVisitanteController,
    registrarNovaBarbeariaController,
    loginController,
    getAgendamentosPorBarbeiroController,
    getAgendamentosPendentesPorBarbeiroController,
} from '../controllers/barbeariaController';
import { autenticarToken } from '../middlewares/authMiddleware';
import { checkSubscription } from '../middlewares/checkSubscription';
import { Role } from '@prisma/client';
import { AuthRequest, checkRole } from '../middlewares/authMiddlewareBarber';
import { prisma } from '../libs/prisma';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.get('/proxima', obterBarbeariasProximas);
router.get('/', obterBarbeariasAtivas);
router.get('/buscar/:nome', obterBarbeariasPorNome);
router.get('/:nome', obterBarbeariaPorNome);
router.get('/:id/servicos', obterServicosPorBarbearia);
router.get('/:id/profissionais', obterBarbeirosPorBarbearia);
router.get('/:id/produtos', obterProdutosPorBarbearia);
router.get('/:id/avaliacoes', obterAvaliacoesPorBarbearia);
router.post('/:id/avaliacoes', autenticarToken, criarAvaliacao);
router.get('/:barbeariaId/horarios', obterHorariosFuncionamento);
router.get('/:barbeariaId/formas-pagamento', obterFormasPagamento);
router.get('/:barbeariaId/redes-sociais', obterRedesSociais);


router.post('/registrar', registrarNovaBarbeariaController);
router.post('/login', loginController);

router.get('/agendamentos/pendente/barbeiro/:barbeiroId', checkRole([Role.ADMIN, Role.BARBEIRO]), getAgendamentosPendentesPorBarbeiroController);
router.get('/agendamentos/barbeiro/:barbeiroId', checkRole([Role.ADMIN, Role.BARBEIRO]), getAgendamentosPorBarbeiroController);
router.get('/agendamentos/:barbeariaId', getAgendamentosController);
router.put('/agendamento/status/:agendamentoId', checkRole([Role.ADMIN, Role.BARBEIRO]), checkSubscription, updateStatusAgendamentoController);
router.post('/agendamentos/visitante', checkRole([Role.ADMIN, Role.BARBEIRO]), createAgendamentoVisitanteController);

router.post('/barbeiro/register', checkRole([Role.ADMIN]), registerBarbeiroController);
router.delete('/barbeiro/:barbeiroId', checkRole([Role.ADMIN]), deleteBarbeiroController);
router.put('/barbeiro/:barbeiroId', checkRole([Role.ADMIN, Role.BARBEIRO]), updateBarbeiroController);
router.get('/barbeiro/:barbeiroId/horarios/:diaSemana', checkRole([Role.ADMIN, Role.BARBEIRO]), getHorariosPorDiaController);

router.get('/:barbeariaId/adm/servicos', checkRole([Role.ADMIN, Role.BARBEIRO]), listarServicosController);
router.post('/:barbeariaId/servicos', checkRole([Role.ADMIN]), criarServicoController);
router.put('/:barbeariaId/servicos/:servicoId', checkRole([Role.ADMIN]), editarServicoController);
router.delete('/:barbeariaId/servicos/:servicoId', checkRole([Role.ADMIN]), deletarServicoController);

router.get('/:barbeariaId/adm/produtos', checkRole([Role.ADMIN, Role.BARBEIRO]), listarProdutosController);
router.post('/:barbeariaId/produtos', checkRole([Role.ADMIN]), criarProdutoController);
router.put('/:barbeariaId/produtos/:produtoId', checkRole([Role.ADMIN]), editarProdutoController);
router.delete('/:barbeariaId/produtos/:produtoId', checkRole([Role.ADMIN]), deletarProdutoController);

router.get('/:barbeariaId/adm/redes-sociais', checkRole([Role.ADMIN, Role.BARBEIRO]), listarRedesSociaisController);
router.post('/:barbeariaId/redes-sociais', checkRole([Role.ADMIN]), criarRedeSocialController);
router.put('/:barbeariaId/redes-sociais/:redeId', checkRole([Role.ADMIN]), editarRedeSocialController);
router.delete('/:barbeariaId/redes-sociais/:redeId', checkRole([Role.ADMIN]), deletarRedeSocialController);

router.get('/:barbeariaId/adm/formas-pagamento', checkRole([Role.ADMIN, Role.BARBEIRO]), getFormasPagamentoController);
router.post('/:barbeariaId/formas-pagamento', checkRole([Role.ADMIN]), createFormaPagamentoController);
router.delete('/:barbeariaId/formas-pagamento/:formaPagamentoId', checkRole([Role.ADMIN]), deleteFormaPagamentoController);

router.get('/:barbeariaId/adm/horarios-funcionamento', checkRole([Role.ADMIN, Role.BARBEIRO]), getHorariosFuncionamentoController);
router.post('/:barbeariaId/horario-funcionamento', checkRole([Role.ADMIN]), createHorarioFuncionamentoController);
router.put('/:barbeariaId/horario-funcionamento/:horarioId', checkRole([Role.ADMIN]), updateHorarioFuncionamentoController);
router.delete('/:barbeariaId/horario-funcionamento/:horarioId', checkRole([Role.ADMIN]), deleteHorarioFuncionamentoController);

router.patch('/usuarios-sistema/:usuarioId', checkRole(['ADMIN', 'BARBEIRO']), async (req: AuthRequest, res) => { // Usando a tipagem AuthRequest
    
    // ID do usuário a ser atualizado (da URL)
    const { usuarioId } = req.params;
    
    // Dados do usuário logado (injetados pelo middleware `checkRole`)
    // Usamos '!' pois o middleware garante que req.user existe neste ponto.
    const idDoUsuarioLogado = req.user!.id;
    const roleDoUsuarioLogado = req.user!.role;
    
    // --- LÓGICA DE AUTORIZAÇÃO APRIMORADA ---
    // Se o usuário logado NÃO é um ADMIN e está tentando editar um perfil que não é o seu...
    if (roleDoUsuarioLogado !== 'ADMIN' && usuarioId !== idDoUsuarioLogado) {
      // ...bloqueia o acesso.
      return res.status(403).json({ error: 'Acesso negado. Você só pode alterar o seu próprio perfil.' });
    }

    // Novos dados (do corpo da requisição)
    const { nome, email } = req.body;

    // O restante da lógica de validação e atualização permanece o mesmo, pois já era robusto.
    if (!nome && !email) {
      return res.status(400).json({ error: 'Nenhum dado fornecido para atualização.' });
    }
    if ((nome && typeof nome !== 'string') || (nome && nome.trim() === '')) {
      return res.status(400).json({ error: 'O nome fornecido é inválido.' });
    }
    if ((email && typeof email !== 'string') || (email && email.trim() === '')) {
      return res.status(400).json({ error: 'O email fornecido é inválido.' });
    }

    try {
      const usuarioAtual = await prisma.usuarioSistema.findUnique({
        where: { id: usuarioId },
      });

      if (!usuarioAtual) {
        return res.status(404).json({ error: 'Usuário a ser atualizado não encontrado.' });
      }

      const novoNome = nome?.trim();
      const novoEmail = email?.trim().toLowerCase();

      if (novoEmail && novoEmail !== usuarioAtual.email) {
        const emailExistente = await prisma.usuarioSistema.findUnique({
          where: { email: novoEmail },
        });
        if (emailExistente) {
          return res.status(409).json({ error: 'Este email já está em uso por outra conta.' });
        }
      }

      const isNomeIgual = !novoNome || novoNome === usuarioAtual.nome;
      const isEmailIgual = !novoEmail || novoEmail === usuarioAtual.email;

      if (isNomeIgual && isEmailIgual) {
        return res.status(400).json({ message: 'Nenhum dado novo para atualizar.' });
      }
      
      const dadosParaAtualizar: { nome?: string; email?: string } = {};
      if (!isNomeIgual) dadosParaAtualizar.nome = novoNome;
      if (!isEmailIgual) dadosParaAtualizar.email = novoEmail;

      const usuarioAtualizado = await prisma.usuarioSistema.update({
        where: { id: usuarioId },
        data: dadosParaAtualizar,
      });

      const { senha, ...dadosParaRetorno } = usuarioAtualizado;

      return res.status(200).json({
        message: 'Usuário atualizado com sucesso!',
        usuario: dadosParaRetorno,
      });

    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
  }
);

router.patch(
  '/usuarios-sistema/:usuarioId/alterar-senha',
  checkRole(['ADMIN', 'BARBEIRO']),
  async (req: AuthRequest, res) => {
    // --- Obtenção de Dados ---
    const { usuarioId } = req.params;
    const { currentPassword, newPassword } = req.body;
    const idDoUsuarioLogado = req.user!.id;
    const roleDoUsuarioLogado = req.user!.role;

    // --- Lógica de Autorização ---
    if (roleDoUsuarioLogado !== 'ADMIN' && usuarioId !== idDoUsuarioLogado) {
      return res.status(403).json({ error: 'Acesso negado. Você só pode alterar sua própria senha.' });
    }

    // --- 2. Validação de Entrada ---
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'A senha atual e a nova senha são obrigatórias.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }
    if (currentPassword === newPassword) {
        return res.status(400).json({ error: 'A nova senha não pode ser igual à senha atual.' });
    }

    try {
      // --- 3. Busca do Usuário e sua Senha Hasheada ---
      const usuario = await prisma.usuarioSistema.findUnique({
        where: { id: usuarioId },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // --- 4. Verificação da Senha Atual ---
      // Compara a senha enviada (texto plano) com a senha hasheada do banco.
      const isSenhaAtualValida = await bcrypt.compare(currentPassword, usuario.senha);

      if (!isSenhaAtualValida) {
        // Usamos 401 Unauthorized pois as credenciais (senha atual) estão incorretas.
        return res.status(401).json({ error: 'Senha atual incorreta.' });
      }

      // --- 5. Hashing da Nova Senha ---
      // Gera um "salt" e cria o hash da nova senha. O segundo argumento (10) é o custo do hash.
      const novaSenhaHasheada = await bcrypt.hash(newPassword, 10);

      // --- 6. Atualização no Banco de Dados ---
      await prisma.usuarioSistema.update({
        where: { id: usuarioId },
        data: {
          senha: novaSenhaHasheada,
        },
      });
      
      // --- 7. Resposta de Sucesso ---
      return res.status(200).json({ message: 'Senha alterada com sucesso!' });

    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
  }
);

export default router;