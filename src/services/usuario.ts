import { prisma } from "../libs/prisma";

type CreateUserProps = {
    nome: string;
    email: string;
    senha: string;
}

export const createUser = async ({ nome, email, senha }: CreateUserProps) => {
    const user = await prisma.usuario.create({
        data: { nome, email, senha }
    });
    return user;
}

export const BuscarEmail = async (email: string) => {
    const usuario = await prisma.usuario.findUnique({
        where: { email },
    });
    return usuario;
}