# Dicionário de Dados Físico

Fonte: `backend/prisma/schema.prisma` e migration inicial do Prisma.

## Convenções

- `INTEGER` é o tipo físico dos identificadores e inteiros;
- `VARCHAR(n)`, `CHAR(n)`, `TEXT` e `LONGTEXT` seguem o tamanho definido no
  schema;
- `DATETIME(3)` representa data/hora com milissegundos;
- `BOOLEAN` é armazenado pelo MySQL como `TINYINT(1)`;
- `DECIMAL(p,s)` representa números decimais com precisão `p` e escala `s`;
- `AI` significa `AUTO_INCREMENT`;
- `—` significa que a propriedade não se aplica;
- a migration `20261007210500_add_domain_checks` declara constraints `CHECK`
  físicas para os valores de domínio que o banco consegue garantir diretamente;
- regras que dependem de contagem, data/hora corrente ou outras entidades
  continuam sendo validadas na aplicação e em transações.

## USUARIO

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_usuario` | INTEGER | Não | Sim | Não | Não | AI | Identificador do usuário |
| `nome` | VARCHAR(150) | Não | Não | Não | Não | — | Nome completo |
| `email` | VARCHAR(150) | Não | Não | Não | Sim | — | E-mail de acesso |
| `senha_hash` | VARCHAR(255) | Não | Não | Não | Não | — | Hash bcrypt da senha |
| `status` | VARCHAR(20) | Não | Não | Não | Não | `'ATIVO'` | Estado da conta |
| `criado_em` | DATETIME(3) | Não | Não | Não | Não | CURRENT_TIMESTAMP(3) | Criação |
| `atualizado_em` | DATETIME(3) | Não | Não | Não | Não | CURRENT_TIMESTAMP(3) / atualização automática | Última alteração |

## TURMA

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_turma` | INTEGER | Não | Sim | Não | Não | AI | Identificador da turma |
| `nome` | VARCHAR(100) | Não | Não | Não | Não | — | Nome da turma |
| `ano_letivo` | INTEGER | Não | Não | Não | Não | — | Ano letivo |
| `vestibular_foco` | VARCHAR(20) | Não | Não | Não | Não | `'ENEM'` | Vestibular de referência |
| `status` | VARCHAR(20) | Não | Não | Não | Não | `'ATIVA'` | Situação da turma |
| `criado_em` | DATETIME(3) | Não | Não | Não | Não | CURRENT_TIMESTAMP(3) | Criação |

## TUTOR

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_usuario` | INTEGER | Não | Sim | `USUARIO.id_usuario` | — | — | Usuário com perfil de tutor |
| `id_turma` | INTEGER | Não | Não | `TURMA.id_turma` | — | — | Turma do tutor |

## ADMINISTRADOR

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_usuario` | INTEGER | Não | Sim | `USUARIO.id_usuario` | — | — | Usuário administrador |

## ALUNO

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_usuario` | INTEGER | Não | Sim | `USUARIO.id_usuario` | — | — | Usuário com perfil de aluno |
| `id_tutor` | INTEGER | Não | Não | `TUTOR.id_usuario` | — | — | Tutor responsável |

## CONVITE

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `codigo` | VARCHAR(10) | Não | Sim | Não | Sim | — | Código digitado pelo convidado |
| `papel` | VARCHAR(20) | Não | Não | Não | Não | — | `TUTOR` ou `ALUNO` |
| `id_turma` | INTEGER | Não | Não | `TURMA.id_turma` | — | — | Turma do convite |
| `id_tutor` | INTEGER | Sim | Não | `TUTOR.id_usuario` | — | NULL | Tutor responsável por aluno |
| `id_criado_por` | INTEGER | Não | Não | `USUARIO.id_usuario` | — | — | Criador do convite |
| `usado` | BOOLEAN | Não | Não | Não | Não | `false` | Uso único consumido |
| `expira_em` | DATETIME(3) | Não | Não | Não | Não | — | Data de expiração |
| `criado_em` | DATETIME(3) | Não | Não | Não | Não | CURRENT_TIMESTAMP(3) | Criação |

## TEMA

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_tema` | INTEGER | Não | Sim | Não | Não | AI | Identificador |
| `titulo_tema` | VARCHAR(200) | Não | Não | Não | Não | — | Título |
| `texto_motivador` | TEXT | Sim | Não | Não | Não | NULL | Texto motivador |
| `origem` | VARCHAR(100) | Sim | Não | Não | Não | NULL | Origem do tema |

## TAREFA

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_tarefa` | INTEGER | Não | Sim | Não | Não | AI | Identificador |
| `id_tutor` | INTEGER | Sim | Não | `TUTOR.id_usuario` | — | NULL | Tutor criador |
| `id_adm` | INTEGER | Sim | Não | `ADMINISTRADOR.id_usuario` | — | NULL | Administrador criador |
| `id_turma` | INTEGER | Não | Não | `TURMA.id_turma` | — | — | Turma alvo |
| `id_tema` | INTEGER | Sim | Não | `TEMA.id_tema` | — | NULL | Tema associado |
| `id_tarefa_origem` | INTEGER | Sim | Não | `TAREFA.id_tarefa` | — | NULL | Tarefa original |
| `titulo_tarefa` | VARCHAR(200) | Não | Não | Não | Não | — | Título |
| `descricao` | TEXT | Sim | Não | Não | Não | NULL | Instruções |
| `prazo_entrega` | DATETIME(3) | Não | Não | Não | Não | — | Prazo |
| `modalidade` | VARCHAR(20) | Não | Não | Não | Não | — | `AVALIATIVA` ou `GERAL` |
| `criado_em` | DATETIME(3) | Não | Não | Não | Não | CURRENT_TIMESTAMP(3) | Criação |

## ANEXO

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_anexo` | INTEGER | Não | Sim | Não | Não | AI | Identificador |
| `id_tarefa` | INTEGER | Não | Não | `TAREFA.id_tarefa` | — | — | Tarefa do anexo |
| `nome_arquivo` | VARCHAR(255) | Não | Não | Não | Não | — | Nome original |
| `caminho_arquivo` | VARCHAR(500) | Não | Não | Não | Não | — | Caminho/URL |
| `tipo_arquivo` | VARCHAR(20) | Não | Não | Não | Não | — | Tipo do arquivo |
| `criado_em` | DATETIME(3) | Não | Não | Não | Não | CURRENT_TIMESTAMP(3) | Criação |

## REDACAO

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_redacao` | INTEGER | Não | Sim | Não | Não | AI | Identificador |
| `id_aluno` | INTEGER | Não | Não | `ALUNO.id_usuario` | — | — | Autor |
| `id_tarefa` | INTEGER | Sim | Não | `TAREFA.id_tarefa` | — | NULL | Tarefa relacionada |
| `id_tema` | INTEGER | Sim | Não | `TEMA.id_tema` | — | NULL | Tema relacionado |
| `tipo_fluxo` | VARCHAR(20) | Não | Não | Não | Não | — | `TREINO` ou `AVALIATIVA` |
| `criado_em` | DATETIME(3) | Não | Não | Não | Não | CURRENT_TIMESTAMP(3) | Criação |

## VERSAO_REDACAO

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_versao` | INTEGER | Não | Sim | Não | Não | AI | Identificador |
| `id_redacao` | INTEGER | Não | Não | `REDACAO.id_redacao` | — | — | Redação |
| `numero_versao` | INTEGER | Não | Não | Não | `id_redacao` + `numero_versao` | — | Número da versão |
| `conteudo_texto` | LONGTEXT | Não | Não | Não | — | — | Texto |
| `status_versao` | VARCHAR(30) | Não | Não | Não | — | — | Estado da versão |
| `criado_em` | DATETIME(3) | Não | Não | Não | — | CURRENT_TIMESTAMP(3) | Criação |
| `data_envio` | DATETIME(3) | Sim | Não | Não | — | NULL | Envio |

## CORRECAO

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_correcao` | INTEGER | Não | Sim | Não | Não | AI | Identificador |
| `id_versao` | INTEGER | Não | Não | `VERSAO_REDACAO.id_versao` | — | — | Versão corrigida |
| `id_tutor` | INTEGER | Não | Não | `TUTOR.id_usuario` | — | — | Tutor corretor |
| `id_adm` | INTEGER | Sim | Não | `ADMINISTRADOR.id_usuario` | — | NULL | Administrador |
| `numero_ajuste` | INTEGER | Não | Não | Não | `id_versao` + `numero_ajuste` | `0` | Número do ajuste |
| `nota_comp1` | DECIMAL(5,2) | Sim | Não | Não | — | NULL | Competência 1 |
| `nota_comp2` | DECIMAL(5,2) | Sim | Não | Não | — | NULL | Competência 2 |
| `nota_comp3` | DECIMAL(5,2) | Sim | Não | Não | — | NULL | Competência 3 |
| `nota_comp4` | DECIMAL(5,2) | Sim | Não | Não | — | NULL | Competência 4 |
| `nota_comp5` | DECIMAL(5,2) | Sim | Não | Não | — | NULL | Competência 5 |
| `nota_total` | DECIMAL(6,2) | Sim | Não | Não | — | NULL | Nota total |
| `parecer_geral` | TEXT | Sim | Não | Não | — | NULL | Parecer |
| `recado_admin` | TEXT | Sim | Não | Não | — | NULL | Recado |
| `comentario_ajuste_admin` | TEXT | Sim | Não | Não | — | NULL | Comentário de ajuste |
| `status_aprovacao` | VARCHAR(30) | Não | Não | Não | — | — | Estado da correção |
| `data_correcao` | DATETIME(3) | Não | Não | Não | — | CURRENT_TIMESTAMP(3) | Data |

## ANOTACAO

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_anotacao` | INTEGER | Não | Sim | Não | Não | AI | Identificador |
| `id_correcao` | INTEGER | Não | Não | `CORRECAO.id_correcao` | — | — | Correção |
| `posicao_inicio` | INTEGER | Não | Não | Não | — | — | Início no texto |
| `posicao_final` | INTEGER | Não | Não | Não | — | — | Fim no texto |
| `texto_selecionado` | TEXT | Não | Não | Não | — | — | Trecho |
| `tipo_erro` | VARCHAR(100) | Não | Não | Não | — | — | Tipo do erro |
| `sugestao_comentario` | TEXT | Sim | Não | Não | — | NULL | Sugestão |

## QUESTAO

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_questao` | INTEGER | Não | Sim | Não | Não | AI | Identificador |
| `enunciado` | TEXT | Não | Não | Não | — | — | Enunciado |
| `imagem_url` | VARCHAR(500) | Sim | Não | Não | — | NULL | Imagem |
| `vestibular` | VARCHAR(20) | Não | Não | Não | — | — | Vestibular |
| `ano` | INTEGER | Não | Não | Não | — | — | Ano |
| `numero_questao` | INTEGER | Sim | Não | Não | — | NULL | Número |
| `grau_dificuldade` | VARCHAR(20) | Não | Não | Não | — | — | Dificuldade |
| `explicacao_gabarito` | TEXT | Sim | Não | Não | — | NULL | Explicação |
| `criado_por` | INTEGER | Não | Não | `USUARIO.id_usuario` | — | — | Autor |
| `criado_em` | DATETIME(3) | Não | Não | Não | — | CURRENT_TIMESTAMP(3) | Criação |
| `atualizado_em` | DATETIME(3) | Não | Não | Não | — | CURRENT_TIMESTAMP(3) / atualização automática | Atualização |

## ALTERNATIVA

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_alternativa` | INTEGER | Não | Sim | Não | Não | AI | Identificador |
| `id_questao` | INTEGER | Não | Não | `QUESTAO.id_questao` | — | — | Questão |
| `letra_opcao` | CHAR(1) | Não | Não | Não | `id_questao` + `letra_opcao` | — | Letra |
| `texto_alternativa` | TEXT | Não | Não | Não | — | — | Texto |
| `alternativa_correta` | BOOLEAN | Não | Não | Não | — | `false` | Indicador de gabarito |

## ASSUNTO

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_assunto` | INTEGER | Não | Sim | Não | Não | AI | Identificador |
| `nome_assunto` | VARCHAR(150) | Não | Não | Não | Sim | — | Nome |

## QUESTAO_ASSUNTO

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_questao` | INTEGER | Não | Sim | `QUESTAO.id_questao` | — | — | Questão |
| `id_assunto` | INTEGER | Não | Sim | `ASSUNTO.id_assunto` | — | — | Assunto |

PK composta: `id_questao` + `id_assunto`.

## SIMULADO

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_simulado` | INTEGER | Não | Sim | Não | Não | AI | Identificador |
| `id_aluno` | INTEGER | Não | Não | `ALUNO.id_usuario` | — | — | Aluno |
| `tipo_simulado` | VARCHAR(30) | Não | Não | Não | — | — | Tipo |
| `data_inicio` | DATETIME(3) | Não | Não | Não | — | — | Início |
| `data_fim` | DATETIME(3) | Sim | Não | Não | — | NULL | Fim |
| `tempo_gasto_seg` | INTEGER | Sim | Não | Não | — | NULL | Tempo em segundos |
| `status_simulado` | VARCHAR(20) | Não | Não | Não | — | — | Estado |
| `pontuacao_total` | DECIMAL(5,2) | Sim | Não | Não | — | NULL | Pontuação |

## CONTEM_QUESTAO

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_simulado` | INTEGER | Não | Sim | `SIMULADO.id_simulado` | — | — | Simulado |
| `id_questao` | INTEGER | Não | Sim | `QUESTAO.id_questao` | — | — | Questão |
| `ordem` | INTEGER | Não | Não | Não | — | — | Ordem |
| `resposta_aluno` | CHAR(1) | Sim | Não | Não | — | NULL | Resposta |
| `indicador_acerto` | BOOLEAN | Sim | Não | Não | — | NULL | Acerto |
| `data_resposta` | DATETIME(3) | Sim | Não | Não | — | NULL | Data da resposta |

PK composta: `id_simulado` + `id_questao`.

## CADERNO_ERROS

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_caderno` | INTEGER | Não | Sim | Não | Não | AI | Identificador |
| `id_aluno` | INTEGER | Não | Não | `ALUNO.id_usuario` | `id_aluno` + `id_questao` | — | Aluno |
| `id_questao` | INTEGER | Não | Não | `QUESTAO.id_questao` | `id_aluno` + `id_questao` | — | Questão |
| `quantidade_erros` | INTEGER | Não | Não | Não | — | `1` | Quantidade |
| `status_revisao` | VARCHAR(20) | Não | Não | Não | — | `'ATIVO'` | Estado |
| `data_primeiro_erro` | DATETIME(3) | Não | Não | Não | — | — | Primeiro erro |
| `data_ultimo_erro` | DATETIME(3) | Não | Não | Não | — | — | Último erro |

## COMUNICADO

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_comunicado` | INTEGER | Não | Sim | Não | Não | AI | Identificador |
| `id_usuario_remetente` | INTEGER | Não | Não | `USUARIO.id_usuario` | — | — | Remetente |
| `titulo_comunicado` | VARCHAR(200) | Não | Não | Não | — | — | Título |
| `mensagem` | TEXT | Não | Não | Não | — | — | Mensagem |
| `data_envio` | DATETIME(3) | Não | Não | Não | — | CURRENT_TIMESTAMP(3) | Envio |

## COMUNICADO_DESTINATARIO

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_comunicado` | INTEGER | Não | Sim | `COMUNICADO.id_comunicado` | — | — | Comunicado |
| `id_usuario_destinatario` | INTEGER | Não | Sim | `USUARIO.id_usuario` | — | — | Destinatário |
| `lido` | BOOLEAN | Não | Não | Não | — | `false` | Leitura |

PK composta: `id_comunicado` + `id_usuario_destinatario`.

## AUDITORIA

| Coluna | Tipo físico | Nulo | PK | FK | UNIQUE | DEFAULT | Descrição |
|---|---|---:|---:|---:|---:|---|---|
| `id_auditoria` | INTEGER | Não | Sim | Não | Não | AI | Identificador |
| `id_usuario` | INTEGER | Sim | Não | `USUARIO.id_usuario` | — | NULL | Usuário responsável |
| `acao` | VARCHAR(100) | Não | Não | Não | — | — | Ação |
| `entidade` | VARCHAR(50) | Não | Não | Não | — | — | Entidade afetada |
| `id_registro` | INTEGER | Sim | Não | Não | — | NULL | Registro afetado |
| `descricao` | TEXT | Sim | Não | Não | — | NULL | Detalhes |
| `data_hora` | DATETIME(3) | Não | Não | Não | — | CURRENT_TIMESTAMP(3) | Momento |

## Relacionamentos e ações referenciais

- `USUARIO` é especializado por `TUTOR`, `ALUNO` e `ADMINISTRADOR`;
- `TUTOR` pertence a uma `TURMA` e possui vários `ALUNO`;
- `CONVITE` pertence a uma `TURMA`, pode apontar para um `TUTOR` e possui um
  usuário criador;
- exclusão de usuário em perfis usa `ON DELETE CASCADE`;
- exclusão de anexos, versões, anotações, questões associadas e destinatários
  segue as regras de cascade definidas nas relações do Prisma;
- chaves estrangeiras sem cascade usam a proteção padrão do relacionamento.

## Constraints CHECK físicas

As seguintes constraints estão na migration
`backend/prisma/migrations/20261007210500_add_domain_checks/migration.sql`:

- `USUARIO.status`: `ATIVO` ou `INATIVO`;
- `TURMA.ano_letivo`: maior ou igual a 2000;
- `TURMA.status`: `ATIVA`, `ARQUIVADA` ou `INATIVA`;
- `CONVITE.papel`: `TUTOR` ou `ALUNO`;
- `TAREFA.modalidade`: `AVALIATIVA` ou `GERAL`;
- `REDACAO.tipo_fluxo`: `TREINO` ou `AVALIATIVA`.
