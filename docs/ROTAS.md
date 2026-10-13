# Rotas da API

Base local:

```text
http://localhost:3333
```

Rotas protegidas usam:

```http
Authorization: Bearer <token>
```

## Saúde

```http
GET /health
```

Resposta esperada:

```json
{ "status": "ok", "banco": "conectado" }
```

## Autenticação

### Login

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "admin@lira.com",
  "senha": "senha123"
}
```

### Cadastro via convite

```http
POST /auth/cadastro
Content-Type: application/json
```

```json
{
  "codigo": "TUT-ABC123",
  "nome": "Novo Tutor",
  "email": "novo@lira.com",
  "senha": "Senha123"
}
```

### Seleção de papel

```http
POST /auth/selecionar-papel
```

```json
{
  "tokenPendente": "token-temporario",
  "papel": "TUTOR"
}
```

### Sessão atual

```http
GET /auth/me
Authorization: Bearer <token-de-sessao>
```

Resposta:

```json
{
  "usuario": {
    "id": 1,
    "nome": "Administrador",
    "email": "admin@lira.com"
  },
  "papelAtivo": "ADMINISTRADOR",
  "papeisDisponiveis": ["ADMINISTRADOR"]
}
```

### Participar como aluno

```http
POST /auth/participar-como-aluno
Authorization: Bearer <token-do-tutor>
```

```json
{ "codigo": "ALU-ABC123" }
```

## Turmas

```http
GET /turmas
POST /turmas
GET /turmas/:idTurma
PATCH /turmas/:idTurma
POST /turmas/:idTurma/arquivar
```

As duas rotas exigem autenticação. A listagem respeita o escopo do usuário:
administradores veem todas as turmas, enquanto tutores e alunos veem somente
suas turmas vinculadas. A criação é exclusiva de administradores.

`PATCH /turmas/:idTurma` e `POST /turmas/:idTurma/arquivar` são exclusivos de
administradores.

Exemplo de atualização:

```json
{
  "nome": "3º A - Manhã",
  "vestibularFoco": "ENEM"
}
```

O arquivamento altera o status para `ARQUIVADA` e impede novos fluxos que
dependam de uma turma ativa.

## Temas

Todas as rotas exigem autenticação. A criação, alteração e exclusão são
exclusivas da Administração.

```http
GET    /temas
GET    /temas/:idTema
POST   /temas
PATCH  /temas/:idTema
DELETE /temas/:idTema
```

Exemplo de criação:

```json
{
  "tituloTema": "Desafios da educação digital no Brasil",
  "textoMotivador": "Texto motivador opcional.",
  "origem": "ENEM"
}
```

## Tarefas

```http
GET    /tarefas
GET    /tarefas/:idTarefa
POST   /tarefas
PATCH  /tarefas/:idTarefa
DELETE /tarefas/:idTarefa
POST   /tarefas/:idTarefa/replicar
```

Administradores criam atividades `GERAL`; tutores criam tarefas
`AVALIATIVA` apenas para a própria turma. Alunos podem consultar somente
tarefas da turma à qual estão vinculados.

Exemplo de criação por tutor:

```json
{
  "idTurma": 1,
  "idTema": 1,
  "tituloTarefa": "Redação da semana",
  "descricao": "Escreva uma redação dissertativo-argumentativa.",
  "prazoEntrega": "2026-11-01T23:59:00.000Z",
  "modalidade": "AVALIATIVA"
}
```

Exemplo de criação administrativa:

```json
{
  "idTurma": 1,
  "idTema": 1,
  "tituloTarefa": "Atividade institucional",
  "descricao": "Atividade geral da Administração.",
  "prazoEntrega": "2026-11-01T23:59:00.000Z",
  "modalidade": "GERAL"
}
```

Para replicar uma atividade geral criada pelo próprio administrador:

```http
POST /tarefas/1/replicar
Authorization: Bearer <token-de-administrador>
Content-Type: application/json
```

```json
{
  "idTurma": 2,
  "prazoEntrega": "2026-11-15T23:59:00.000Z"
}
```

Tarefas não podem ser criadas ou replicadas para turmas arquivadas/inativas,
e os prazos recebidos pela API devem estar no futuro.

## Redações

As operações de escrita pertencem ao aluno autenticado. Administradores e
tutores podem consultar apenas as redações permitidas pelo próprio vínculo:
administradores veem todas, tutores veem seus tutorados e alunos veem as
próprias redações.

```http
GET   /redacoes
GET   /redacoes/aguardando-correcao
GET   /redacoes/:idRedacao
POST  /redacoes
PATCH /redacoes/:idRedacao/rascunho
POST  /redacoes/:idRedacao/enviar
POST  /redacoes/:idRedacao/reescrita
POST  /redacoes/:idRedacao/solicitar-reescrita
DELETE /redacoes/:idRedacao
```

### Fila do tutor

```http
GET /redacoes/aguardando-correcao
Authorization: ******
```

Disponível somente para tutores. Retorna as versões dos próprios tutorados
com status `ENVIADA` (primeira correção) ou `AJUSTE_SOLICITADO` (revisão
devolvida pela Administração), incluindo aluno, tema, tarefa e a última
observação administrativa quando houver.

### Criar redação de treino

```http
POST /redacoes
Authorization: Bearer <token-de-aluno>
Content-Type: application/json
```

```json
{
  "tipoFluxo": "TREINO",
  "idTema": 1,
  "conteudoTexto": ""
}
```

### Criar redação avaliativa

```json
{
  "tipoFluxo": "AVALIATIVA",
  "idTarefa": 1,
  "conteudoTexto": ""
}
```

A tarefa precisa ser avaliativa, pertencer à turma do aluno e estar ativa.
Quando a tarefa possuir tema, ele será usado automaticamente; também é
possível informar `idTema` explicitamente.

### Autosave do rascunho

```http
PATCH /redacoes/1/rascunho
Authorization: Bearer <token-de-aluno>
Content-Type: application/json
```

```json
{
  "conteudoTexto": "Texto parcialmente digitado..."
}
```

O frontend deve chamar esse endpoint usando debounce. O backend aceita somente
versões com status `RASCUNHO`.

### Enviar versão

```http
POST /redacoes/1/enviar
Authorization: Bearer <token-de-aluno>
```

O envio exige conteúdo não vazio, bloqueia novas alterações na versão e
registra `dataEnvio`. Em redações avaliativas, o prazo da tarefa também é
verificado.

### Criar reescrita

```http
POST /redacoes/1/reescrita
Authorization: Bearer <token-de-aluno>
```

A versão 2 só pode ser criada quando a versão 1 estiver com status
`AGUARDANDO_REESCRITA`. A API impede a criação de uma terceira versão.

### Solicitar reescrita

```http
POST /redacoes/:idRedacao/solicitar-reescrita
Authorization: ******
```

Operação exclusiva do tutor responsável pela redação. Depois que uma correção
de treino é criada, ou que uma correção avaliativa é aprovada pela
Administração, a versão 1 fica `CORRIGIDA`. O tutor pode então solicitar a
reescrita; a versão 1 passa para `AGUARDANDO_REESCRITA` e o aluno pode criar a
única versão 2. O tutor de outra turma recebe `403`.

### Excluir rascunho

```http
DELETE /redacoes/:idRedacao
Authorization: ******
```

Operação exclusiva do aluno proprietário. Só redações com uma única versão em
`RASCUNHO` podem ser excluídas. Uma redação enviada, corrigida ou com reescrita
retorna `409`.

Estados utilizados nesta etapa:

```text
RASCUNHO
ENVIADA
EM_CORRECAO
CORRIGIDA
AGUARDANDO_REESCRITA
AJUSTE_SOLICITADO
```

## Correções

### Fila de correções

```http
GET /correcoes/pendentes
Authorization: Bearer <token-de-tutor-ou-administrador>
```

Tutors veem somente as redações dos próprios tutorados. Administradores veem
as correções pendentes de aprovação.

### Criar correção

```http
POST /redacoes/correcoes
Authorization: Bearer <token-de-tutor>
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
  "comentarioComp1": "Use a norma-padrão na construção do período.",
  "comentarioComp2": "A tese está relacionada ao tema.",
  "comentarioComp3": "Desenvolva melhor a relação entre causa e consequência.",
  "comentarioComp4": "Varie os conectivos entre os parágrafos.",
  "comentarioComp5": "Detalhe o agente e o meio da proposta.",
  "parecerGeral": "A redação apresenta boa organização argumentativa.",
  "recadoAdmin": "Mensagem do tutor para a Administração.",
  "anotacoes": [
    {
      "posicaoInicio": 0,
      "posicaoFinal": 12,
      "textoSelecionado": "Trecho do texto",
      "tipoErro": "COESAO",
      "sugestaoComentario": "Revise o conectivo utilizado."
    }
  ]
}
```

Cada competência aceita valores de `0` a `200`, em incrementos de `10`. A
nota total é calculada pelo backend. Os campos `comentarioComp1` a
`comentarioComp5`, `parecerGeral` e `recadoAdmin` são opcionais e aceitam
textos de até 5.000 caracteres. `recadoAdmin` é interno e não é exibido ao
aluno. As posições das anotações são conferidas contra o conteúdo real da
versão.

### Consultar correção

```http
GET /correcoes/:idCorrecao
Authorization: Bearer <token>
```

O tutor responsável e o administrador podem consultar a correção pendente.
O aluno somente pode consultar uma correção depois da aprovação.

### Aprovar correção

```http
POST /correcoes/:idCorrecao/aprovar
Authorization: Bearer <token-de-administrador>
```

Para redações avaliativas, a aprovação libera a correção ao aluno e altera a
versão para `CORRIGIDA`. A reescrita não é liberada automaticamente: o tutor
responsável deve chamar `POST /redacoes/:idRedacao/solicitar-reescrita`, que
altera a versão para `AGUARDANDO_REESCRITA`.

### Solicitar ajuste

```http
POST /correcoes/:idCorrecao/solicitar-ajuste
Authorization: Bearer <token-de-administrador>
Content-Type: application/json
```

```json
{
  "comentarioAjuste": "Revise a justificativa da competência 3 antes de reenviar."
}
```

A solicitação altera o status da correção e da versão para
`AJUSTE_SOLICITADO`, permitindo que o tutor faça uma nova correção da mesma
versão. `recadoAdmin` continua aceito por compatibilidade.

As filas têm finalidades diferentes:

| Endpoint | Usuário | Conteúdo |
| --- | --- | --- |
| `GET /redacoes/aguardando-correcao` | Tutor | Versões que precisam de correção ou revisão |
| `GET /correcoes/pendentes` | Tutor | Correções próprias aguardando aprovação |
| `GET /correcoes/pendentes` | Administrador | Correções aguardando aprovação |

## Banco de questões

As questões podem ser consultadas por usuários autenticados:

```http
GET /questoes
GET /assuntos
```

Administradores também possuem o CRUD do banco:

```http
GET    /questoes/:idQuestao
POST   /questoes
PATCH  /questoes/:idQuestao
DELETE /questoes/:idQuestao
```

O detalhe e as operações de alteração são exclusivos do administrador. O
payload de criação/edição exige cinco alternativas (`A` a `E`), exatamente um
gabarito e pelo menos um assunto:

```json
{
  "enunciado": "Texto da questão.",
  "vestibular": "ENEM",
  "ano": 2024,
  "numeroQuestao": 45,
  "grauDificuldade": "MEDIA",
  "explicacaoGabarito": "Justificativa da resposta.",
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

Uma questão usada em simulado ou no caderno de erros retorna `409` e não é
removida para preservar o histórico.

Filtros disponíveis em `/questoes`:

```text
vestibular
ano
grauDificuldade
idAssunto
limite (1 a 100; padrão 50)
```

Exemplo:

```http
GET /questoes?vestibular=ENEM&ano=2024&grauDificuldade=MEDIA&limite=10
Authorization: Bearer <token>
```

O gabarito não é retornado nessa consulta.

## Simulados

As operações de simulados são exclusivas de alunos:

```http
POST  /simulados
GET   /simulados
GET   /simulados/:idSimulado
POST  /simulados/:idSimulado/iniciar
PATCH /simulados/:idSimulado/respostas
POST  /simulados/:idSimulado/finalizar
```

Para refazer as questões ativas do caderno de erros:

```http
POST /caderno-erros/refazer
Authorization: ******
Content-Type: application/json
```

O corpo pode informar `quantidade` (de 1 a 50). Sem corpo, são selecionadas
até 50 questões com erro. O endpoint cria um novo simulado
`CADERNO_ERROS`; se não houver erros ativos, retorna `409`.

### Criar simulado personalizado

```http
POST /simulados
Authorization: Bearer <token-de-aluno>
Content-Type: application/json
```

```json
{
  "tipoSimulado": "PERSONALIZADO",
  "quantidade": 10,
  "vestibular": "ENEM",
  "ano": 2024,
  "grauDificuldade": "MEDIA",
  "idAssunto": 1
}
```

Os filtros são opcionais. A quantidade deve estar entre 1 e 50. Se não houver
questões suficientes para os filtros selecionados, a API retorna `409`.

### Iniciar

```http
POST /simulados/1/iniciar
Authorization: Bearer <token-de-aluno>
```

### Registrar resposta

```http
PATCH /simulados/1/respostas
Authorization: Bearer <token-de-aluno>
Content-Type: application/json
```

```json
{
  "idQuestao": 25,
  "resposta": "B"
}
```

As respostas são gravadas no servidor. O backend rejeita respostas fora do
simulado, simulados finalizados e respostas após o limite de 60 minutos.

### Finalizar

```http
POST /simulados/1/finalizar
Authorization: Bearer <token-de-aluno>
```

Ao finalizar, o backend:

- compara as respostas com o gabarito armazenado;
- marca `indicadorAcerto`;
- calcula `pontuacaoTotal`;
- registra `dataFim` e `tempoGastoSeg`;
- cria ou atualiza o caderno de erros para questões respondidas incorretamente.

## Caderno de erros

```http
GET  /caderno-erros
POST /caderno-erros/:idCaderno/revisar
Authorization: Bearer <token-de-aluno>
```

O caderno utiliza uma chave única por aluno e questão. Cada novo erro
incrementa `quantidadeErros` e atualiza `dataUltimoErro`.

Body de criação:

```json
{
  "nome": "3º A",
  "anoLetivo": 2026,
  "vestibularFoco": "ENEM"
}
```

## Convites

### Convite de tutor

```http
POST /turmas/:idTurma/convites/tutor
Authorization: Bearer <token-do-administrador>
```

### Listagem administrativa

```http
GET /convites
GET /convites?turmaId=1
Authorization: Bearer <token-do-administrador>
```

### Convite de aluno

```http
POST /tutor/convites/aluno
Authorization: Bearer <token-do-tutor>
```

Convites têm validade de 30 dias 

## Erros

As respostas usam:

```json
{
  "erro": "Mensagem",
  "codigo": "CODIGO_DO_ERRO"
}
```

Status utilizados: `400`, `401`, `403`, `404`, `409` e `500`.
