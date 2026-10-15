# Guia de testes da API no Insomnia

Este documento descreve a ordem recomendada para testar a API LIRA Tutoria
usando a collection
[`LIRA_TUTORIA.yaml`](./insomnia/LIRA_TUTORIA.yaml).

## 1. Preparação

### 1.1 Iniciar o backend

Em um terminal:

```powershell
cd C:\LIRA\backend
npm run dev
```

Mantenha o terminal aberto. Ele exibirá erros de execução e, em
desenvolvimento, o link de recuperação de senha quando nenhum serviço de
e-mail estiver configurado.

### 1.2 Importar a collection

1. Abra o Insomnia.
2. Clique em **Import/Export**.
3. Escolha **Import Data > From File**.
4. Selecione `C:\LIRA\docs\insomnia\LIRA_TUTORIA.yaml`.
5. Abra a collection `LIRA_TUTORIA`.
6. Use `http://localhost:3333` como URL-base.

As requisições usam IDs de exemplo (`1`, `2`) e tokens de exemplo. Substitua
esses valores pelos IDs retornados pelo seu banco.

### 1.3 Tokens

Para uma rota protegida:

1. Execute a requisição de login do perfil necessário.
2. Copie o campo `token` da resposta.
3. Na requisição seguinte, abra **Auth > Bearer Token**.
4. Cole somente o token, sem escrever `Bearer`.

Use nomes separados para não misturar permissões:

```text
TOKEN_ADMIN
TOKEN_TUTOR
TOKEN_ALUNO
```

Quando a resposta do login contiver `tokenPendente`, execute
`05-PAPEIS-E-SESSAO > Selecionar Papel` antes de usar as demais rotas.

### 1.4 Formato das respostas de erro

Os erros normalmente seguem este formato:

```json
{
  "erro": "Mensagem explicativa",
  "codigo": "CODIGO_DO_ERRO"
}
```

Os principais códigos HTTP são:

```text
200 OK       consulta ou atualização concluída
201 Created  registro criado
204 No Content exclusão concluída
400 Bad Request payload ou parâmetro inválido
401 Unauthorized token ausente ou inválido
403 Forbidden papel sem permissão ou recurso fora do escopo
404 Not Found registro inexistente
409 Conflict regra de negócio impedindo a operação
500 Internal Server Error erro inesperado
```

---

## 00-HEALTH

### 00.01 — Verificar API

**Requisição**

```http
GET http://localhost:3333/health
```

Não use autenticação.

**Resposta esperada:** `200 OK`

```json
{
  "status": "ok",
  "banco": "conectado"
}
```

Se receber `500` ou o banco estiver desconectado, corrija o backend antes de
continuar.

---

## 01-AUTENTICACAO

Execute os três logins para obter os tokens dos três perfis.

### 01.01 — Login de administrador

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "admin@lira.com",
  "senha": "SENHA_DO_SEED"
}
```

**Esperado:** `200 OK`, com token de sessão e
`papelAtivo: "ADMINISTRADOR"`.

### 01.02 — Login de tutor

Use a mesma requisição com:

```json
{
  "email": "tutor@lira.com",
  "senha": "SENHA_DO_SEED"
}
```

**Esperado:** `200 OK`, com token de tutor.

### 01.03 — Login de aluno

```json
{
  "email": "aluno@lira.com",
  "senha": "SENHA_DO_SEED"
}
```

**Esperado:** `200 OK`, com token de aluno.

### 01.04 — Solicitar recuperação de senha

```http
POST /auth/esqueci-senha
Content-Type: application/json
```

```json
{
  "email": "aluno@lira.com"
}
```

**Esperado:** `200 OK` com mensagem genérica. Sem `BREVO_API_KEY` e sem
`SMTP_HOST`, copie o link exibido no terminal do backend.

### 01.05 — Redefinir senha

```http
POST /auth/redefinir-senha
Content-Type: application/json
```

```json
{
  "token": "TOKEN_COPIADO_DO_EMAIL_OU_TERMINAL",
  "novaSenha": "NovaSenha123"
}
```

**Esperado:** `200 OK`.

Repita a requisição com o mesmo token. **Esperado:** `400` e
`codigo: "LINK_INVALIDO"`.

### 01.06 — Validar senha inválida

Envie uma senha com menos de oito caracteres. **Esperado:** `400` e
`codigo: "SENHA_FRACA"`.

---

## 02-CADASTRO

### 02.01 — Cadastrar tutor via convite

Primeiro gere um convite em `03-CONVITES-TUTOR` e copie `codigo`.

```http
POST /auth/cadastro
Content-Type: application/json
```

```json
{
  "codigo": "COLE_O_CODIGO_TUTOR",
  "nome": "Tutor de Teste",
  "email": "tutor.teste@lira.com",
  "senha": "Senha123"
}
```

**Esperado:** `201 Created` ou `200 OK`, com os dados do usuário criado.

### 02.02 — Cadastrar aluno via convite

Gere antes um convite de aluno em `04-CONVITES-ALUNO`.

```json
{
  "codigo": "COLE_O_CODIGO_ALUNO",
  "nome": "Aluno de Teste",
  "email": "aluno.teste@lira.com",
  "senha": "Senha123"
}
```

**Esperado:** usuário criado com papel de aluno.

Reutilizar um convite já usado deve retornar `409`.

---

## 03-CONVITES-TUTOR

### 03.01 — Gerar convite de tutor

Use `TOKEN_ADMIN`:

```http
POST /turmas/1/convites/tutor
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `201 Created`, com um `codigo` no formato `TUT-...`.

### 03.02 — Listar convites

```http
GET /convites
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`, com lista de convites e validade.

Filtro opcional:

```http
GET /convites?turmaId=1
```

Tutor ou aluno usando essas rotas deve receber `403`.

---

## 04-CONVITES-ALUNO

### 04.01 — Gerar convite de aluno

Use `TOKEN_TUTOR`:

```http
POST /tutor/convites/aluno
Authorization: Bearer TOKEN_TUTOR
```

**Esperado:** `201 Created`, com código `ALU-...`.

O convite vale por 30 dias e só pode ser usado uma vez.

---

## 05-PAPEIS-E-SESSAO

### 05.01 — Participar como aluno

Use uma conta de tutor que possa participar como aluno:

```http
POST /auth/participar-como-aluno
Authorization: Bearer TOKEN_TUTOR
Content-Type: application/json
```

```json
{
  "codigo": "ALU-ABC123"
}
```

**Esperado:** `200 OK`, com `papelAtribuido: "ALUNO"`.

### 05.02 — Selecionar papel

Use o `tokenPendente` retornado no login:

```http
POST /auth/selecionar-papel
Content-Type: application/json
```

```json
{
  "tokenPendente": "TOKEN_PENDENTE",
  "papel": "TUTOR"
}
```

**Esperado:** `200 OK`, com token de sessão no papel escolhido.

### 05.03 — Consultar sessão

```http
GET /auth/me
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`, com `usuario`, `papelAtivo` e
`papeisDisponiveis`.

---

## 06-TURMAS

### 06.01 — Criar turma

Use `TOKEN_ADMIN`:

```http
POST /turmas
Content-Type: application/json
Authorization: Bearer TOKEN_ADMIN
```

```json
{
  "nome": "3º Ano A",
  "anoLetivo": 2026,
  "vestibularFoco": "ENEM"
}
```

**Esperado:** `201 Created`. Copie o ID da turma.

### 06.02 — Listar turmas

```http
GET /turmas
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`.

### 06.03 — Consultar turma

```http
GET /turmas/ID_TURMA
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`, com dados da turma.

### 06.04 — Atualizar turma

```http
PATCH /turmas/ID_TURMA
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

```json
{
  "nome": "3º Ano A - Manhã",
  "vestibularFoco": "ENEM"
}
```

**Esperado:** `200 OK`.

### 06.05 — Arquivar turma

Execute somente depois dos demais testes que dependam da turma:

```http
POST /turmas/ID_TURMA/arquivar
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`, com status `ARQUIVADA`.

---

## 07-TEMAS

### 07.01 — Listar temas

```http
GET /temas
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`.

### 07.02 — Consultar tema

```http
GET /temas/1
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`.

### 07.03 — Criar tema

```http
POST /temas
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

```json
{
  "tituloTema": "Desafios da educação digital no Brasil",
  "textoMotivador": "Texto motivador para o teste.",
  "origem": "ENEM"
}
```

**Esperado:** `201 Created`. Copie `idTema`.

### 07.04 — Atualizar tema

```http
PATCH /temas/ID_TEMA
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

```json
{
  "tituloTema": "Tema atualizado",
  "textoMotivador": "Texto motivador atualizado.",
  "origem": "BANCO_PROPRIO"
}
```

**Esperado:** `200 OK`.

### 07.05 — Excluir tema

```http
DELETE /temas/ID_TEMA
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `204 No Content`, desde que o tema não esteja em uso.

---

## 08-TAREFAS

### 08.01 — Listar e consultar tarefas

```http
GET /tarefas
GET /tarefas/1
Authorization: Bearer TOKEN_ALUNO
```

**Esperado:** `200 OK`.

### 08.02 — Criar tarefa avaliativa

Use `TOKEN_TUTOR`:

```http
POST /tarefas
Authorization: Bearer TOKEN_TUTOR
Content-Type: application/json
```

```json
{
  "idTurma": 1,
  "idTema": 1,
  "tituloTarefa": "Redação da semana",
  "descricao": "Produza uma redação dissertativo-argumentativa.",
  "prazoEntrega": "2026-12-01T23:59:00.000Z",
  "modalidade": "AVALIATIVA"
}
```

**Esperado:** `201 Created`.

### 08.03 — Criar tarefa geral

Use `TOKEN_ADMIN` e troque `modalidade` para `GERAL`.

**Esperado:** `201 Created`.

### 08.04 — Atualizar tarefa

```http
PATCH /tarefas/1
Authorization: Bearer TOKEN_ADMIN_OU_TUTOR
Content-Type: application/json
```

Envie os campos que deseja alterar. **Esperado:** `200 OK`.

### 08.05 — Replicar tarefa geral

Use `TOKEN_TUTOR`:

```http
POST /tarefas/1/replicar
Authorization: Bearer TOKEN_TUTOR
Content-Type: application/json
```

```json
{
  "idTurma": 2,
  "prazoEntrega": "2026-12-15T23:59:00.000Z"
}
```

**Esperado:** `201 Created`.

### 08.06 — Adicionar anexo

```http
POST /tarefas/1/anexos
Authorization: Bearer TOKEN_ADMIN_OU_TUTOR
Content-Type: application/json
```

```json
{
  "nomeArquivo": "material.pdf",
  "url": "https://exemplo.com/material.pdf",
  "tipoArquivo": "application/pdf"
}
```

**Esperado:** `201 Created`. Copie `idAnexo`.

### 08.07 — Remover anexo

```http
DELETE /tarefas/1/anexos/ID_ANEXO
Authorization: Bearer TOKEN_ADMIN_OU_TUTOR
```

**Esperado:** `204 No Content`.

### 08.08 — Excluir tarefa

```http
DELETE /tarefas/ID_TAREFA
Authorization: Bearer TOKEN_ADMIN_OU_TUTOR
```

**Esperado:** `204 No Content` quando a regra de negócio permitir.

---

## 09-REDACOES

Execute os testes de redação na sequência, usando `TOKEN_ALUNO`, salvo quando
indicado.

### 09.01 — Listar redações

```http
GET /redacoes
Authorization: Bearer TOKEN_ALUNO
```

**Esperado:** `200 OK`.

### 09.02 — Criar rascunho de treino

```http
POST /redacoes
Authorization: Bearer TOKEN_ALUNO
Content-Type: application/json
```

```json
{
  "tipoFluxo": "TREINO",
  "idTema": 1,
  "conteudoTexto": ""
}
```

**Esperado:** `201 Created`. Copie `idRedacao`.

### 09.03 — Autosave

```http
PATCH /redacoes/ID_REDACAO/rascunho
Authorization: Bearer TOKEN_ALUNO
Content-Type: application/json
```

```json
{
  "conteudoTexto": "Meu texto parcial para teste."
}
```

**Esperado:** `200 OK`.

### 09.04 — Consultar redação

```http
GET /redacoes/ID_REDACAO
Authorization: Bearer TOKEN_ALUNO
```

**Esperado:** `200 OK`, com a versão e o status `RASCUNHO`.

### 09.05 — Enviar redação

```http
POST /redacoes/ID_REDACAO/enviar
Authorization: Bearer TOKEN_ALUNO
```

Preencha antes um conteúdo não vazio. **Esperado:** `200 OK`, status
`ENVIADA`.

### 09.06 — Fila de correção do tutor

Use `TOKEN_TUTOR`:

```http
GET /redacoes/aguardando-correcao
Authorization: Bearer TOKEN_TUTOR
```

**Esperado:** `200 OK`, contendo a versão enviada do tutorado.

### 09.07 — Criar redação avaliativa

```json
{
  "tipoFluxo": "AVALIATIVA",
  "idTarefa": 1,
  "conteudoTexto": ""
}
```

**Esperado:** `201 Created`. A tarefa deve estar ativa e pertencer à turma
do aluno.

### 09.08 — Criar reescrita

Só execute depois de o tutor solicitar reescrita:

```http
POST /redacoes/ID_REDACAO/reescrita
Authorization: Bearer TOKEN_ALUNO
```

**Esperado:** `201 Created`, com a versão 2.

### 09.09 — Solicitar reescrita

Use `TOKEN_TUTOR`:

```http
POST /redacoes/ID_REDACAO/solicitar-reescrita
Authorization: Bearer TOKEN_TUTOR
```

**Esperado:** `200 OK`, versão em `AGUARDANDO_REESCRITA`.

Outro tutor deve receber `403`.

### 09.10 — Excluir rascunho

Crie outro rascunho e execute:

```http
DELETE /redacoes/ID_RASCUNHO
Authorization: Bearer TOKEN_ALUNO
```

**Esperado:** `204 No Content`. Uma redação enviada deve retornar `409`.

---

## 10-CORRECOES

### 10.01 — Listar correções pendentes

Tutor:

```http
GET /correcoes/pendentes
Authorization: Bearer TOKEN_TUTOR
```

Administração:

```http
GET /correcoes/pendentes
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`. Para o tutor são correções próprias; para o
administrador são correções aguardando aprovação.

### 10.02 — Criar correção

Use `TOKEN_TUTOR` e o `idVersao` de uma versão enviada:

```http
POST /redacoes/correcoes
Authorization: Bearer TOKEN_TUTOR
Content-Type: application/json
```

```json
{
  "idVersao": 1,
  "notaComp1": 160,
  "notaComp2": 180,
  "notaComp3": 160,
  "notaComp4": 180,
  "notaComp5": 160,
  "comentarioComp1": "Revise a norma-padrão.",
  "comentarioComp2": "A tese está relacionada ao tema.",
  "comentarioComp3": "Desenvolva melhor os argumentos.",
  "comentarioComp4": "Varie os conectivos.",
  "comentarioComp5": "Detalhe a proposta de intervenção.",
  "parecerGeral": "Boa organização argumentativa.",
  "recadoAdmin": "Mensagem interna para a Administração."
}
```

**Esperado:** `201 Created`, com `statusAprovacao:
"PENDENTE_APROVACAO"`.

### 10.03 — Consultar correção

```http
GET /correcoes/ID_CORRECAO
Authorization: Bearer TOKEN_TUTOR_OU_ADMIN
```

**Esperado:** `200 OK`. O aluno só consegue consultar depois da aprovação.

### 10.04 — Aprovar correção

Use `TOKEN_ADMIN`:

```http
POST /correcoes/ID_CORRECAO/aprovar
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`; em fluxo avaliativo, a correção fica visível ao
aluno e a versão fica `CORRIGIDA`.

### 10.05 — Solicitar ajuste

```http
POST /correcoes/ID_CORRECAO/solicitar-ajuste
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

```json
{
  "comentarioAjuste": "Revise a justificativa da competência 3."
}
```

**Esperado:** `200 OK`; a versão retorna à fila do tutor com
`AJUSTE_SOLICITADO`.

O campo antigo `recadoAdmin` continua aceito para compatibilidade.

---

## 11-QUESTOES-E-SIMULADOS

### 11.01 — Listar questões

```http
GET /questoes?limite=5
Authorization: Bearer TOKEN_ADMIN_OU_TUTOR_OU_ALUNO
```

**Esperado:** `200 OK`, sem expor o gabarito na listagem.

Filtros aceitos: `pagina`, `limite`, `vestibular`, `ano`,
`grauDificuldade`, `idAssunto`, `busca` e `status` (status para
administração).

### 11.02 — Criar questão

Use `TOKEN_ADMIN`:

```http
POST /questoes
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

```json
{
  "enunciado": "Qual alternativa apresenta a resposta correta?",
  "vestibular": "ENEM",
  "ano": 2024,
  "numeroQuestao": 45,
  "grauDificuldade": "MEDIA",
  "explicacaoGabarito": "Justificativa.",
  "idAssuntos": [1],
  "alternativas": [
    { "letraOpcao": "A", "textoAlternativa": "Opção A", "alternativaCorreta": false },
    { "letraOpcao": "B", "textoAlternativa": "Opção B", "alternativaCorreta": true },
    { "letraOpcao": "C", "textoAlternativa": "Opção C", "alternativaCorreta": false },
    { "letraOpcao": "D", "textoAlternativa": "Opção D", "alternativaCorreta": false },
    { "letraOpcao": "E", "textoAlternativa": "Opção E", "alternativaCorreta": false }
  ]
}
```

**Esperado:** `201 Created`. São obrigatórias cinco alternativas e exatamente
um gabarito.

### 11.03 — Consultar questão

```http
GET /questoes/ID_QUESTAO
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`.

### 11.04 — Editar questão

```http
PATCH /questoes/ID_QUESTAO
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

Use o mesmo formato da criação. **Esperado:** `200 OK`.

### 11.05 — Inativar e ativar questão

```http
POST /questoes/ID_QUESTAO/inativar
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`, com `status: "INATIVA"`.

Depois:

```http
POST /questoes/ID_QUESTAO/ativar
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`, com `status: "ATIVA"`.

Questões inativas não são selecionadas em novos simulados.

### 11.06 — Excluir questão

```http
DELETE /questoes/ID_QUESTAO
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `204 No Content` se a questão não estiver em uso. Se estiver
em simulado ou caderno de erros, o esperado é `409`.

### 11.07 — CRUD de assuntos

```http
GET /assuntos
POST /assuntos
PATCH /assuntos/ID_ASSUNTO
DELETE /assuntos/ID_ASSUNTO
```

Para criar ou editar:

```json
{
  "nomeAssunto": "Competência leitora"
}
```

`GET` retorna `200`, `POST` retorna `201`, `PATCH` retorna `200` e `DELETE`
retorna `204`. Use `TOKEN_ADMIN` nas operações de escrita.

### 11.08 — Criar simulado

Use `TOKEN_ALUNO`:

```http
POST /simulados
Authorization: Bearer TOKEN_ALUNO
Content-Type: application/json
```

```json
{
  "tipoSimulado": "PERSONALIZADO",
  "quantidade": 5,
  "vestibular": "ENEM",
  "ano": 2024,
  "grauDificuldade": "MEDIA",
  "idAssunto": 1
}
```

**Esperado:** `201 Created`. A quantidade deve estar entre 1 e 50.

### 11.09 — Listar e consultar simulados

```http
GET /simulados
GET /simulados/ID_SIMULADO
Authorization: Bearer TOKEN_ALUNO
```

**Esperado:** `200 OK`.

### 11.10 — Iniciar, responder e pausar

```http
POST /simulados/ID_SIMULADO/iniciar
Authorization: Bearer TOKEN_ALUNO
```

**Esperado:** `200 OK`, status `EM_ANDAMENTO`.

Responder:

```http
PATCH /simulados/ID_SIMULADO/respostas
Authorization: Bearer TOKEN_ALUNO
Content-Type: application/json
```

```json
{
  "idQuestao": 1,
  "resposta": "A"
}
```

**Esperado:** `200 OK`.

Pausar:

```http
POST /simulados/ID_SIMULADO/pausar
Authorization: Bearer TOKEN_ALUNO
```

**Esperado:** `200 OK`, com `tempoAcumuladoSeg` preenchido.

Chame `/iniciar` novamente. **Esperado:** simulado retomado sem zerar o
tempo acumulado.

### 11.11 — Finalizar e consultar resultado

```http
POST /simulados/ID_SIMULADO/finalizar
Authorization: Bearer TOKEN_ALUNO
```

**Esperado:** `200 OK`, com pontuação, respostas, `dataFim` e
`tempoGastoSeg`.

```http
GET /simulados/ID_SIMULADO/resultado
Authorization: Bearer TOKEN_ALUNO
```

**Esperado:** `200 OK`, com o resultado calculado.

### 11.12 — Caderno de erros e refazer

```http
GET /caderno-erros
Authorization: Bearer TOKEN_ALUNO
```

**Esperado:** `200 OK`.

Depois de finalizar um simulado com uma resposta errada:

```http
POST /caderno-erros/refazer
Authorization: Bearer TOKEN_ALUNO
Content-Type: application/json
```

```json
{
  "quantidade": 5
}
```

**Esperado:** `201 Created`, com um novo simulado `CADERNO_ERROS`.
Se o caderno estiver vazio, o esperado é `409` com
`codigo: "CADERNO_VAZIO"`.

---

## 11-CONTROLES-QUESTOES-SIMULADOS

Esta pasta contém requisições rápidas para testar os controles da seção
anterior:

1. Inativar questão — `POST /questoes/:idQuestao/inativar` — `200`.
2. Ativar questão — `POST /questoes/:idQuestao/ativar` — `200`.
3. Criar, editar e excluir assunto — `201`, `200`, `204`.
4. Adicionar anexo — `POST /tarefas/:idTarefa/anexos` — `201`.
5. Remover anexo — `DELETE /tarefas/:idTarefa/anexos/:idAnexo` — `204`.
6. Pausar simulado — `POST /simulados/:idSimulado/pausar` — `200`.

Use os IDs criados nas pastas anteriores.

---

## 12-ADMIN-USUARIOS-VINCULOS

Todas as requisições desta seção exigem `TOKEN_ADMIN`.

### 12.01 — Listar usuários

```http
GET /usuarios?papel=ALUNO&status=ATIVO&idTurma=1&busca=ana
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`, sem o hash de senha.

### 12.02 — Consultar usuário

```http
GET /usuarios/ID_USUARIO
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`.

### 12.03 — Alterar status

```http
PATCH /usuarios/ID_USUARIO/status
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

```json
{
  "status": "INATIVO"
}
```

**Esperado:** `200 OK`. O usuário inativado não consegue fazer login nem
usar uma sessão já emitida. Não é permitido inativar a própria conta:
`409`.

### 12.04 — Gerar link de redefinição

```http
POST /usuarios/ID_ALUNO/link-redefinicao
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `201 Created`, com `link` válido por uma hora. Para outra
conta administradora, **esperado:** `409`.

### 12.05 — Trocar tutor do aluno

```http
PATCH /alunos/ID_ALUNO/tutor
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

```json
{
  "idTutor": 2
}
```

**Esperado:** `200 OK`, com tutor anterior e novo. Tutor inativo ou turma
inativa devem retornar `409`.

### 12.06 — Trocar turma do tutor

```http
PATCH /tutores/ID_TUTOR/turma
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

```json
{
  "idTurma": 2
}
```

**Esperado:** `200 OK`, informando a turma anterior, a nova e os tutorados
afetados.

Tutor ou aluno usando qualquer rota desta seção deve receber `403`.

---

## 13-COMUNICADOS

### 13.01 — Enviar comunicado

Use `TOKEN_ADMIN` ou `TOKEN_TUTOR`:

```http
POST /comunicados
Authorization: Bearer TOKEN_ADMIN_OU_TUTOR
Content-Type: application/json
```

```json
{
  "tituloComunicado": "Aviso da semana",
  "mensagem": "A correção será liberada amanhã.",
  "idTurma": 1
}
```

**Esperado:** `201 Created`. O tutor só pode enviar para os próprios
tutorados.

### 13.02 — Listar recebidos

Use `TOKEN_TUTOR` ou `TOKEN_ALUNO`:

```http
GET /comunicados?naoLidos=true
Authorization: Bearer TOKEN_TUTOR_OU_ALUNO
```

**Esperado:** `200 OK`, somente com comunicados do usuário.

### 13.03 — Contar não lidos

```http
GET /comunicados/nao-lidos
Authorization: Bearer TOKEN_TUTOR_OU_ALUNO
```

**Esperado:** `200 OK`, com a quantidade de mensagens não lidas.

### 13.04 — Listar enviados

```http
GET /comunicados/enviados
Authorization: Bearer TOKEN_ADMIN_OU_TUTOR
```

**Esperado:** `200 OK`.

### 13.05 — Consultar comunicado

```http
GET /comunicados/ID_COMUNICADO
Authorization: Bearer TOKEN_ADMIN_OU_TUTOR_OU_ALUNO
```

**Esperado:** `200 OK` se o usuário possuir acesso; caso contrário, `403`
ou `404`, conforme a regra de escopo.

### 13.06 — Marcar como lido

```http
POST /comunicados/ID_COMUNICADO/lido
Authorization: Bearer TOKEN_TUTOR_OU_ALUNO
```

**Esperado:** `200 OK`. Consulte novamente `/comunicados/nao-lidos` e
confirme a redução da contagem.

---

## 14-INDICADORES

### 14.01 — Indicadores do aluno

```http
GET /indicadores/aluno
Authorization: Bearer TOKEN_ALUNO
```

**Esperado:** `200 OK`, com dados do próprio aluno. Tutor ou administrador
usando esta rota deve receber `403`.

### 14.02 — Lista de tutorados

```http
GET /indicadores/tutor/alunos?busca=ana
Authorization: Bearer TOKEN_TUTOR
```

**Esperado:** `200 OK`, somente tutorados do tutor autenticado.

### 14.03 — Desempenho em redações

```http
GET /indicadores/tutor/redacoes
Authorization: Bearer TOKEN_TUTOR
```

**Esperado:** `200 OK`, com indicadores de redações dos tutorados.

### 14.04 — Desempenho em simulados

```http
GET /indicadores/tutor/simulados
Authorization: Bearer TOKEN_TUTOR
```

**Esperado:** `200 OK`, com indicadores de simulados dos tutorados.

### 14.05 — Indicadores de um aluno

```http
GET /indicadores/alunos/ID_ALUNO
Authorization: Bearer TOKEN_ADMIN_OU_TUTOR
```

**Esperado:** `200 OK` para a Administração ou para o tutor responsável;
outro tutor deve receber `403`.

### 14.06 — Histórico de correções

```http
GET /indicadores/historico-correcoes?mes=2026-10&idTutor=2&idTurma=1&tipoFluxo=AVALIATIVA
Authorization: Bearer TOKEN_ADMIN_OU_TUTOR
```

**Esperado:** `200 OK`. O tutor só consulta suas próprias correções.

### 14.07 — Desempenho por turmas

```http
GET /indicadores/admin/turmas?idTurma=1
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`. Tutor ou aluno deve receber `403`.

### 14.08 — Desempenho por tutores

```http
GET /indicadores/admin/tutores
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK`, com ranking ou consolidação por tutor.

---

## 15-SESSAO

### 15.01 — Consultar usuário autenticado

```http
GET /auth/me
Authorization: Bearer TOKEN_ADMIN_OU_TUTOR_OU_ALUNO
```

**Esperado:** `200 OK`.

Remova o header `Authorization` e repita. **Esperado:** `401`.

Use um token inválido ou expirado. **Esperado:** `401`.

## Checklist final

- [ ] `00-HEALTH` retornou `200`.
- [ ] Os três logins retornaram tokens.
- [ ] Os IDs de turma, tema, tarefa, redação, correção, questão e simulado
      foram copiados para as requisições seguintes.
- [ ] Os testes de autorização foram executados com perfis diferentes.
- [ ] O fluxo de redação foi executado na ordem: criar, salvar, enviar,
      corrigir, aprovar/ajustar e consultar.
- [ ] O fluxo de simulado foi executado na ordem: criar, iniciar, responder,
      pausar, retomar e finalizar.
- [ ] O fluxo de comunicados foi executado na ordem: enviar, receber,
      consultar e marcar como lido.
- [ ] O fluxo de recuperação confirmou uso único do token.
- [ ] O terminal do backend não mostrou erros inesperados.
