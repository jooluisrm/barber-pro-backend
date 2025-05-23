/*
  Warnings:

  - You are about to drop the column `abacatePayCustomerId` on the `Barbearia` table. All the data in the column will be lost.
  - You are about to drop the column `abacatePaySubscriptionId` on the `Barbearia` table. All the data in the column will be lost.
  - You are about to drop the column `dataPagamento` on the `Barbearia` table. All the data in the column will be lost.
  - You are about to drop the column `planoAssinatura` on the `Barbearia` table. All the data in the column will be lost.
  - You are about to drop the column `proximoPagamento` on the `Barbearia` table. All the data in the column will be lost.
  - You are about to drop the `PlanoAssinatura` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Barbearia" DROP COLUMN "abacatePayCustomerId",
DROP COLUMN "abacatePaySubscriptionId",
DROP COLUMN "dataPagamento",
DROP COLUMN "planoAssinatura",
DROP COLUMN "proximoPagamento",
ALTER COLUMN "status" SET DEFAULT 'Ativa';

-- DropTable
DROP TABLE "PlanoAssinatura";

-- CreateTable
CREATE TABLE "PagamentoBarbearia" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "billingId" TEXT,
    "customerId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagamentoBarbearia_pkey" PRIMARY KEY ("id")
);
