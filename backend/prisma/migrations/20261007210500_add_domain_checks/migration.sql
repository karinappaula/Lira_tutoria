-- Constraints de domínio que podem ser garantidas pelo MySQL.
-- Limites que dependem de contagem entre linhas permanecem na camada de serviço.

ALTER TABLE `USUARIO`
    ADD CONSTRAINT `USUARIO_status_chk`
    CHECK (`status` IN ('ATIVO', 'INATIVO'));

ALTER TABLE `TURMA`
    ADD CONSTRAINT `TURMA_ano_letivo_chk`
    CHECK (`ano_letivo` >= 2000),
    ADD CONSTRAINT `TURMA_status_chk`
    CHECK (`status` IN ('ATIVA', 'ARQUIVADA', 'INATIVA'));

ALTER TABLE `CONVITE`
    ADD CONSTRAINT `CONVITE_papel_chk`
    CHECK (`papel` IN ('TUTOR', 'ALUNO'));

ALTER TABLE `TAREFA`
    ADD CONSTRAINT `TAREFA_modalidade_chk`
    CHECK (`modalidade` IN ('AVALIATIVA', 'GERAL'));

ALTER TABLE `REDACAO`
    ADD CONSTRAINT `REDACAO_tipo_fluxo_chk`
    CHECK (`tipo_fluxo` IN ('TREINO', 'AVALIATIVA'));
