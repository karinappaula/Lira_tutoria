# Convenções de Branches e Contribuição — LIRA Tutoria

## 1. Objetivo deste documento

Este documento define como as branches, os commits e a integração de alterações são organizados no repositório **LIRA Tutoria**.

O objetivo é manter o histórico compreensível, reduzir alterações feitas diretamente na versão principal e deixar explícito o fluxo de trabalho adotado pelo projeto.

Este documento descreve o procedimento de versionamento. Ele **não substitui** a documentação do projeto que registra os testes executados, os resultados obtidos e as evidências de validação da entrega.

## 2. Branches principais

O projeto adota duas branches principais para o fluxo de desenvolvimento:

| Branch | Finalidade | Regra de uso |
|---|---|---|
| `main` | Manter a versão principal integrada do projeto. | Recebe versões integradas após revisão e validação compatíveis com a etapa de entrega. Evitar desenvolver funcionalidades diretamente nela. |
| `develop` | Reunir alterações em desenvolvimento antes de integrá-las à versão principal. | É a branch de referência para iniciar novas branches de funcionalidade ou documentação. Deve ser sincronizada com `main` quando uma versão for integrada à principal. |

A existência de uma branch não significa, por si só, que todas as funcionalidades estejam validadas. O estado de validação deve ser registrado na documentação de testes e entrega do projeto.

## 3. Branches históricas já existentes

As branches abaixo foram criadas durante etapas anteriores do desenvolvimento. Elas são mantidas como histórico do processo de implementação e não são branches principais do fluxo futuro.

| Branch | Contexto histórico |
|---|---|
| `etapa4-questoes` | Alterações associadas à etapa de questões. |
| `etapa5-simulados` | Alterações associadas à etapa de simulados. |
| `etapa6-comunicados-indicadores` | Alterações associadas à etapa de comunicados e indicadores. |
| `feature/questoes-simulados` | Desenvolvimento de funcionalidades de questões e simulados. |
| `feature/redacoes-correcoes` | Desenvolvimento do fluxo de redações, correções e reescritas. |
| `feature/tarefas-temas` | Desenvolvimento de funcionalidades de tarefas e temas. |
| `docs/api-insomnia` | Alterações relacionadas à documentação e à coleção da API no Insomnia. |

Esses nomes registram como o trabalho foi separado durante o desenvolvimento. A partir da adoção desta convenção, novas alterações devem seguir o fluxo definido nas próximas seções.

**Orientação:** não excluir branches históricas apenas para reduzir a quantidade de branches. Uma exclusão deve ocorrer somente após confirmar que a branch não contém trabalho exclusivo que precise ser preservado e que seu histórico já não é necessário.

## 4. Fluxo para novas alterações

O fluxo padrão será:

1. Atualizar a branch `develop` com a versão remota mais recente.
2. Criar uma branch específica a partir de `develop`.
3. Fazer as alterações nessa branch.
4. Revisar o diff e executar as verificações aplicáveis à alteração.
5. Registrar as mudanças em commits com mensagens claras.
6. Integrar a branch de trabalho em `develop` após a revisão.
7. Quando houver uma versão pronta para entrega, revisar e validar o conjunto integrado e então integrar `develop` em `main`.
8. Após a integração em `main`, sincronizar `develop` com `main`.

Representação resumida:

```text
main
  ↑ integração de uma versão revisada e validada
develop
  ↑ integração de alterações concluídas
feature/* ou docs/*
```

Para um projeto acadêmico com uma equipe pequena, a revisão pode ser feita pelos integrantes responsáveis. Quando viável, recomenda-se usar um Pull Request para que a finalidade da alteração e o diff fiquem visíveis antes da integração.

## 5. Convenção para nomes de branches

Novas branches devem usar nomes curtos, descritivos e em minúsculas, com palavras separadas por hífens.

| Prefixo | Quando usar | Exemplo |
|---|---|---|
| `feature/` | Nova funcionalidade ou melhoria funcional. | `feature/filtro-comunicados` |
| `fix/` | Correção de um defeito. | `fix/validacao-vinculo-tutor` |
| `docs/` | Documentação, instruções ou contratos da API. | `docs/atualiza-rotas-api` |
| `refactor/` | Reorganização interna sem mudança intencional de comportamento. | `refactor/organiza-servicos` |
| `test/` | Inclusão ou ajuste de testes automatizados. | `test/validacao-indicadores` |
| `hotfix/` | Correção urgente na versão principal. | `hotfix/corrige-login` |

Evitar criar novas branches com nomes genéricos, como `alteracoes`, `teste`, `nova`, `final` ou `atualizado`.

## 6. Convenção para mensagens de commit

As mensagens de commit devem indicar, de forma objetiva, o tipo de alteração e seu assunto.

Formato recomendado:

```text
tipo: descrição curta da alteração
```

Tipos sugeridos:

| Tipo | Uso | Exemplo |
|---|---|---|
| `feat` | Nova funcionalidade. | `feat: adiciona filtro de comunicados` |
| `fix` | Correção de defeito. | `fix: valida vínculo entre tutor e aluno` |
| `docs` | Documentação. | `docs: atualiza instruções da API` |
| `refactor` | Refatoração. | `refactor: separa regras do serviço de tarefas` |
| `test` | Testes. | `test: adiciona testes de indicadores` |
| `chore` | Manutenção e configuração. | `chore: atualiza dependências do backend` |
| `merge` | Integração de branches. | `merge: integra funcionalidades revisadas em develop` |

A mensagem deve corresponder ao que realmente foi alterado. Não usar mensagens que afirmem que algo foi testado ou validado se isso não tiver sido realizado.

## 7. Procedimento operacional

### 7.1. Antes de iniciar uma nova tarefa

Verificar o estado do repositório e atualizar `develop`:

```bash
git status
git switch develop
git pull --ff-only origin develop
```

Se o `git status` indicar alterações locais que ainda não foram salvas em commit, não as descarte automaticamente. Avalie-as antes de trocar de branch.

Criar uma branch de trabalho:

```bash
git switch -c feature/nome-da-funcionalidade
```

Substituir `feature/nome-da-funcionalidade` por um nome adequado à tarefa.

### 7.2. Durante e ao concluir a tarefa

Revisar os arquivos modificados:

```bash
git status
git diff
```

Depois de verificar as alterações e executar as verificações aplicáveis:

```bash
git add caminho/dos/arquivos
git commit -m "feat: descreve a alteração"
git push -u origin feature/nome-da-funcionalidade
```

Adicionar apenas os arquivos que devem fazer parte do commit. Não versionar arquivos de configuração com segredos, credenciais, senhas ou variáveis locais.

### 7.3. Integrar a tarefa em `develop`

Preferencialmente, abrir um Pull Request da branch de trabalho para `develop`, revisar as alterações e concluir a integração.

Se a equipe optar por fazer a integração localmente, primeiro garantir que a branch de trabalho esteja pronta e que não haja alterações locais pendentes. Depois:

```bash
git switch develop
git pull --ff-only origin develop
git merge --no-ff feature/nome-da-funcionalidade -m "merge: integra nome da funcionalidade em develop"
git push origin develop
```

Se o Git indicar conflito, interromper o procedimento e resolver os conflitos conscientemente. Não forçar a integração nem apagar alterações para fazer o comando funcionar.

Após a integração, a branch de trabalho pode ser mantida temporariamente para consulta ou excluída quando sua integração estiver confirmada e não houver necessidade de preservá-la. Branches históricas listadas neste documento não precisam ser excluídas.

### 7.4. Promover uma versão de `develop` para `main`

A integração em `main` deve ocorrer quando o conjunto de alterações estiver revisado e as verificações previstas para a entrega tiverem sido realizadas. Registrar os resultados na documentação de testes e validação do projeto.

Preferencialmente, abrir um Pull Request de `develop` para `main`. Após a revisão e a aprovação:

```bash
git switch main
git pull --ff-only origin main
git merge --no-ff develop -m "merge: integra versão revisada em main"
git push origin main
```

Se a equipe usar Pull Requests, a integração pode ser concluída pelo GitHub em vez de executar o merge localmente. Não executar os dois procedimentos para a mesma integração.

Depois da integração, sincronizar `develop`:

```bash
git switch develop
git pull --ff-only origin develop
git merge --ff-only main
git push origin develop
```

Se algum comando falhar, parar e analisar a mensagem antes de continuar.

## 8. Correções urgentes

Se for necessária uma correção urgente na versão principal, criar uma branch `hotfix/` a partir de `main`, corrigir e revisar a alteração e integrá-la em `main`. Depois, garantir que a correção também esteja em `develop`, por meio de merge ou sincronização adequada, evitando que as duas branches voltem a divergir.



## 9. Segurança e arquivos locais

Antes de realizar commits, verificar se os arquivos selecionados contêm informações privadas ou arquivos gerados localmente.

Não versionar:
- senhas, tokens, chaves privadas ou credenciais;
- arquivos `.env` com valores reais;
- arquivos de conta de serviço ou credenciais de provedores;
- dependências instaladas localmente, como `node_modules/`;
- saídas de compilação, como `dist/`, quando forem geradas automaticamente;
- cópias de segurança ou exportações locais que não façam parte intencional da entrega.

Manter exemplos sem segredos, como `.env.example`, quando necessários para explicar a configuração. Conferir o conteúdo antes de publicar, pois ignorar um arquivo pelo `.gitignore` não remove um arquivo que já esteja versionado.

## 10. Checklist antes de integrar alterações

- [ ] A branch tem nome claro e corresponde à finalidade da tarefa.
- [ ] O diff foi revisado e contém somente as alterações pretendidas.
- [ ] Não foram incluídos segredos, credenciais ou arquivos locais indevidos.
- [ ] As verificações aplicáveis foram executadas.
- [ ] Os resultados de testes e validação foram registrados na documentação do projeto, quando aplicável.
- [ ] Os commits têm mensagens claras e coerentes com as alterações.
- [ ] A branch de destino foi atualizada antes da integração.
- [ ] A integração não sobrescreve trabalho de outros integrantes.
- [ ] A documentação técnica afetada pela mudança foi atualizada, quando necessário.

## 11. Manutenção desta convenção

Esta convenção deve ser revista se a equipe alterar o fluxo de desenvolvimento ou a estrutura das branches. Qualquer exceção relevante deve ser discutida entre os integrantes e documentada, para que o histórico do repositório continue compreensível.
