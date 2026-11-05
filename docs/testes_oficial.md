# Testes oficiais — redação e acesso à API

## Escopo e execução

Esta suíte contém os cinco casos solicitados: dois testes unitários e três
testes HTTP de integração entre Express, rotas, controladores, serviços e
middleware de autenticação. As chamadas HTTP passam pelo servidor Express real
em porta local temporária; o Prisma é simulado, portanto os testes não leem nem
alteram o banco de dados.

Execute na pasta `backend`:

```powershell
npm test -- --runTestsByPath src/services/redacoes.test.ts src/integration/redacao.integration.test.ts
```

O sistema calcula a nota ENEM somando as cinco competências (máximo de 1.000
pontos), não pela média aritmética. O conteúdo aceita até 100.000 caracteres;
não há regra de limite de palavras implementada. Também não existe atualmente
uma rota `DELETE /simulados/:idSimulado`; por isso, o teste de exclusão por
usuário sem permissão verifica a rota existente de exclusão de redação. Não foi
criado endpoint novo como parte desta suíte.

## CT006 — Cálculo da nota final da redação

### ELABORAÇÃO DOS CASOS DE TESTE

| Id do teste | Nome | Funcionalidade | Objetivo | Pré-condições | Passos de execução | Dados de entrada | Resultado esperado |
|---|---|---|---|---|---|---|---|
| CT006 | Cálculo da nota final pelas cinco competências | Correção e pontuação ENEM | Confirmar que a nota final corresponde à soma das notas C1 a C5, conforme a regra atual do sistema. | Existe versão de redação enviada, associada ao tutor que fará a correção; banco simulado. | 1. Chamar `criarCorrecao` para a versão. 2. Verificar a nota resultante e os dados passados à persistência. | C1=200, C2=160, C3=120, C4=80, C5=40; tutor id 7; versão id 20. | Nota total 600 pontos; a persistência recebe `notaTotal: 600`. |

### EXECUÇÃO DOS CASOS DE TESTE

| Id | Resultado obtido | Status | Falha (se houver) |
|---|---|---|---|
| CT006 | A função retornou nota total 600 e a criação simulada recebeu `notaTotal: 600`. | Aprovado | Nenhuma. |

## CT007 — Limite de caracteres do texto

### ELABORAÇÃO DOS CASOS DE TESTE

| Id do teste | Nome | Funcionalidade | Objetivo | Pré-condições | Passos de execução | Dados de entrada | Resultado esperado |
|---|---|---|---|---|---|---|---|
| CT007 | Validação do limite máximo de caracteres | Salvamento de rascunho | Confirmar a aceitação do limite de 100.000 caracteres e a rejeição de conteúdo maior. | Redação id 3 pertence ao aluno id 9 e tem uma versão em rascunho; Prisma simulado. | 1. Salvar texto com 100.000 caracteres. 2. Salvar texto com 100.001 caracteres. 3. Conferir atualizações e erro. | Usuário 9; redação 3; textos com 100.000 e 100.001 caracteres. | O conteúdo com 100.000 caracteres é aceito; o de 100.001 é rejeitado com `CONTEUDO_MUITO_LONGO`, sem nova atualização. |

### EXECUÇÃO DOS CASOS DE TESTE

| Id | Resultado obtido | Status | Falha (se houver) |
|---|---|---|---|
| CT007 | O texto com 100.000 caracteres foi aceito; o de 100.001 foi rejeitado com `CONTEUDO_MUITO_LONGO`. A atualização foi chamada uma única vez. | Aprovado | Nenhuma. O requisito menciona palavras, mas o sistema não define limite de palavras; este caso verifica o limite de caracteres existente. |

## CT008 — Envio de redação pela API

### ELABORAÇÃO DOS CASOS DE TESTE

| Id do teste | Nome | Funcionalidade | Objetivo | Pré-condições | Passos de execução | Dados de entrada | Resultado esperado |
|---|---|---|---|---|---|---|---|
| CT008 | Fluxo completo de criação, autosave e envio | Elaboração e submissão de redação | Verificar a integração entre criação do rascunho, salvamento do texto e submissão da versão através das rotas HTTP. | API Express ativa; aluno 9 ativo e autenticado; tema oficial id 4; Prisma simulado para persistência. | 1. Enviar `POST /redacoes` para criar rascunho. 2. Enviar `PATCH /redacoes/3/rascunho` para salvar o texto. 3. Enviar `POST /redacoes/3/enviar`. 4. Conferir respostas e atualizações. | JWT de sessão do aluno 9; tema 4; redação 3; texto com oito linhas; versão 20. | Criação retorna HTTP 201; autosave retorna HTTP 200; envio retorna HTTP 200 e versão com status `ENVIADA`. |

### EXECUÇÃO DOS CASOS DE TESTE

| Id | Resultado obtido | Status | Falha (se houver) |
|---|---|---|---|
| CT008 | `POST /redacoes` retornou HTTP 201; `PATCH /redacoes/3/rascunho` retornou HTTP 200; `POST /redacoes/3/enviar` retornou HTTP 200 com a versão id 20 em `ENVIADA`. As três rotas percorreram autenticação, controladores e serviços; persistência foi simulada. | Aprovado | Nenhuma. |

## CT009 — Bloqueio de rota privada sem JWT

### ELABORAÇÃO DOS CASOS DE TESTE

| Id do teste | Nome | Funcionalidade | Objetivo | Pré-condições | Passos de execução | Dados de entrada | Resultado esperado |
|---|---|---|---|---|---|---|---|
| CT009 | Bloqueio de rota privada sem token | Autenticação e autorização HTTP | Garantir que uma rota privada não seja acessível sem token JWT. | Servidor Express ativo; rota `GET /redacoes` protegida pelo middleware de autenticação. | 1. Enviar `GET /redacoes` sem cabeçalho `Authorization`. 2. Conferir a resposta e confirmar que a consulta autenticada não ocorreu. | Requisição sem token e sem corpo. | HTTP 401 com código `TOKEN_INVALIDO`; nenhuma consulta do usuário no Prisma. |

### EXECUÇÃO DOS CASOS DE TESTE

| Id | Resultado obtido | Status | Falha (se houver) |
|---|---|---|---|
| CT009 | A API retornou HTTP 401 com código `TOKEN_INVALIDO`; a busca de usuário não foi chamada. | Aprovado | Nenhuma. |

## CT010 — Exclusão de redação por usuário sem permissão

### ELABORAÇÃO DOS CASOS DE TESTE

| Id do teste | Nome | Funcionalidade | Objetivo | Pré-condições | Passos de execução | Dados de entrada | Resultado esperado |
|---|---|---|---|---|---|---|---|
| CT010 | Bloqueio da exclusão por outro aluno | Autorização e exclusão de rascunho | Garantir que um aluno autenticado não exclua a redação pertencente a outro aluno. | API Express ativa; redação id 3 pertence ao aluno 9 e está em rascunho; banco simulado; usuário 10 tem conta ativa e JWT válido com papel `ALUNO`. | 1. Enviar `DELETE /redacoes/3` com o token do aluno 10. 2. Conferir a resposta e se houve chamada de exclusão. | Token de sessão do aluno 10; redação id 3 pertencente ao aluno 9. | HTTP 403 com código `SEM_PERMISSAO`; a operação de exclusão não é chamada. |

### EXECUÇÃO DOS CASOS DE TESTE

| Id | Resultado obtido | Status | Falha (se houver) |
|---|---|---|---|
| CT010 | A API retornou HTTP 403 com código `SEM_PERMISSAO`; `redacao.delete` não foi chamado. | Aprovado | Nenhuma. |

## Resultado consolidado

- **Testes unitários:** 2 aprovados de 2.
- **Testes HTTP de integração:** 3 aprovados de 3.
- **Total:** 5 aprovados de 5; nenhuma falha.
- **Banco real:** não utilizado; todas as operações de persistência foram
  simuladas para manter os testes isolados.
