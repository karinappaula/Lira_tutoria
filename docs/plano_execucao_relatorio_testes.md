# Plano, execução e relatório de testes — LIRA

> **Relatório histórico:** registra a suíte anterior executada em 02/11/2026.
> A suíte oficial atual é descrita em [testes_oficial.md](./testes_oficial.md);
> os números deste histórico não representam os testes atualmente mantidos.

## 1. Objetivo

Este documento reúne o plano e os resultados reais dos testes dos fluxos críticos
do LIRA. Abrange testes unitários, integração HTTP com o MySQL e testes
funcionais/manuais pela interface para turmas, convites, autenticação, redações,
correções e aprovação.

## 2. Escopo e ambiente

- **Data dos testes:** 02/11/2026.
- **Backend:** Node.js, TypeScript, Express; `http://localhost:3333`.
- **Frontend:** Next.js; `http://localhost:3000`.
- **Banco de integração:** MySQL local, schema isolado `sistema_redacoes_test`.
- **Migrações:** as nove migrations do repositório foram aplicadas ao banco de
  teste; `prisma migrate status` informou que o schema está atualizado.
- **Dados de teste:** fixtures de seed e registros criados durante os testes.
  O banco principal `sistema_redacoes` não foi usado pelas verificações de
  integração ou interface.
- **Testes unitários:** Jest/TypeScript, com Prisma simulado.
- **Testes de integração:** chamadas HTTP reais à API, com persistência no banco
  isolado.
- **Testes funcionais/manuais:** navegação e ações verificadas no navegador.

## 3. Plano de casos de teste

Os casos unitários a seguir usam fixtures e persistência simulada. Os testes de
integração e interface executados estão registrados na seção 4.

### 3.1 Gerenciamento de turmas — `turmas.test.ts`

| ID | Pré-condições | Passos | Entradas | Resultado esperado |
|---|---|---|---|---|
| TUR-001 | Não existe turma com o mesmo nome e ano; persistência simulada disponível. | 1. Solicitar a criação. 2. Verificar os dados enviados para persistência e o retorno. | Nome `3º B`; ano letivo 2026; foco não informado. | Turma criada com foco padrão `ENEM` e identificador devolvido. |
| TUR-002 | A busca simulada encontra turma homônima no mesmo ano. | 1. Solicitar a criação. 2. Verificar o erro e confirmar que não houve persistência. | Nome `3º B`; ano letivo 2026. | Erro `TURMA_DUPLICADA`, status 409; nenhuma turma criada. |
| TUR-003 | A listagem simulada contém uma turma e dois tutores. | 1. Solicitar a listagem. 2. Conferir os totais agregados. | Tutor 1 com três alunos e tutor 2 com dois alunos. | Lista inclui a turma com dois tutores e cinco alunos. |
| TUR-004 | A turma de id 4 existe e está ativa. | 1. Solicitar o arquivamento. 2. Conferir o status enviado à persistência e o retorno. | Id da turma 4. | Status atualizado para `ARQUIVADA`. |
| TUR-005 | A turma de id 4 existe e já está arquivada. | 1. Solicitar novamente o arquivamento. 2. Conferir erro e ausência de atualização. | Id da turma 4. | Erro `TURMA_JA_ARQUIVADA`; não repete a atualização. |
| TUR-006 | A busca simulada não encontra a turma solicitada. | 1. Solicitar o arquivamento. 2. Conferir erro e ausência de atualização. | Id da turma 999. | Erro `TURMA_NAO_ENCONTRADA`; nenhuma atualização. |

### 3.2 Convites e vínculos — `convites.test.ts`

| ID | Pré-condições | Passos | Entradas | Resultado esperado |
|---|---|---|---|---|
| CONV-001 | Administrador 1 existe; turma 5 está ativa; turma tem um tutor; criação do convite é simulada. | 1. Solicitar convite para tutor. 2. Conferir formato, expiração e vagas. | Administrador 1; turma 5; dois usos. | Código `TUT-` com seis caracteres aceitos, expiração futura e duas vagas restantes. |
| CONV-002 | Perfil de administrador não é encontrado. | 1. Solicitar geração do convite. 2. Confirmar que nenhum convite foi criado. | Usuário 2; turma 5. | Erro `SEM_PERMISSAO`; não cria convite. |
| CONV-003 | Administrador existe, mas turma está arquivada. | 1. Solicitar geração do convite. 2. Conferir erro e ausência de criação. | Administrador 1; turma 5 arquivada. | Erro `TURMA_INATIVA`; não cria convite. |
| CONV-004 | Administrador e turma ativa existem. | 1. Solicitar sete usos. 2. Conferir erro de limite. | Administrador 1; turma 5; sete usos (limite configurado: seis). | Erro `DADOS_INVALIDOS`; não cria convite. |
| CONV-005 | Convite ativo `TUT-ABC234` existe com uma de duas vagas usada. | 1. Consultar o código com espaços e minúsculas. 2. Conferir a consulta e os detalhes. | Código digitado como ` tut-abc234 `. | Código normalizado para `TUT-ABC234`; uma vaga restante, não lotado e não expirado. |
| CONV-006 | Código não existe na persistência simulada. | 1. Consultar o código. 2. Conferir o erro devolvido. | Código `INV-999`. | Erro `CONVITE_NAO_ENCONTRADO`, status 404. |
| CONV-007 | Convite de aluno está ativo; usuário 22 não é tutor nem aluno vinculado; tutor responsável é 7. | 1. Entrar na transação simulada. 2. Solicitar participação como aluno. 3. Conferir criação do vínculo e atualização de usos. | Usuário 22; código `ALU-ABC234`; tutor 7; dois alunos ativos antes do vínculo. | Cria vínculo do usuário 22 com tutor 7 e atualiza usos para três. |
| CONV-008 | Convite de aluno está ativo; usuário 22 já possui perfil de tutor. | 1. Solicitar participação como aluno. 2. Conferir erro e ausência de vínculo. | Usuário 22; código `ALU-ABC234`; tutor associado 7. | Erro `PERFIL_INCOMPATIVEL`; não cria vínculo de aluno. |

### 3.3 Autenticação e cadastro — `auth.test.ts`

| ID | Pré-condições | Passos | Entradas | Resultado esperado |
|---|---|---|---|---|
| AUTH-001 | Bcrypt disponível no ambiente de teste. | 1. Gerar hash da senha. 2. Comparar a senha correta e uma incorreta com o hash. | `Senha-forte-123`; depois `outra-senha`. | Hash não é texto puro; senha correta confere e senha incorreta não confere. |
| AUTH-002 | Usuária ativa existe com senha válida e papel único de administradora. | 1. Autenticar com e-mail não normalizado. 2. Validar o token devolvido. | E-mail ` ANA@LIRA.COM `; senha `Senha-123`; id 12. | E-mail é normalizado; login retorna sessão e JWT válido para usuário 12 e papel `ADMINISTRADOR`. |
| AUTH-003 | Busca simulada não encontra a conta. | 1. Tentar autenticar. 2. Conferir o erro e a mensagem. | E-mail `ausente@lira.com`; senha `senha`. | Erro genérico `CREDENCIAIS_INVALIDAS`, sem diferenciar conta inexistente. |
| AUTH-004 | Usuária existe, mas está inativa; senha informada é correta. | 1. Tentar autenticar. 2. Conferir o erro. | Conta Ana; status `INATIVO`; senha `Senha-123`. | Erro `CONTA_INATIVA`; não emite sessão. |
| AUTH-005 | JWT configurado para o ambiente Jest. | 1. Gerar token temporário de seleção. 2. Validar o token. | Id de usuário 12. | Payload válido com tipo `selecao_pendente` e id 12. |
| AUTH-006 | JWT configurado para o ambiente Jest. | 1. Validar duas strings que não são JWTs válidos. | `token.inválido`; `not-a-valid-jwt`. | As duas entradas são rejeitadas como tokens inválidos. |
| AUTH-007 | Convite TUTOR ativo para turma 5; não existe conta com o novo e-mail; transação e persistência são simuladas. | 1. Cadastrar pelo convite. 2. Conferir normalização, criação da conta e vínculo. 3. Conferir atualização do convite. | Código ` tut-abc234 `; e-mail ` NOVA@LIRA.COM `; nome ` Nova `; senha `Senha-123`. | Cria usuário com e-mail/nome normalizados, associa tutor à turma 5 e consome o convite na transação. |
| AUTH-008 | Convite encontrado, mas com data de expiração passada. | 1. Tentar cadastro via convite. 2. Conferir erro e ausência de criação de usuário. | Código `TUT-ABC234`; e-mail `nova@lira.com`; data de expiração no passado. | Erro `CONVITE_EXPIRADO`; não cria conta. |

### 3.4 Elaboração e submissão de redações — `redacoes.test.ts`

| ID | Pré-condições | Passos | Entradas | Resultado esperado |
|---|---|---|---|---|
| RED-001 | Redação pertence ao aluno 9; V1 corrigida e V2 é o rascunho mais recente. | 1. Solicitar salvamento automático. 2. Conferir qual versão foi atualizada. | Redação 3; novo conteúdo `Rascunho salvo`. | Atualiza somente o conteúdo da V2, id 21. |
| RED-002 | Redação pertence ao aluno 9; versão atual já foi enviada. | 1. Tentar salvar novo conteúdo. 2. Conferir erro e ausência de atualização. | Redação 3; conteúdo `alteração`; status `ENVIADA`. | Erro `VERSAO_BLOQUEADA`; conteúdo não é atualizado. |
| RED-003 | Redação pertence ao aluno 9. | 1. Aluno 10 tenta salvar nela. 2. Conferir erro de autorização. | Aluno solicitante 10; redação 3 de aluno 9. | Erro `SEM_PERMISSAO`; nenhuma edição autorizada. |
| RED-004 | Redação pertence ao aluno 9; versão atual está em rascunho; não há tarefa com prazo vencido. | 1. Enviar a versão. 2. Conferir a mudança de status na transação. | V1 com oito linhas não vazias. | Status passa para `ENVIADA` e evento de envio é registrado. |
| RED-005 | Redação pertence ao aluno 9; versão atual está em rascunho. | 1. Tentar enviar o conteúdo. 2. Conferir erro e ausência de transação. | V1 com uma linha. | Erro `LIMITE_LINHAS_MINIMO`; não envia. |
| RED-006 | Redação pertence ao aluno 9; V1 está em `REESCRITA_SOLICITADA`; ainda não existe V2. | 1. Solicitar criação da reescrita. 2. Conferir criação da V2 e atualização da V1. | Redação 3; V1 id 20. | Cria V2 vazia em `RASCUNHO` e retorna V1 a `CORRIGIDA`. |
| RED-007 | Redação já possui V1 e V2. | 1. Solicitar nova reescrita. 2. Conferir erro e ausência de transação. | Redação 3 com V2 existente. | Erro `LIMITE_REESCRITA`; RN05 impede criar uma segunda V2. |

### 3.5 Correção de redações — `correcoes.test.ts`

| ID | Pré-condições | Passos | Entradas | Resultado esperado |
|---|---|---|---|---|
| COR-001 | Versão 20 está enviada e pertence a aluno tutorado pelo tutor 7; fluxo avaliativo. | 1. Criar correção. 2. Verificar soma, anotação, status e atualização da versão. | Notas C1–C5: 200, 160, 120, 80 e 40; comentários preenchidos; texto `Texto com erro.`; anotação válida das posições 10–13. | Soma total 600; anotação é criada; aprovação fica pendente e versão passa a `EM_REVISAO_FINAL`. |
| COR-002 | Versão enviada pertence ao tutor 7. | 1. Tentar criar correção com nota inválida. 2. Confirmar que não persiste. | C1 = 210; demais competências = 0. | Erro `NOTA_INVALIDA`; nenhuma transação de persistência. |
| COR-003 | Versão enviada pertence ao tutor 7; notas estão no intervalo permitido. | 1. Tentar criar correção com comentário obrigatório vazio. 2. Conferir validação. | Comentário de C3 = espaços; demais comentários preenchidos. | Erro de comentário obrigatório; correção não é criada. |
| COR-004 | Versão enviada contém o texto `Texto.` e pertence ao tutor 7. | 1. Informar anotação com trecho que não corresponde às posições. 2. Conferir erro. | Posições 0–3; trecho informado `abc`. | Erro `ANOTACAO_INVALIDA`; anotação não é persistida. |
| COR-005 | Correção 30 está pendente; pertence à versão 20; administrador 1 pode aprovar. | 1. Solicitar aprovação. 2. Conferir a correção e a versão atualizadas na transação. | Administrador 1; correção 30; versão 20. | Correção passa a `APROVADA`; versão passa a `CORRIGIDA`. |
| COR-006 | Correção 30 já está aprovada. | 1. Solicitar aprovação novamente. 2. Conferir erro e ausência de transação. | Administrador 1; correção 30 em `APROVADA`. | Erro `STATUS_INVALIDO`; não aprova novamente. |

### 3.6 Identificação, classificação e resultado unitário

As pré-condições, passos, entradas e resultados esperados de cada ID estão
detalhados nas tabelas das seções 3.1–3.5. A tabela abaixo registra cada caso
unitário individualmente, incluindo o resultado observado nas asserções do
Jest e o status. Nos casos negativos, o resultado obtido inclui a rejeição
esperada e a ausência da operação proibida.

| ID | Nome do teste | Função/serviço | Tipo | Resultado obtido na execução | Status |
|---|---|---|---|---|---|
| TUR-001 | Criação com foco padrão | `criarTurma` | Positivo | Retornou id 8 e foco `ENEM`; persistência recebeu nome, ano e foco padrão. | Aprovado |
| TUR-002 | Nome e ano duplicados | `criarTurma` | Negativo | Rejeitou com `TURMA_DUPLICADA` (409); não chamou a criação. | Aprovado |
| TUR-003 | Listagem e agregação de vínculos | `listarTurmas` | Positivo | Retornou a turma id 4 com 2 tutores e 5 alunos agregados. | Aprovado |
| TUR-004 | Arquivamento de turma ativa | `arquivarTurma` / `atualizarTurma` | Positivo | Retornou status `ARQUIVADA` e atualizou a turma id 4. | Aprovado |
| TUR-005 | Arquivamento repetido | `arquivarTurma` / `atualizarTurma` | Borda | Rejeitou com `TURMA_JA_ARQUIVADA`; não chamou a atualização. | Aprovado |
| TUR-006 | Arquivamento de turma ausente | `arquivarTurma` / `atualizarTurma` | Negativo | Rejeitou com `TURMA_NAO_ENCONTRADA`; não chamou a atualização. | Aprovado |
| CONV-001 | Geração de convite de tutor | `gerarConviteTutor` | Positivo | Gerou código no formato esperado, expiração futura e limite de 2 usos. | Aprovado |
| CONV-002 | Usuário sem papel administrador | `gerarConviteTutor` | Negativo | Rejeitou com `SEM_PERMISSAO`; não criou convite. | Aprovado |
| CONV-003 | Convite para turma inativa | `gerarConviteTutor` | Negativo | Rejeitou com `TURMA_INATIVA`; não criou convite. | Aprovado |
| CONV-004 | Quantidade de usos além do limite | `gerarConviteTutor` | Borda | Rejeitou 7 usos com `DADOS_INVALIDOS`; não consultou nem criou convite. | Aprovado |
| CONV-005 | Consulta normalizada de convite | `consultarDetalhesConvite` | Positivo | Consultou o código normalizado e retornou 1 vaga restante, sem lotação ou expiração. | Aprovado |
| CONV-006 | Código inexistente | `consultarDetalhesConvite` | Negativo | Rejeitou com `CONVITE_NAO_ENCONTRADO` (404). | Aprovado |
| CONV-007 | Vínculo de aluno e atualização de usos | `participarComoAluno` | Positivo | Criou vínculo do aluno 22 com tutor 7 e incrementou usos do convite na transação. | Aprovado |
| CONV-008 | Perfil Tutor usando convite de aluno | `participarComoAluno` | Negativo | Rejeitou com `PERFIL_INCOMPATIVEL`; não criou vínculo de aluno. | Aprovado |
| AUTH-001 | Hash e comparação bcrypt | `gerarHashSenha` / `conferirSenha` | Positivo | Hash diferiu da senha em texto puro; senha correta conferiu e senha incorreta não conferiu. | Aprovado |
| AUTH-002 | Login com papel único | `autenticar` / `verificarToken` | Positivo | Normalizou o e-mail; autenticou a conta e validou token com usuário e papel corretos. | Aprovado |
| AUTH-003 | Credenciais não encontradas | `autenticar` | Negativo | Rejeitou com `CREDENCIAIS_INVALIDAS` e mensagem genérica. | Aprovado |
| AUTH-004 | Conta inativa | `autenticar` | Negativo | Rejeitou com `CONTA_INATIVA`; não criou sessão. | Aprovado |
| AUTH-005 | Token temporário de seleção de papel | `gerarTokenSelecaoPendente` / `verificarToken` | Positivo | Validou token com tipo `selecao_pendente` e id 12. | Aprovado |
| AUTH-006 | Token malformado/assinatura inválida | `verificarToken` | Negativo | Rejeitou tokens inválidos e payload com papel inválido. | Aprovado |
| AUTH-007 | Cadastro e vínculo por convite | `cadastrarViaConvite` | Positivo | Criou usuário com dados normalizados, vínculo de tutor e consumo do convite na transação. | Aprovado |
| AUTH-008 | Cadastro com convite expirado | `cadastrarViaConvite` | Negativo | Rejeitou com `CONVITE_EXPIRADO`; não criou usuário. | Aprovado |
| RED-001 | Autosave da versão atual | `salvarRascunho` | Positivo | Atualizou o conteúdo da versão 2, id 21, que era o rascunho mais recente. | Aprovado |
| RED-002 | Autosave após envio | `salvarRascunho` | Negativo | Rejeitou com `VERSAO_BLOQUEADA`; não atualizou o conteúdo. | Aprovado |
| RED-003 | Autosave por outro aluno | `salvarRascunho` | Negativo | Rejeitou com `SEM_PERMISSAO` para aluno diferente do proprietário. | Aprovado |
| RED-004 | Envio com mínimo de linhas | `enviarVersao` | Positivo | Enviou a versão; persistência foi chamada com status `ENVIADA`. | Aprovado |
| RED-005 | Envio abaixo do mínimo | `enviarVersao` | Borda | Rejeitou com `LIMITE_LINHAS_MINIMO`; não iniciou a transação de envio. | Aprovado |
| RED-006 | Criação da reescrita única | `criarReescrita` | Positivo | Criou V2 vazia em `RASCUNHO` e atualizou o estado da V1. | Aprovado |
| RED-007 | Tentativa de segunda reescrita (RN05) | `criarReescrita` | Negativo | Rejeitou com `LIMITE_REESCRITA`; não criou versão adicional. | Aprovado |
| COR-001 | Soma das competências e marcação de erro | `criarCorrecao` | Positivo | Calculou total 600, criou anotação e deixou correção pendente de aprovação. | Aprovado |
| COR-002 | Nota superior ao máximo | `criarCorrecao` | Negativo | Rejeitou com `NOTA_INVALIDA`; não persistiu correção. | Aprovado |
| COR-003 | Comentário obrigatório ausente | `criarCorrecao` | Negativo | Rejeitou comentário vazio; não persistiu correção. | Aprovado |
| COR-004 | Trecho da anotação incompatível | `criarCorrecao` | Negativo | Rejeitou com `ANOTACAO_INVALIDA`; não persistiu a anotação. | Aprovado |
| COR-005 | Aprovação de correção avaliativa | `aprovarCorrecao` | Positivo | Alterou correção para `APROVADA` e versão para `CORRIGIDA`. | Aprovado |
| COR-006 | Aprovação duplicada | `aprovarCorrecao` | Borda | Rejeitou com `STATUS_INVALIDO`; não aprovou novamente. | Aprovado |

## 4. Relatório da execução

### 4.1 Execução automatizada realizada

- **Data:** 02/11/2026
- **Diretório:** `backend/`
- **Comando:** `npm run test:coverage`
- **Resultado geral:** aprovado
- **Suítes aprovadas:** 5 de 5
- **Testes aprovados:** 35 de 35
- **Suítes reprovadas:** 0
- **Testes reprovados:** 0
- **Snapshots:** nenhum

| Suíte executada | Arquivo | Resultado |
|---|---|---|
| Gerenciamento de turmas | `src/services/turmas.test.ts` | Aprovada |
| Convites e vínculos | `src/services/convites.test.ts` | Aprovada |
| Autenticação e cadastro | `src/services/auth.test.ts` | Aprovada |
| Redações | `src/services/redacoes.test.ts` | Aprovada |
| Correções | `src/services/correcoes.test.ts` | Aprovada |

### 4.2 Cobertura medida

O relatório do Jest incluiu os seguintes serviços:

| Métrica | Cobertura |
|---|---:|
| Statements | 52,99% |
| Branches | 34,39% |
| Functions | 57,29% |
| Lines | 53,46% |

Esses percentuais referem-se somente aos serviços selecionados na configuração
Jest. Não representam a cobertura de todo o backend ou frontend.

### 4.3 Integração e interface

#### Integração HTTP — backend + MySQL isolado

Foram realizadas 33 verificações HTTP na API em sequência, usando sessões de
Administrador, Tutor e Aluno criadas no banco isolado. Os códigos abaixo são os
resultados observados na execução final.

| ID | Verificação executada | Resultado observado | Status |
|---|---|---|---|
| API-01 | Login administrativo | HTTP 200; sessão criada | Aprovado |
| API-02 | Listagem de turmas sem sessão | HTTP 401 | Aprovado |
| API-03 | Login com senha incorreta | HTTP 401 | Aprovado |
| API-04 | Listagem de turmas como administrador | HTTP 200; lista retornada | Aprovado |
| API-05 | Criação de turma | HTTP 201; id retornado | Aprovado |
| API-06 | Repetição da turma com mesmo nome/ano | HTTP 409 | Aprovado |
| API-07 | Consulta da lista após criar turma | HTTP 200; turma presente | Aprovado |
| API-08 | Arquivamento da turma | HTTP 200; status `ARQUIVADA` | Aprovado |
| API-09 | Arquivamento repetido | HTTP 409 | Aprovado |
| API-10 | Reativação da turma | HTTP 200; status `ATIVA` | Aprovado |
| API-11 | Geração de convite de Tutor | HTTP 201; código `TUT-` retornado | Aprovado |
| API-12 | Consulta pública do convite | HTTP 200; papel `TUTOR` | Aprovado |
| API-13 | Cadastro de Tutor pelo convite | HTTP 201; vínculo criado | Aprovado |
| API-14 | Login do Tutor cadastrado | HTTP 200; papel `TUTOR` | Aprovado |
| API-15 | Geração de convite de Aluno | HTTP 201; convite de aluno retornado | Aprovado |
| API-16 | Cadastro de Aluno pelo convite | HTTP 201; vínculo criado | Aprovado |
| API-17 | Login do Aluno cadastrado | HTTP 200; papel `ALUNO` | Aprovado |
| API-18 | Aluno tenta criar turma administrativa | HTTP 403 | Aprovado |
| API-19 | Aluno consulta banco de temas | HTTP 200; temas retornados | Aprovado |
| API-20 | Criação de rascunho de treino | HTTP 201; versão em `RASCUNHO` | Aprovado |
| API-21 | Autosave do rascunho | HTTP 200; conteúdo atualizado | Aprovado |
| API-22 | Envio de redação com oito linhas | HTTP 200; versão `ENVIADA` | Aprovado |
| API-23 | Correção com nota 210 | HTTP 400; nota inválida recusada | Aprovado |
| API-24 | Correção de treino | HTTP 201; total 800 e status `LIBERADA` | Aprovado |
| API-25 | Tutor solicita reescrita | HTTP 200; V1 marcada para reescrita | Aprovado |
| API-26 | Aluno cria V2 | HTTP 201; versão 2 criada | Aprovado |
| API-27 | Aluno tenta criar outra V2 (RN05) | HTTP 409 | Aprovado |
| API-28 | Tutor cria tarefa avaliativa | HTTP 201; tarefa criada | Aprovado |
| API-29 | Aluno cria redação avaliativa | HTTP 201; rascunho vinculado à tarefa | Aprovado |
| API-30 | Autosave e envio avaliativo | HTTP 200 nas duas operações | Aprovado |
| API-31 | Tutor corrige redação avaliativa | HTTP 201; `PENDENTE_APROVACAO` | Aprovado |
| API-32 | Administrador aprova correção | HTTP 200; status `APROVADA` | Aprovado |
| API-33 | Aluno consulta redação aprovada | HTTP 200; redação acessível | Aprovado |

**Resultado da integração:** 33 aprovados; 0 reprovados.

#### Teste funcional/manual na interface

Foi usado o navegador em `http://localhost:3000`, conectado ao backend que
apontava para o schema de teste. O tema criado e excluído abaixo era descartável
e não tinha tarefas ou redações relacionadas.

| ID | Passos e dados de teste | Resultado observado | Status |
|---|---|---|---|
| UI-01 | Abrir `/login`. | Página de login renderizada; HTTP 200. | Aprovado |
| UI-02 | Entrar com a conta administrativa de fixture do banco de teste. | Autenticação aceita e redirecionamento para Gestão de Turmas. | Aprovado |
| UI-03 | Abrir `/admin/temas`. | Banco de temas carregou e exibiu o tema de fixture. | Aprovado |
| UI-04 | Selecionar “Novo tema”, informar `Tema QA interface 20261102211431` e cadastrar. | Toast de sucesso; tema apareceu na lista e a contagem aumentou. | Aprovado |
| UI-05 | Excluir o tema QA e confirmar “Excluir definitivamente”. | Toast de sucesso; tema deixou de aparecer e a contagem voltou ao valor inicial. | Aprovado |

**Resultado da interface:** 5 verificações aprovadas; 0 reprovadas.

#### Observações e resultado consolidado

- **Migrações:** 9 de 9 aplicadas ao banco de teste; estado final atualizado.
- **Unitários:** 35 de 35 aprovados.
- **Integração HTTP:** 33 de 33 aprovados.
- **Interface:** 5 de 5 aprovados.
- **Total de verificações unitárias, HTTP e interface:** 73 aprovadas de 73.
- **Build TypeScript:** `npm run build` concluído com sucesso.
- **Importador de questões:** foi corrigido para não executar sua rotina de CLI
  quando importado pelo `seed.ts`; o carregamento sem execução automática e o
  build foram verificados.
- **Preparação do banco:** a primeira execução do seed criou as fixtures, mas
  terminou com código de erro porque o importador de questões era iniciado
  indevidamente durante a importação do módulo. A rotina foi corrigida depois;
  o seed não foi executado novamente para evitar duplicar os dados de teste.
- **Sequência de integração:** a primeira tentativa exploratória enviou uma
  correção antes do envio da redação e foi interrompida nessa validação de
  estado. A ordem foi corrigida e a execução final de 33 verificações passou.
- **Persistência:** `sistema_redacoes_test` foi mantido separado; o banco
  principal não foi usado pelas verificações de integração e interface. O
  schema de teste contém os dados de fixture e integração criados nesta
  execução.
- **Estado prévio do banco principal:** em uma etapa anterior, a coluna
  `tema.imagem_url` foi adicionada diretamente para corrigir o carregamento de
  temas. O histórico de migrations do banco principal continua sem baseline;
  `prisma migrate deploy` retornou `P3005`. A alteração direta não foi aplicada
  ao banco de teste como substituto de migration, e o banco principal não foi
  usado nesta execução.

## 5. Como repetir e atualizar este relatório

No PowerShell:

```powershell
cd C:\Users\artur\Downloads\Lira_tutoria\backend
npm run test:coverage
```

Esse comando repete os testes unitários e gera cobertura. Os testes de
integração requerem iniciar o backend com `DATABASE_URL` apontando para
`sistema_redacoes_test` e repetir os fluxos HTTP registrados acima; os testes de
interface requerem o frontend e backend de teste ativos. Não aponte esses testes
para o banco pessoal.

Ao registrar uma nova execução, atualize data, ambiente, totais, status e
resultados observados. Se algum teste falhar, registre o identificador, a
resposta real e o erro; não o marque como aprovado. Os relatórios de cobertura
são gerados automaticamente em `backend/coverage/` e não precisam ser
adicionados ao Git.
