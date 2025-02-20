// src/services/usuario.ts
import { prisma } from "../libs/prisma";

type CreateUserProps = {
    nome: string;
    email: string;
    senha: string;
    telefone: string;
};

// Serviço para criar um novo usuário
export const createUser = async ({ nome, email, senha, telefone }: CreateUserProps) => {
    const user = await prisma.usuario.create({
        data: { nome, email, senha, telefone }
    });
    return user;
};

// Serviço para buscar usuário por e-mail
export const BuscarEmail = async (email: string) => {
    const usuario = await prisma.usuario.findUnique({
        where: { email },
    });
    return usuario;
};

export const BuscarPerfil = async (id: string) => {
    return await prisma.usuario.findUnique({
        where: { id }, // Localiza o usuário pelo ID
        select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            fotoPerfil: true
        }
    });
};