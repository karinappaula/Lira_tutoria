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

### Recuperação de senha

```http
POST /auth/esqueci-senha
Content-Type: application/json
```

```json
{
  "email": "aluno@lira.com"
}
```

Sem `BREVO_API_KEY` e sem `SMTP_HOST`, o link é exibido no terminal em
ambiente de desenvolvimento. Com Brevo ou SMTP configurado, ele é enviado
por e-mail. A resposta é sempre genérica.

```http
POST /auth/redefinir-senha
Content-Type: application/json
```

```json
{
  "token": "TOKEN_RECEBIDO_NO_EMAIL",
  "novaSenha": "NovaSenha123"
}
```

O token expira em uma hora e só pode ser usado uma vez. Reutilizá-lo retorna
`400` com o código `LINK_INVALIDO`.

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

Todas as rotas exigem autenticação. A listagem respeita o escopo do usuário:
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

O primeiro arquivamento altera o status para `ARQUIVADA` e impede novos fluxos
que dependam de uma turma ativa. Tentar arquivar novamente uma turma que já
está nesse status retorna `409 Conflict`, com o código
`TURMA_JA_ARQUIVADA`; a turma não é atualizada novamente.

## Temas

Todas as rotas exigem autenticação. A Administração pode criar, alterar e
excluir qualquer tema. O Tutor pode criar temas próprios e alterar ou excluir
somente os temas que criou; seus tutorados também podem consultar esses temas.

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
POST   /tarefas/:idTarefa/anexos
DELETE /tarefas/:idTarefa/anexos/:idAnexo
```

Administradores criam atividades `GERAL`; tutores criam tarefas
`AVALIATIVA` para a própria turma. O papel autenticado determina a modalidade
e a turma do Tutor é obtida do vínculo. `idTurma` e `modalidade` não são
campos aceitos no corpo. Alunos consultam somente as tarefas da própria turma.

Exemplo de criação por tutor:

```json
{
  "idTema": 1,
  "tituloTarefa": "Redação da semana",
  "descricao": "Escreva uma redação dissertativo-argumentativa.",
  "prazoEntrega": "2026-11-01T23:59:00.000Z"
}
```

Exemplo de criação administrativa:

```json
{
  "idTema": 1,
  "tituloTarefa": "Atividade institucional",
  "descricao": "Atividade geral da Administração.",
  "prazoEntrega": "2026-11-01T23:59:00.000Z"
}
```

Na criação da tarefa, é possível informar `novoTema` em vez de `idTema`:

```json
{
  "tituloTarefa": "Redação da semana",
  "descricao": "Leia os textos motivadores.",
  "prazoEntrega": "2026-11-20T21:00:00.000Z",
  "novoTema": {
    "tituloTema": "Tema criado junto com a tarefa",
    "textoMotivador": "Texto de apoio opcional."
  }
}
```

Não envie `idTema` e `novoTema` juntos. O tema criado pelo Tutor recebe
origem `TUTOR` e fica associado ao Tutor; o criado pela Administração é
oficial. Tutores só podem usar temas oficiais ou temas próprios.

Para aplicar uma atividade geral criada pela Administração à turma do próprio
Tutor:

```http
POST /tarefas/1/replicar
Authorization: Bearer <token-de-tutor>
Content-Type: application/json
```

```json
{
  "prazoEntrega": "2026-11-15T23:59:00.000Z"
}
```

Esta rota é exclusiva de tutores. A turma de destino é obtida do vínculo do
Tutor; não envie `idTurma`.

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

O catálogo de assuntos possui as seguintes operações:

```http
GET    /assuntos
POST   /assuntos
PATCH  /assuntos/:idAssunto
DELETE /assuntos/:idAssunto
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
pagina
limite
vestibular
ano
grauDificuldade
idAssunto
busca
status (somente Administração)
```

Exemplo:

```http
GET /questoes?vestibular=ENEM&ano=2024&grauDificuldade=MEDIA&limite=10
Authorization: Bearer <token>
```

O gabarito não é retornado nessa consulta.

O administrador pode alterar o status sem apagar a questão:

```http
POST /questoes/:idQuestao/inativar
POST /questoes/:idQuestao/ativar
```

Questões `INATIVA` não entram em novos simulados nem em simulados criados a
partir do caderno de erros.

## Simulados

As operações de simulados são exclusivas de alunos:

```http
POST  /simulados
GET   /simulados
GET   /simulados/:idSimulado
POST  /simulados/:idSimulado/iniciar
POST  /simulados/:idSimulado/pausar
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

### Pausar e retomar

```http
POST /simulados/1/pausar
Authorization: ******
```

A pausa acumula o tempo usado em `tempoAcumuladoSeg`. Ao chamar novamente
`POST /simulados/:idSimulado/iniciar`, o cronômetro continua do ponto salvo.
O tempo total permitido continua sendo 60 minutos.

## Caderno de erros

```http
GET  /caderno-erros
POST /caderno-erros/refazer
Authorization: Bearer <token-de-aluno>
```

O caderno utiliza uma chave única por aluno e questão. Cada novo erro
incrementa `quantidadeErros` e atualiza `dataUltimoErro`.

O refazimento aceita:

```json
{
  "quantidade": 10
}
```

## Administração de usuários e vínculos

Todas as rotas desta seção exigem token de sessão com papel
`ADMINISTRADOR`.

```http
GET   /usuarios
GET   /usuarios/:idUsuario
PATCH /usuarios/:idUsuario/status
POST  /usuarios/:idUsuario/link-redefinicao
PATCH /alunos/:idAluno/tutor
PATCH /tutores/:idTutor/turma
```

Filtros de `GET /usuarios`: `papel`, `status`, `idTurma` e `busca`.
Para alterar o status, envie `{ "status": "INATIVO" }`. Para trocar o tutor
de um aluno, envie `{ "idTutor": 3 }`; para trocar a turma de um tutor,
envie `{ "idTurma": 2 }`. Alterações de status e vínculos são auditadas.

`POST /usuarios/:idUsuario/link-redefinicao` retorna `201` com link de uso
único para aluno ou tutor. Para outra conta administradora retorna `409`.

## Comunicados

```http
POST /comunicados
GET  /comunicados
GET  /comunicados/nao-lidos
GET  /comunicados/enviados
GET  /comunicados/:idComunicado
POST /comunicados/:idComunicado/lido
```

Administradores e tutores enviam comunicados. Tutores e alunos recebem.

```json
{
  "tituloComunicado": "Aviso da semana",
  "mensagem": "A correção será liberada amanhã.",
  "idTurma": 1
}
```

O campo `idTurma` é opcional para a Administração. Para filtrar a caixa de
entrada, use `GET /comunicados?naoLidos=true`.

## Indicadores

```http
GET /indicadores/aluno
GET /indicadores/tutor/alunos?busca=ana
GET /indicadores/tutor/redacoes
GET /indicadores/tutor/simulados
GET /indicadores/alunos/:idAluno
GET /indicadores/historico-correcoes?mes=2026-10&idTutor=3&idTurma=1&tipoFluxo=AVALIATIVA
GET /indicadores/admin/turmas?idTurma=1
GET /indicadores/admin/tutores
```

A rota de aluno é exclusiva do aluno autenticado. As rotas de tutor mostram
somente seus tutorados. As rotas administrativas são exclusivas da
Administração e o desempenho individual respeita o vínculo do tutor.

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

Convites têm validade de 30 dias.

## Inteligência artificial para redações

A rota de digitalização exige token de sessão com o perfil `ALUNO`. A rota de
avaliação exige token de sessão com o perfil `TUTOR`. O resultado é retornado
na resposta e não é salvo no banco de dados. Configure `GEMINI_API_KEY` no
`.env` do backend. Ambas as operações usam exclusivamente o modelo
`gemini-3.5-flash-lite`.
A rota de avaliação usa como referência a base ENEM versionada em
`backend/src/data/base-dados-correcao-enem-2025.json`; mantenha esse conteúdo
no backend e atualize-o quando a rubrica de referência mudar.

### Digitalizar imagem

```http
POST /ia/digitalizar
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Envie uma única imagem no campo `imagem` (JPG, PNG ou WEBP; até 10 MB). Exemplo
de resposta:

```json
{ "texto": "Texto transcrito da redação..." }
```

### Avaliar redação

```http
POST /ia/avaliar
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "texto": "Texto completo da redação...",
  "tema": "Tema proposto (opcional)"
}
```

`tema` é opcional e `texto` aceita até 100.000 caracteres. A resposta contém
`c1` a `c5` (nota e feedback), `nota_total` (soma das competências) e
`sugestoes`. Cada competência recebe nota de 0 a 200, em múltiplos de 40.

Erros próprios dessas rotas incluem `IA_NAO_CONFIGURADA` (503),
`FALHA_PROVEDOR_IA` (502), `RESPOSTA_IA_INVALIDA` (502),
`TEMPO_LIMITE_IA` (504), `IMAGEM_MUITO_GRANDE` (413) e erros de validação (400).

## Erros

As respostas usam:

```json
{
  "erro": "Mensagem",
  "codigo": "CODIGO_DO_ERRO"
}
```

Status utilizados: `400`, `401`, `403`, `404`, `409` e `500`.
