# Governança de Git

As regras completas e vigentes de branches, commits, Pull Requests e validação
estão em [`../CONTRIBUTING.md`](../CONTRIBUTING.md). Este arquivo mantém apenas
um resumo para consulta rápida; em caso de divergência, siga o documento
principal.

## Branches

```text
main       → versão principal integrada
develop    → integração das alterações revisadas
feature/*  → funcionalidades
fix/*      → correções
docs/*     → documentação
refactor/* → reorganização interna sem mudança intencional de comportamento
test/*     → testes
hotfix/*   → correções urgentes
```

## Fluxo

1. Atualizar `develop` e criar uma branch de trabalho com o prefixo adequado.
2. Fazer uma alteração coesa e revisar o diff.
3. Executar as verificações aplicáveis e registrar resultados quando
   necessário.
4. Criar commits com mensagens no formato `tipo: descrição`.
5. Enviar a branch e abrir Pull Request para `develop`.
6. Obter revisão de outro integrante antes de integrar.
7. Promover `develop` para `main` somente quando a versão estiver revisada e
   validada para entrega.

## Regras de Pull Request

- usar título e descrição objetivos, incluindo a alteração e as verificações
  realizadas;
- explicitar migrations e requisitos de configuração sem expor valores
  secretos;
- não incluir credenciais, tokens ou arquivos `.env`;
- executar as validações aplicáveis à mudança;
- obter revisão de outro integrante; o autor não aprova o próprio Pull
  Request.

## Convenção de commits

```text
feat: nova funcionalidade
fix: correção
docs: documentação
refactor: reorganização sem mudança funcional
test: testes
chore: manutenção
merge: integração de branches
```
