# Governança de Git

## Branches

```text
main       → versão estável/entrega
develop    → integração da sprint
feature/*  → funcionalidades
fix/*      → correções
docs/*     → documentação
```

## Fluxo

1. Atualizar `develop`.
2. Criar branch específica.
3. Implementar uma tarefa coesa.
4. Executar validações.
5. Abrir Pull Request para `develop`.
6. Obter revisão de outro integrante.
7. Fazer merge.
8. Integrar `develop` em `main` na entrega.

## Regras de PR

- título objetivo;
- descrição do problema, solução e teste;
- migrations e variáveis de ambiente explicitadas;
- sem segredos ou `.env`;
- build e validação do Prisma aprovados;
- revisão obrigatória por outro integrante;
- autor não aprova o próprio PR.

## Convenção de commits

```text
feat: nova funcionalidade
fix: correção
docs: documentação
refactor: reorganização sem mudança funcional
test: testes
chore: manutenção
```
