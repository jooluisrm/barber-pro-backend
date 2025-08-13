/*
  Warnings:

  - You are about to drop the column `estoque` on the `Produto` table. All the data in the column will be lost.
  - You are about to drop the column `preco` on the `Produto` table. All the data in the column will be lost.
  - Added the required column `custo` to the `Produto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `precoVenda` to the `Produto` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA');

-- AlterTable
ALTER TABLE "Produto" DROP COLUMN "estoque",
DROP COLUMN "preco",
ADD COLUMN     "alertaEstoqueBaixo" INTEGER,
ADD COLUMN     "custo" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "dataValidade" TIMESTAMP(3),
ADD COLUMN     "precoVenda" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "quantidade" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MovimentacaoEstoque" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT,
    "responsavelId" TEXT,

    CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
