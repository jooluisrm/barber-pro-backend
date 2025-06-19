// src/middlewares/authMiddlewareBarber.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Esta é uma boa prática em TypeScript para "ensinar" ao Express
// que nosso objeto `req` pode ter uma propriedade `userId`.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authMiddlewareBarber = (req: Request, res: Response, next: NextFunction) => {
  // 1. Pega o cabeçalho de autorização da requisição.
  const authHeader = req.headers.authorization;

  // 2. Verifica se o cabeçalho existe.
  if (!authHeader) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  // 3. O formato do token é "Bearer TOKEN_LONGO". Vamos separar as duas partes.
  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Erro no formato do token.' });
  }

  const [scheme, token] = parts;

  // Verifica se a primeira parte é realmente "Bearer".
  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token malformatado.' });
  }

  // 4. A mágica acontece aqui: verificar o token.
  // Usamos a mesma chave secreta que usamos para criar o token no login.
  jwt.verify(token, process.env.JWT_SECRET_KEY as string, (err, decoded) => {
    // Se o jwt.verify encontrar qualquer erro (assinatura inválida, token expirado), ele o retornará em `err`.
    if (err) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    // 5. Se o token for válido, `decoded` será o "payload" que você colocou dentro dele no login.
    // Vamos garantir que o payload tenha o ID e anexá-lo ao `req`.
    const payload = decoded as { id: string };
    req.userId = payload.id;

    // 6. Tudo certo! Chama `next()` para passar para o próximo middleware (o `checkSubscription`).
    return next();
  });
};