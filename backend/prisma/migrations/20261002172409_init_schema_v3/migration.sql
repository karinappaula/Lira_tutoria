-- CreateTable
CREATE TABLE `USUARIO` (
    `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `senha_hash` VARCHAR(255) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `USUARIO_email_key`(`email`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TURMA` (
    `id_turma` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `ano_letivo` INTEGER NOT NULL,
    `vestibular_foco` VARCHAR(20) NOT NULL DEFAULT 'ENEM',
    `status` VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_turma`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TUTOR` (
    `id_usuario` INTEGER NOT NULL,
    `id_turma` INTEGER NOT NULL,

    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ADMINISTRADOR` (
    `id_usuario` INTEGER NOT NULL,

    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ALUNO` (
    `id_usuario` INTEGER NOT NULL,
    `id_tutor` INTEGER NOT NULL,

    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CONVITE` (
    `codigo` VARCHAR(10) NOT NULL,
    `papel` VARCHAR(20) NOT NULL,
    `id_turma` INTEGER NOT NULL,
    `id_tutor` INTEGER NULL,
    `id_criado_por` INTEGER NOT NULL,
    `usado` BOOLEAN NOT NULL DEFAULT false,
    `expira_em` DATETIME(3) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`codigo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TEMA` (
    `id_tema` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo_tema` VARCHAR(200) NOT NULL,
    `texto_motivador` TEXT NULL,
    `origem` VARCHAR(100) NULL,

    PRIMARY KEY (`id_tema`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TAREFA` (
    `id_tarefa` INTEGER NOT NULL AUTO_INCREMENT,
    `id_tutor` INTEGER NULL,
    `id_adm` INTEGER NULL,
    `id_turma` INTEGER NOT NULL,
    `id_tema` INTEGER NULL,
    `id_tarefa_origem` INTEGER NULL,
    `titulo_tarefa` VARCHAR(200) NOT NULL,
    `descricao` TEXT NULL,
    `prazo_entrega` DATETIME(3) NOT NULL,
    `modalidade` VARCHAR(20) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_tarefa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ANEXO` (
    `id_anexo` INTEGER NOT NULL AUTO_INCREMENT,
    `id_tarefa` INTEGER NOT NULL,
    `nome_arquivo` VARCHAR(255) NOT NULL,
    `caminho_arquivo` VARCHAR(500) NOT NULL,
    `tipo_arquivo` VARCHAR(20) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_anexo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `REDACAO` (
    `id_redacao` INTEGER NOT NULL AUTO_INCREMENT,
    `id_aluno` INTEGER NOT NULL,
    `id_tarefa` INTEGER NULL,
    `id_tema` INTEGER NULL,
    `tipo_fluxo` VARCHAR(20) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_redacao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VERSAO_REDACAO` (
    `id_versao` INTEGER NOT NULL AUTO_INCREMENT,
    `id_redacao` INTEGER NOT NULL,
    `numero_versao` INTEGER NOT NULL,
    `conteudo_texto` LONGTEXT NOT NULL,
    `status_versao` VARCHAR(30) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_envio` DATETIME(3) NULL,

    UNIQUE INDEX `VERSAO_REDACAO_id_redacao_numero_versao_key`(`id_redacao`, `numero_versao`),
    PRIMARY KEY (`id_versao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CORRECAO` (
    `id_correcao` INTEGER NOT NULL AUTO_INCREMENT,
    `id_versao` INTEGER NOT NULL,
    `id_tutor` INTEGER NOT NULL,
    `id_adm` INTEGER NULL,
    `numero_ajuste` INTEGER NOT NULL DEFAULT 0,
    `nota_comp1` DECIMAL(5, 2) NULL,
    `nota_comp2` DECIMAL(5, 2) NULL,
    `nota_comp3` DECIMAL(5, 2) NULL,
    `nota_comp4` DECIMAL(5, 2) NULL,
    `nota_comp5` DECIMAL(5, 2) NULL,
    `nota_total` DECIMAL(6, 2) NULL,
    `parecer_geral` TEXT NULL,
    `recado_admin` TEXT NULL,
    `comentario_ajuste_admin` TEXT NULL,
    `status_aprovacao` VARCHAR(30) NOT NULL,
    `data_correcao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CORRECAO_id_versao_numero_ajuste_key`(`id_versao`, `numero_ajuste`),
    PRIMARY KEY (`id_correcao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ANOTACAO` (
    `id_anotacao` INTEGER NOT NULL AUTO_INCREMENT,
    `id_correcao` INTEGER NOT NULL,
    `posicao_inicio` INTEGER NOT NULL,
    `posicao_final` INTEGER NOT NULL,
    `texto_selecionado` TEXT NOT NULL,
    `tipo_erro` VARCHAR(100) NOT NULL,
    `sugestao_comentario` TEXT NULL,

    PRIMARY KEY (`id_anotacao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QUESTAO` (
    `id_questao` INTEGER NOT NULL AUTO_INCREMENT,
    `enunciado` TEXT NOT NULL,
    `imagem_url` VARCHAR(500) NULL,
    `vestibular` VARCHAR(20) NOT NULL,
    `ano` INTEGER NOT NULL,
    `numero_questao` INTEGER NULL,
    `grau_dificuldade` VARCHAR(20) NOT NULL,
    `explicacao_gabarito` TEXT NULL,
    `criado_por` INTEGER NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_questao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ALTERNATIVA` (
    `id_alternativa` INTEGER NOT NULL AUTO_INCREMENT,
    `id_questao` INTEGER NOT NULL,
    `letra_opcao` CHAR(1) NOT NULL,
    `texto_alternativa` TEXT NOT NULL,
    `alternativa_correta` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `ALTERNATIVA_id_questao_letra_opcao_key`(`id_questao`, `letra_opcao`),
    PRIMARY KEY (`id_alternativa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ASSUNTO` (
    `id_assunto` INTEGER NOT NULL AUTO_INCREMENT,
    `nome_assunto` VARCHAR(150) NOT NULL,

    UNIQUE INDEX `ASSUNTO_nome_assunto_key`(`nome_assunto`),
    PRIMARY KEY (`id_assunto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QUESTAO_ASSUNTO` (
    `id_questao` INTEGER NOT NULL,
    `id_assunto` INTEGER NOT NULL,

    PRIMARY KEY (`id_questao`, `id_assunto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SIMULADO` (
    `id_simulado` INTEGER NOT NULL AUTO_INCREMENT,
    `id_aluno` INTEGER NOT NULL,
    `tipo_simulado` VARCHAR(30) NOT NULL,
    `data_inicio` DATETIME(3) NOT NULL,
    `data_fim` DATETIME(3) NULL,
    `tempo_gasto_seg` INTEGER NULL,
    `status_simulado` VARCHAR(20) NOT NULL,
    `pontuacao_total` DECIMAL(5, 2) NULL,

    PRIMARY KEY (`id_simulado`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CONTEM_QUESTAO` (
    `id_simulado` INTEGER NOT NULL,
    `id_questao` INTEGER NOT NULL,
    `ordem` INTEGER NOT NULL,
    `resposta_aluno` CHAR(1) NULL,
    `indicador_acerto` BOOLEAN NULL,
    `data_resposta` DATETIME(3) NULL,

    PRIMARY KEY (`id_simulado`, `id_questao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CADERNO_ERROS` (
    `id_caderno` INTEGER NOT NULL AUTO_INCREMENT,
    `id_aluno` INTEGER NOT NULL,
    `id_questao` INTEGER NOT NULL,
    `quantidade_erros` INTEGER NOT NULL DEFAULT 1,
    `status_revisao` VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    `data_primeiro_erro` DATETIME(3) NOT NULL,
    `data_ultimo_erro` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CADERNO_ERROS_id_aluno_id_questao_key`(`id_aluno`, `id_questao`),
    PRIMARY KEY (`id_caderno`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `COMUNICADO` (
    `id_comunicado` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario_remetente` INTEGER NOT NULL,
    `titulo_comunicado` VARCHAR(200) NOT NULL,
    `mensagem` TEXT NOT NULL,
    `data_envio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_comunicado`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `COMUNICADO_DESTINATARIO` (
    `id_comunicado` INTEGER NOT NULL,
    `id_usuario_destinatario` INTEGER NOT NULL,
    `lido` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id_comunicado`, `id_usuario_destinatario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AUDITORIA` (
    `id_auditoria` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NULL,
    `acao` VARCHAR(100) NOT NULL,
    `entidade` VARCHAR(50) NOT NULL,
    `id_registro` INTEGER NULL,
    `descricao` TEXT NULL,
    `data_hora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_auditoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TUTOR` ADD CONSTRAINT `TUTOR_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TUTOR` ADD CONSTRAINT `TUTOR_id_turma_fkey` FOREIGN KEY (`id_turma`) REFERENCES `TURMA`(`id_turma`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ADMINISTRADOR` ADD CONSTRAINT `ADMINISTRADOR_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ALUNO` ADD CONSTRAINT `ALUNO_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ALUNO` ADD CONSTRAINT `ALUNO_id_tutor_fkey` FOREIGN KEY (`id_tutor`) REFERENCES `TUTOR`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CONVITE` ADD CONSTRAINT `CONVITE_id_turma_fkey` FOREIGN KEY (`id_turma`) REFERENCES `TURMA`(`id_turma`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CONVITE` ADD CONSTRAINT `CONVITE_id_tutor_fkey` FOREIGN KEY (`id_tutor`) REFERENCES `TUTOR`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CONVITE` ADD CONSTRAINT `CONVITE_id_criado_por_fkey` FOREIGN KEY (`id_criado_por`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TAREFA` ADD CONSTRAINT `TAREFA_id_tutor_fkey` FOREIGN KEY (`id_tutor`) REFERENCES `TUTOR`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TAREFA` ADD CONSTRAINT `TAREFA_id_adm_fkey` FOREIGN KEY (`id_adm`) REFERENCES `ADMINISTRADOR`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TAREFA` ADD CONSTRAINT `TAREFA_id_turma_fkey` FOREIGN KEY (`id_turma`) REFERENCES `TURMA`(`id_turma`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TAREFA` ADD CONSTRAINT `TAREFA_id_tema_fkey` FOREIGN KEY (`id_tema`) REFERENCES `TEMA`(`id_tema`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TAREFA` ADD CONSTRAINT `TAREFA_id_tarefa_origem_fkey` FOREIGN KEY (`id_tarefa_origem`) REFERENCES `TAREFA`(`id_tarefa`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ANEXO` ADD CONSTRAINT `ANEXO_id_tarefa_fkey` FOREIGN KEY (`id_tarefa`) REFERENCES `TAREFA`(`id_tarefa`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `REDACAO` ADD CONSTRAINT `REDACAO_id_aluno_fkey` FOREIGN KEY (`id_aluno`) REFERENCES `ALUNO`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `REDACAO` ADD CONSTRAINT `REDACAO_id_tarefa_fkey` FOREIGN KEY (`id_tarefa`) REFERENCES `TAREFA`(`id_tarefa`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `REDACAO` ADD CONSTRAINT `REDACAO_id_tema_fkey` FOREIGN KEY (`id_tema`) REFERENCES `TEMA`(`id_tema`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VERSAO_REDACAO` ADD CONSTRAINT `VERSAO_REDACAO_id_redacao_fkey` FOREIGN KEY (`id_redacao`) REFERENCES `REDACAO`(`id_redacao`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CORRECAO` ADD CONSTRAINT `CORRECAO_id_versao_fkey` FOREIGN KEY (`id_versao`) REFERENCES `VERSAO_REDACAO`(`id_versao`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CORRECAO` ADD CONSTRAINT `CORRECAO_id_tutor_fkey` FOREIGN KEY (`id_tutor`) REFERENCES `TUTOR`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CORRECAO` ADD CONSTRAINT `CORRECAO_id_adm_fkey` FOREIGN KEY (`id_adm`) REFERENCES `ADMINISTRADOR`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ANOTACAO` ADD CONSTRAINT `ANOTACAO_id_correcao_fkey` FOREIGN KEY (`id_correcao`) REFERENCES `CORRECAO`(`id_correcao`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QUESTAO` ADD CONSTRAINT `QUESTAO_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ALTERNATIVA` ADD CONSTRAINT `ALTERNATIVA_id_questao_fkey` FOREIGN KEY (`id_questao`) REFERENCES `QUESTAO`(`id_questao`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QUESTAO_ASSUNTO` ADD CONSTRAINT `QUESTAO_ASSUNTO_id_questao_fkey` FOREIGN KEY (`id_questao`) REFERENCES `QUESTAO`(`id_questao`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QUESTAO_ASSUNTO` ADD CONSTRAINT `QUESTAO_ASSUNTO_id_assunto_fkey` FOREIGN KEY (`id_assunto`) REFERENCES `ASSUNTO`(`id_assunto`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SIMULADO` ADD CONSTRAINT `SIMULADO_id_aluno_fkey` FOREIGN KEY (`id_aluno`) REFERENCES `ALUNO`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CONTEM_QUESTAO` ADD CONSTRAINT `CONTEM_QUESTAO_id_simulado_fkey` FOREIGN KEY (`id_simulado`) REFERENCES `SIMULADO`(`id_simulado`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CONTEM_QUESTAO` ADD CONSTRAINT `CONTEM_QUESTAO_id_questao_fkey` FOREIGN KEY (`id_questao`) REFERENCES `QUESTAO`(`id_questao`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CADERNO_ERROS` ADD CONSTRAINT `CADERNO_ERROS_id_aluno_fkey` FOREIGN KEY (`id_aluno`) REFERENCES `ALUNO`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CADERNO_ERROS` ADD CONSTRAINT `CADERNO_ERROS_id_questao_fkey` FOREIGN KEY (`id_questao`) REFERENCES `QUESTAO`(`id_questao`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `COMUNICADO` ADD CONSTRAINT `COMUNICADO_id_usuario_remetente_fkey` FOREIGN KEY (`id_usuario_remetente`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `COMUNICADO_DESTINATARIO` ADD CONSTRAINT `COMUNICADO_DESTINATARIO_id_comunicado_fkey` FOREIGN KEY (`id_comunicado`) REFERENCES `COMUNICADO`(`id_comunicado`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `COMUNICADO_DESTINATARIO` ADD CONSTRAINT `COMUNICADO_DESTINATARIO_id_usuario_destinatario_fkey` FOREIGN KEY (`id_usuario_destinatario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AUDITORIA` ADD CONSTRAINT `AUDITORIA_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;
