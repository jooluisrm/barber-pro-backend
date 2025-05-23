-- AlterTable
ALTER TABLE "Barbearia" ADD COLUMN     "abacatePayCustomerId" TEXT,
ADD COLUMN     "abacatePaySubscriptionId" TEXT,
ADD COLUMN     "dataPagamento" TIMESTAMP(3),
ADD COLUMN     "planoAssinatura" TEXT,
ADD COLUMN     "proximoPagamento" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'Inativa';

-- CreateTable
CREATE TABLE "PlanoAssinatura" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "precoMensal" DOUBLE PRECISION NOT NULL,
    "recursos" TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlanoAssinatura_pkey" PRIMARY KEY ("id")
);
