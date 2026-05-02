-- CreateTable
CREATE TABLE `area` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(50) NOT NULL,
    `tipo` ENUM('secretaria', 'departamento') NOT NULL,
    `config_json` JSON NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `area_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `email` VARCHAR(200) NOT NULL,
    `senha` VARCHAR(255) NOT NULL,
    `role` ENUM('solicitante', 'tecnico', 'gestor', 'admin') NOT NULL DEFAULT 'solicitante',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `area_id` INTEGER NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `template_chamado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `area_id` INTEGER NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `campos_json` JSON NOT NULL,
    `sla_config_json` JSON NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chamado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `protocolo` VARCHAR(10) NOT NULL,
    `titulo` VARCHAR(200) NOT NULL,
    `descricao` TEXT NOT NULL,
    `template_id` INTEGER NOT NULL,
    `area_id` INTEGER NOT NULL,
    `solicitante_id` INTEGER NOT NULL,
    `tecnico_id` INTEGER NULL,
    `status` ENUM('ABERTO', 'EM_ANALISE', 'ATRIBUIDO', 'EM_ANDAMENTO', 'RESOLVIDO', 'ENCERRADO', 'CANCELADO') NOT NULL DEFAULT 'ABERTO',
    `prioridade` ENUM('critica', 'alta', 'media', 'baixa', 'normal') NOT NULL DEFAULT 'normal',
    `sla_prazo` DATETIME(3) NULL,
    `aberto_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechado_em` DATETIME(3) NULL,
    `parent_id` INTEGER NULL,

    UNIQUE INDEX `chamado_protocolo_key`(`protocolo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campo_chamado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chamado_id` INTEGER NOT NULL,
    `chave` VARCHAR(100) NOT NULL,
    `valor` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(80) NOT NULL,
    `label` VARCHAR(80) NOT NULL,
    `cor` VARCHAR(7) NOT NULL,

    UNIQUE INDEX `tag_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chamado_tag` (
    `chamado_id` INTEGER NOT NULL,
    `tag_id` INTEGER NOT NULL,

    PRIMARY KEY (`chamado_id`, `tag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mensagem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chamado_id` INTEGER NOT NULL,
    `autor_id` INTEGER NOT NULL,
    `conteudo` TEXT NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ativo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `patrimonio` VARCHAR(50) NOT NULL,
    `area_id` INTEGER NOT NULL,
    `tipo` VARCHAR(80) NOT NULL,
    `dados_json` JSON NULL,

    UNIQUE INDEX `ativo_patrimonio_key`(`patrimonio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chamado_ativo` (
    `chamado_id` INTEGER NOT NULL,
    `ativo_id` INTEGER NOT NULL,

    PRIMARY KEY (`chamado_id`, `ativo_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chamado_id` INTEGER NOT NULL,
    `score` INTEGER NOT NULL,
    `comentario` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `nps_chamado_id_key`(`chamado_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `area`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_chamado` ADD CONSTRAINT `template_chamado_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `area`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chamado` ADD CONSTRAINT `chamado_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `template_chamado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chamado` ADD CONSTRAINT `chamado_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `area`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chamado` ADD CONSTRAINT `chamado_solicitante_id_fkey` FOREIGN KEY (`solicitante_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chamado` ADD CONSTRAINT `chamado_tecnico_id_fkey` FOREIGN KEY (`tecnico_id`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chamado` ADD CONSTRAINT `chamado_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `chamado`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campo_chamado` ADD CONSTRAINT `campo_chamado_chamado_id_fkey` FOREIGN KEY (`chamado_id`) REFERENCES `chamado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chamado_tag` ADD CONSTRAINT `chamado_tag_chamado_id_fkey` FOREIGN KEY (`chamado_id`) REFERENCES `chamado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chamado_tag` ADD CONSTRAINT `chamado_tag_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mensagem` ADD CONSTRAINT `mensagem_chamado_id_fkey` FOREIGN KEY (`chamado_id`) REFERENCES `chamado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mensagem` ADD CONSTRAINT `mensagem_autor_id_fkey` FOREIGN KEY (`autor_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ativo` ADD CONSTRAINT `ativo_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `area`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chamado_ativo` ADD CONSTRAINT `chamado_ativo_chamado_id_fkey` FOREIGN KEY (`chamado_id`) REFERENCES `chamado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chamado_ativo` ADD CONSTRAINT `chamado_ativo_ativo_id_fkey` FOREIGN KEY (`ativo_id`) REFERENCES `ativo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
