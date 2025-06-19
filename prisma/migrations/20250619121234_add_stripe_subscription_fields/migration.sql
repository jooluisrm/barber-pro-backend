/*
  Warnings:

  - You are about to drop the column `celular` on the `Barbearia` table. All the data in the column will be lost.
  - You are about to drop the column `descricao` on the `Barbearia` table. All the data in the column will be lost.
  - You are about to drop the column `endereco` on the `Barbearia` table. All the data in the column will be lost.
  - You are about to drop the column `fotoPerfil` on the `Barbearia` table. All the data in the column will be lost.
  - You are about to drop the column `telefone` on the `Barbearia` table. All the data in the column will be lost.
  - You are about to drop the `PagamentoBarbearia` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Barbearia` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `Barbearia` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Barbearia" DROP COLUMN "celular",
DROP COLUMN "descricao",
DROP COLUMN "endereco",
DROP COLUMN "fotoPerfil",
DROP COLUMN "telefone",
ADD COLUMN     "stripeCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- DropTable
DROP TABLE "PagamentoBarbearia";

-- CreateIndex
CREATE UNIQUE INDEX "Barbearia_stripeCustomerId_key" ON "Barbearia"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Barbearia_stripeSubscriptionId_key" ON "Barbearia"("stripeSubscriptionId");
