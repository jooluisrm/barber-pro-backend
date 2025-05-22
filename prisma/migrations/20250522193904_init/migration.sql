-- CreateTable
CREATE TABLE `Barbearia` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `endereco` VARCHAR(191) NOT NULL,
    `celular` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NULL,
    `fotoPerfil` VARCHAR(191) NULL,
    `descricao` VARCHAR(191) NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Ativa',

    UNIQUE INDEX `Barbearia_nome_key`(`nome`),
    UNIQUE INDEX `Barbearia_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HorariosFuncionamentoBarbearia` (
    `id` VARCHAR(191) NOT NULL,
    `barbeariaId` VARCHAR(191) NOT NULL,
    `diaSemana` INTEGER NOT NULL,
    `horaInicio` VARCHAR(191) NOT NULL,
    `horaFim` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormaPagamento` (
    `id` VARCHAR(191) NOT NULL,
    `barbeariaId` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RedeSocial` (
    `id` VARCHAR(191) NOT NULL,
    `barbeariaId` VARCHAR(191) NOT NULL,
    `link` VARCHAR(191) NOT NULL,
    `rede` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Barbeiro` (
    `id` VARCHAR(191) NOT NULL,
    `barbeariaId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NOT NULL,
    `fotoPerfil` VARCHAR(191) NULL,

    UNIQUE INDEX `Barbeiro_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HorarioTrabalho` (
    `id` VARCHAR(191) NOT NULL,
    `barbeiroId` VARCHAR(191) NOT NULL,
    `diaSemana` INTEGER NOT NULL,
    `hora` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Servico` (
    `id` VARCHAR(191) NOT NULL,
    `barbeariaId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `duracao` INTEGER NOT NULL,
    `preco` DECIMAL(65, 30) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Produto` (
    `id` VARCHAR(191) NOT NULL,
    `barbeariaId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `preco` DECIMAL(65, 30) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `imagemUrl` VARCHAR(191) NULL,
    `estoque` BOOLEAN NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Agendamento` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `barbeariaId` VARCHAR(191) NOT NULL,
    `barbeiroId` VARCHAR(191) NOT NULL,
    `servicoId` VARCHAR(191) NOT NULL,
    `data` VARCHAR(191) NOT NULL,
    `hora` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Confirmado',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Avaliacao` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `barbeariaId` VARCHAR(191) NOT NULL,
    `nota` INTEGER NOT NULL,
    `comentario` VARCHAR(191) NULL,
    `dataHora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NULL,
    `fotoPerfil` VARCHAR(191) NULL,

    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HorariosFuncionamentoBarbearia` ADD CONSTRAINT `HorariosFuncionamentoBarbearia_barbeariaId_fkey` FOREIGN KEY (`barbeariaId`) REFERENCES `Barbearia`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormaPagamento` ADD CONSTRAINT `FormaPagamento_barbeariaId_fkey` FOREIGN KEY (`barbeariaId`) REFERENCES `Barbearia`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RedeSocial` ADD CONSTRAINT `RedeSocial_barbeariaId_fkey` FOREIGN KEY (`barbeariaId`) REFERENCES `Barbearia`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Barbeiro` ADD CONSTRAINT `Barbeiro_barbeariaId_fkey` FOREIGN KEY (`barbeariaId`) REFERENCES `Barbearia`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HorarioTrabalho` ADD CONSTRAINT `HorarioTrabalho_barbeiroId_fkey` FOREIGN KEY (`barbeiroId`) REFERENCES `Barbeiro`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Servico` ADD CONSTRAINT `Servico_barbeariaId_fkey` FOREIGN KEY (`barbeariaId`) REFERENCES `Barbearia`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Produto` ADD CONSTRAINT `Produto_barbeariaId_fkey` FOREIGN KEY (`barbeariaId`) REFERENCES `Barbearia`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agendamento` ADD CONSTRAINT `Agendamento_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agendamento` ADD CONSTRAINT `Agendamento_barbeariaId_fkey` FOREIGN KEY (`barbeariaId`) REFERENCES `Barbearia`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agendamento` ADD CONSTRAINT `Agendamento_barbeiroId_fkey` FOREIGN KEY (`barbeiroId`) REFERENCES `Barbeiro`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agendamento` ADD CONSTRAINT `Agendamento_servicoId_fkey` FOREIGN KEY (`servicoId`) REFERENCES `Servico`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Avaliacao` ADD CONSTRAINT `Avaliacao_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Avaliacao` ADD CONSTRAINT `Avaliacao_barbeariaId_fkey` FOREIGN KEY (`barbeariaId`) REFERENCES `Barbearia`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
