/*
  Warnings:

  - You are about to drop the column `servicoId` on the `Agendamento` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Agendamento" DROP CONSTRAINT "Agendamento_servicoId_fkey";

-- DropForeignKey
ALTER TABLE "Agendamento" DROP CONSTRAINT "Agendamento_usuarioId_fkey";

-- AlterTable
ALTER TABLE "Agendamento" DROP COLUMN "servicoId",
ADD COLUMN     "nomeVisitante" TEXT,
ADD COLUMN     "telefoneVisitante" TEXT,
ADD COLUMN     "valorTotal" DECIMAL(65,30),
ALTER COLUMN "usuarioId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AgendamentoServico" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "precoNoMomento" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "AgendamentoServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendamentoProduto" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "precoVendaNoMomento" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "AgendamentoProduto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendamentoServico" ADD CONSTRAINT "AgendamentoServico_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendamentoServico" ADD CONSTRAINT "AgendamentoServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendamentoProduto" ADD CONSTRAINT "AgendamentoProduto_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendamentoProduto" ADD CONSTRAINT "AgendamentoProduto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
