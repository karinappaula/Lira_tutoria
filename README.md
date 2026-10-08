# LIRA — Tutoria de Redações

### Plataforma Web de Tutoria de Redações e Preparatório para Vestibulares

Projeto desenvolvido como **Trabalho de Conclusão de Curso (TCC)** do curso
Técnico em Desenvolvimento de Sistemas, com aplicação no contexto educacional
do **SESI**.

## Sobre o projeto

O LIRA é uma plataforma web para acompanhamento pedagógico de redações e
preparação para vestibulares e processos seletivos. O sistema organiza o
processo desde o envio da redação pelo aluno até a correção pelo tutor,
permitindo também o acompanhamento do desempenho e a realização de atividades,
questões e simulados.

## Objetivos

- Organizar o envio e acompanhamento de redações;
- facilitar o trabalho dos tutores durante a correção;
- permitir o acompanhamento do desempenho dos alunos;
- auxiliar a preparação para vestibulares;
- disponibilizar tarefas, questões e simulados;
- centralizar informações do acompanhamento pedagógico.

## Contexto

| Informação | Descrição |
|---|---|
| Projeto | Trabalho de Conclusão de Curso |
| Curso | Técnico em Desenvolvimento de Sistemas |
| Instituição de ensino | SENAI |
| Aplicação | SESI |
| Área | Educação e Tecnologia |
| Metodologia | Scrum |

## Equipe

| Integrante | Área | Responsabilidades |
|---|---|---|
| Karina Pereira | Backend | Desenvolvimento do backend |
| Arthur Marinho | Backend | Desenvolvimento do backend |
| Gabriella Sanchez | Frontend | Desenvolvimento do frontend |
| Maria Luiza Zanon | Frontend | Desenvolvimento do frontend |
| Heloisa Oliveira | Frontend / Documentação | Frontend, organização documental e monografia |

## Estado atual

Nesta etapa, o repositório contém o backend funcional da POC e a base de
persistência da Sprint 2. O frontend Next.js será adicionado quando sua
implementação começar; ele não deve ser considerado entregue enquanto não
existir no repositório.

## Stack tecnológica

### Backend

- Node.js;
- Express;
- TypeScript;
- Prisma ORM 5.x;
- JWT para autenticação e autorização;
- bcrypt para hash de senhas.

### Banco de dados

- MySQL 8.4;
- Docker para execução local do banco;
- migrations e seed gerenciados pelo Prisma.

### Frontend planejado

- Next.js;
- TypeScript;
- App Router;
- SCSS;
- CSS Modules.

### Ferramentas e serviços

- Git e GitHub;
- Insomnia para testes da API;
- Figma/Canva;
- Trello/Notion;
- Firebase Admin SDK para scripts de importação de questões;
- Cloudinary reservado para armazenamento de imagens.

## Arquitetura

O backend utiliza um **monólito modular com API REST e arquitetura em
camadas**. Não é MVC tradicional, porque o backend não renderiza páginas HTML:
ele retorna respostas JSON para o frontend e outros clientes HTTP.

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

Detalhes da arquitetura estão em
[`docs/ARQUITETURA.md`](./docs/ARQUITETURA.md).

## Estrutura do repositório

```text
LIRA/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── errors/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   └── services/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── scripts/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── docs/
├── CONTRIBUTING.md
├── README.md
└── .gitignore
```

## Pré-requisitos

- Node.js 20 ou superior;
- npm;
- Docker Desktop;
- Git;
- Insomnia, para os testes manuais da API.

## Configuração do banco

Na primeira execução, crie o MySQL 8.4 com Docker:

```powershell
docker run --name mysqlq `
  -e MYSQL_ROOT_PASSWORD="defina-uma-senha-local" `
  -e MYSQL_DATABASE="sistema_redacoes" `
  -p 3306:3306 `
  -p 33060:33060 `
  -d mysql:8.4
```

Confira os logs até aparecer:

```text
ready for connections
```

Para reiniciar um container já existente:

```powershell
docker start mysqlq
```

## Configuração do backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
npx prisma generate
```

Edite `backend/.env` e use as credenciais do banco local:

```env
DATABASE_URL="mysql://lira_app:SENHA_LOCAL@127.0.0.1:3306/sistema_redacoes"
JWT_SECRET="uma-chave-local-longa-e-aleatoria"
JWT_EXPIRES_IN="7d"
PORT=3333
```

O arquivo `.env` não deve ser enviado ao GitHub. Deve ser enviado somente o
arquivo `.env.example`, sem senhas reais.

## Migrations e seed

Aplicar migrations existentes:

```powershell
cd backend
npx prisma migrate deploy
```

Validar o schema:

```powershell
npx prisma validate
```

Executar o seed de desenvolvimento:

```powershell
npm run prisma:seed
```

O seed cria dados fictícios para a POC, incluindo usuários, turma, papéis,
convites e exemplo de usuário com múltiplos papéis. As credenciais do seed são
somente para desenvolvimento e não devem ser usadas em produção.

## Executar a API

Modo de desenvolvimento:

```powershell
cd backend
npm run dev
```

Build e execução local:

```powershell
npm run build
npm start
```

URL padrão:

```text
http://localhost:3333
```

Teste inicial:

```http
GET http://localhost:3333/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "banco": "conectado"
}
```

## Rotas principais

| Método | Endpoint | Acesso |
|---|---|---|
| GET | `/health` | Público |
| POST | `/auth/login` | Público |
| POST | `/auth/cadastro` | Público, exige convite |
| POST | `/auth/selecionar-papel` | Público com token pendente |
| POST | `/auth/participar-como-aluno` | Usuário autenticado |
| GET | `/turmas` | API atual |
| POST | `/turmas` | API atual |
| POST | `/turmas/:idTurma/convites/tutor` | Administrador |
| GET | `/convites` | Administrador |
| POST | `/tutor/convites/aluno` | Tutor |

Bodies, headers, autenticação e respostas estão documentados em
[`docs/ROTAS.md`](./docs/ROTAS.md).

## Testes com Insomnia

O fluxo recomendado para a POC é:

1. iniciar a API;
2. testar `/health`;
3. fazer login como administrador;
4. gerar convite de tutor;
5. cadastrar e fazer login como tutor;
6. gerar convite de aluno;
7. cadastrar e fazer login como aluno;
8. testar o usuário que possui simultaneamente os papéis de tutor e aluno;
9. selecionar o papel ativo.

Os prints das requisições e respostas devem ser incluídos no PDF de anexos da
Sprint 2. Uma workspace exportada do Insomnia pode ser armazenada em
`docs/insomnia/`, desde que não contenha senhas, tokens JWT ou outras
credenciais reais.

## Documentação da Sprint 2

- [`docs/ARQUITETURA.md`](./docs/ARQUITETURA.md)
- [`docs/DICIONARIO_DADOS.md`](./docs/DICIONARIO_DADOS.md)
- [`docs/GOVERNANCA_GIT.md`](./docs/GOVERNANCA_GIT.md)
- [`docs/ROTAS.md`](./docs/ROTAS.md)
- [`CONTRIBUTING.md`](./CONTRIBUTING.md)

Entregas físicas do banco:

- [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma)
- [`backend/prisma/migrations/`](./backend/prisma/migrations/)
- [`backend/prisma/seed.ts`](./backend/prisma/seed.ts)

## Governança do código

As regras de branches, commits e Pull Requests estão em
[`CONTRIBUTING.md`](./CONTRIBUTING.md) e
[`docs/GOVERNANCA_GIT.md`](./docs/GOVERNANCA_GIT.md).

Resumo:

- `main`: versão estável para entrega;
- `develop`: integração da equipe, quando utilizada;
- `feature/*`: novas funcionalidades;
- `fix/*`: correções;
- `docs/*`: documentação e modelagem.

Não envie `.env`, credenciais Firebase, dumps SQL, `node_modules` ou `dist`
para o repositório.

## Validação antes da entrega

```powershell
cd backend
npx prisma validate
npm run build
```

## Autores

- Karina Pereira
- Arthur Marinho
- Gabriella Sanchez
- Maria Luiza Zanon
- Heloisa Oliveira

**Curso Técnico em Desenvolvimento de Sistemas — SENAI**

Projeto desenvolvido para fins acadêmicos como Trabalho de Conclusão de Curso.
