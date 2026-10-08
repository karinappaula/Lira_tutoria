# Checklist de entrega da Sprint 2

## Banco de dados

- [ ] Conferir DER lógico e físico com `backend/prisma/schema.prisma`.
- [x] Definir PKs e FKs no schema e nas migrations.
- [x] Versionar as migrations em `backend/prisma/migrations`.
- [x] Configurar o seed em `backend/prisma/seed.ts`.
- [x] Documentar o dicionário físico em `DICIONARIO_DADOS.md`.
- [ ] Inserir evidências da migration e do seed no PDF da sprint.

## UML e arquitetura

- [ ] Revisar o diagrama de classes com base no schema.
- [x] Documentar a arquitetura em `ARQUITETURA.md`.
- [x] Documentar a estrutura de pastas do backend.
- [ ] Adicionar imagens finais do DER e do diagrama de classes.

## Código

- [x] Configurar a conexão Prisma/MySQL.
- [x] Implementar o endpoint `/health`.
- [x] Implementar autenticação, cadastro e seleção de papel.
- [x] Implementar rotas iniciais de turma e convite.
- [x] Versionar `backend/.env.example`.
- [ ] Registrar testes do Insomnia com evidências.
- [ ] Criar o frontend Next.js se ele estiver no escopo desta sprint.

## Governança e entrega

- [x] Criar e completar o `README.md`.
- [x] Criar o `CONTRIBUTING.md`.
- [x] Documentar branches e regras de Pull Request.
- [x] Configurar o `.gitignore`.
- [ ] Publicar o projeto no GitHub.
- [ ] Inserir links diretos no PDF de anexos.
- [x] Preencher a tabela de integrantes no README.
- [ ] Revisar a consistência entre DER, UML, schema e dicionário.
