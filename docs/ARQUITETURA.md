# Arquitetura do LIRA

## Classificação

O LIRA utiliza um **monólito modular com API REST e arquitetura em camadas**.
Também há elementos do padrão MVC, mas não é MVC tradicional porque o backend
não renderiza uma camada View HTML: ele retorna JSON para o frontend e outros
clientes HTTP.

## Fluxo de uma requisição

```text
Cliente/Frontend
      ↓ HTTP/JSON
Routes
      ↓
Middlewares
      ↓
Controllers
      ↓
Services
      ↓
Prisma Client
      ↓
MySQL
```

## Responsabilidade das camadas

### Routes

Define métodos HTTP, URLs e composição de middlewares. Está em
`backend/src/routes`.

### Middlewares

Executa autenticação JWT, autorização por papel e tratamento global de erros.
Está em `backend/src/middlewares`.

### Controllers

Lê parâmetros e body, chama os services e transforma resultados em respostas
HTTP. Não deve concentrar regras complexas de negócio.

### Services

Concentra regras de negócio, transações e validações de domínio. Exemplos:

- login e seleção de papel;
- cadastro via convite;
- geração de convites;
- gestão de turmas.

### Persistência

`backend/src/db/prisma.ts` exporta o Prisma Client. O modelo está em
`backend/prisma/schema.prisma`, as migrations em
`backend/prisma/migrations` e o banco de execução é MySQL.

## Múltiplos papéis

`USUARIO` é a entidade central. Os perfis opcionais são representados pelas
tabelas `ADMINISTRADOR`, `TUTOR` e `ALUNO`, todas usando `id_usuario` como
chave primária e estrangeira.

Assim, o mesmo usuário pode possuir `TUTOR` e `ALUNO` sem criar outra conta.
No login, o backend retorna uma seleção pendente quando há mais de um papel.

## Autenticação

- senha: hash bcrypt;
- sessão: JWT assinado;
- autorização: papel ativo validado pelo middleware;
- token: enviado no header `Authorization: Bearer <token>`.

O JWT é stateless: não há uma sessão armazenada em tabela no backend.

## Transações

O cadastro via convite e a participação como aluno utilizam transações Prisma.
Criação de usuário, criação de perfil, vínculo e consumo do convite são
confirmados ou revertidos juntos.

## Decisões e limites atuais

- frontend Next.js ainda será adicionado em `frontend/`;
- o backend e o frontend serão aplicações separadas no mesmo repositório;
- o monólito é adequado ao escopo da POC;
- não há necessidade de microsserviços nesta sprint;
- regras como limite de alunos por tutor são aplicadas no service;
- o banco possui PK, FK, UNIQUE e DEFAULT; valores de domínio são validados
  também na aplicação.
