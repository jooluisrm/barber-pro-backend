-- CreateEnum
CREATE TYPE "StatusProduto" AS ENUM ('ATIVO', 'ARQUIVADO');

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "status" "StatusProduto" NOT NULL DEFAULT 'ATIVO';
