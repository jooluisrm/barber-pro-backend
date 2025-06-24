-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'BARBEIRO');

-- CreateTable
CREATE TABLE "UsuarioSistema" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "fotoPerfil" TEXT,
    "role" "Role" NOT NULL,
    "barbeariaId" TEXT NOT NULL,

    CONSTRAINT "UsuarioSistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Barbearia" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "celular" TEXT,
    "telefone" TEXT,
    "fotoPerfil" TEXT,
    "descricao" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ativa',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMP(3),

    CONSTRAINT "Barbearia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Barbeiro" (
    "id" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "fotoPerfil" TEXT,
    "usuarioSistemaId" TEXT NOT NULL,

    CONSTRAINT "Barbeiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorariosFuncionamentoBarbearia" (
    "id" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,

    CONSTRAINT "HorariosFuncionamentoBarbearia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormaPagamento" (
    "id" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "FormaPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedeSocial" (
    "id" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "rede" TEXT NOT NULL,

    CONSTRAINT "RedeSocial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorarioTrabalho" (
    "id" TEXT NOT NULL,
    "barbeiroId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "hora" TEXT NOT NULL,

    CONSTRAINT "HorarioTrabalho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "duracao" INTEGER NOT NULL,
    "preco" DECIMAL(65,30),

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL(65,30) NOT NULL,
    "tipo" TEXT NOT NULL,
    "imagemUrl" TEXT,
    "estoque" BOOLEAN NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "barbeiroId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Confirmado',

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "telefone" TEXT,
    "fotoPerfil" TEXT,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioSistema_email_key" ON "UsuarioSistema"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Barbearia_nome_key" ON "Barbearia"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Barbearia_stripeCustomerId_key" ON "Barbearia"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Barbearia_stripeSubscriptionId_key" ON "Barbearia"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Barbeiro_usuarioSistemaId_key" ON "Barbeiro"("usuarioSistemaId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- AddForeignKey
ALTER TABLE "UsuarioSistema" ADD CONSTRAINT "UsuarioSistema_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "Barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Barbeiro" ADD CONSTRAINT "Barbeiro_usuarioSistemaId_fkey" FOREIGN KEY ("usuarioSistemaId") REFERENCES "UsuarioSistema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Barbeiro" ADD CONSTRAINT "Barbeiro_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "Barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorariosFuncionamentoBarbearia" ADD CONSTRAINT "HorariosFuncionamentoBarbearia_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "Barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormaPagamento" ADD CONSTRAINT "FormaPagamento_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "Barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedeSocial" ADD CONSTRAINT "RedeSocial_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "Barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioTrabalho" ADD CONSTRAINT "HorarioTrabalho_barbeiroId_fkey" FOREIGN KEY ("barbeiroId") REFERENCES "Barbeiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "Barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "Barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "Barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_barbeiroId_fkey" FOREIGN KEY ("barbeiroId") REFERENCES "Barbeiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "Barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
