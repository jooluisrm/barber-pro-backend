// src/server.ts
import express, { urlencoded } from 'express';
import 'dotenv/config';
import cors from 'cors';
import helmet from 'helmet';
import { mainRouter } from './routes';
import dotenv from 'dotenv';

dotenv.config();

const server = express();
server.use(helmet());
server.use(cors());
server.use(urlencoded({ extended: true }));
server.disable('x-powered-by');
server.use(express.json());

// Utiliza as rotas agregadas
server.use(mainRouter);

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});
