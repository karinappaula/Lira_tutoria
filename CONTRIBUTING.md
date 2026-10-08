# Contribuindo com o LIRA

## Branches

- `main`: versão estável para entrega;
- `develop`: integração da sprint, quando utilizada;
- `feature/<nome>`: nova funcionalidade;
- `fix/<nome>`: correção;
- `docs/<nome>`: documentação.

Exemplos:

```text
feature/convites
feature/frontend-login
docs/dicionario-dados
fix/validacao-cadastro
```

## Commits

Use mensagens objetivas, preferencialmente no formato Conventional Commits:

```text
feat: adiciona geração de convites
fix: corrige vínculo de aluno
docs: documenta tabelas do banco
refactor: separa regra de autenticação
test: adiciona cenário de login
chore: atualiza dependências
```

## Pull Requests

Todo PR deve:

- explicar o problema e a solução;
- informar como testar;
- listar migrations novas ou alterações no banco;
- listar variáveis de ambiente novas;
- incluir evidências visuais quando aplicável;
- não conter `.env`, senhas, tokens ou arquivos de backup;
- passar em `npx prisma validate`;
- passar em `npm run build`;
- receber revisão de pelo menos um integrante;
- não ser aprovado pelo próprio autor.

## Fluxo recomendado

```powershell
git switch develop
git pull
git switch -c feature/nome-da-tarefa

# desenvolver e testar
npx prisma validate
npm run build

git add .
git commit -m "feat: descreve a alteração"
git push -u origin feature/nome-da-tarefa
```

Abra o Pull Request contra `develop`. Após revisão e aprovação, faça o merge.
Para a entrega, `develop` deve ser integrado em `main`.

## Banco de dados

Não edite uma migration já aplicada. Para alterações no schema:

```powershell
cd backend
npx prisma migrate dev --name descricao_da_alteracao
npx prisma generate
```

Envie a nova pasta de migration junto com a alteração de código.

## Segurança

Nunca versione:

- `.env`;
- senhas;
- tokens JWT;
- credenciais de banco;
- `firebase-service-account.json`;
- dumps reais do banco;
- arquivos exportados com dados pessoais.
