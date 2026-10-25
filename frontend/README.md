# LIRA Tutoria — Frontend

Next.js (App Router) · TypeScript strict · SCSS + CSS Modules · sem Tailwind e sem Shadcn.

## Como rodar (Windows / PowerShell)

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local      # confira BACKEND_URL (padrão: http://localhost:3333)
npm run dev                            # abre em http://localhost:3000
```

Antes, suba o backend (`backend/`) e rode o seed. A vitrine de componentes fica em
`http://localhost:3000/componentes` (só em desenvolvimento).

## Como a sessão funciona (segurança)

1. O navegador chama `/api/auth/login` (rota do próprio Next.js).
2. O servidor do Next chama o backend, recebe o JWT e o grava em cookie `httpOnly`
   (`SameSite=Lax`, `Secure` em produção). O JavaScript do navegador nunca vê o token.
3. As demais chamadas vão para `/api/proxy/<rota>`; o servidor do Next acrescenta o
   `Authorization: Bearer ...` e repassa ao backend. O endereço do backend fica só em `BACKEND_URL`.
4. `src/middleware.ts` bloqueia rotas privadas e separa as áreas por papel.
   A autorização real continua no backend.

## Estrutura

```text
src/
├── app/            páginas (App Router) e rotas /api (login, logout, sessão, proxy)
├── components/
│   ├── ui/         Button, Campos (Input/Select/Textarea), Badge, Card, Modal, Tabela,
│   │               Toast, Spinner, Estados (vazio/erro), Alerta
│   └── layout/     AppShell (cabeçalho + abas), AuthShell, PageHeader, SessaoProvider
├── lib/            http, erros, validação, máscaras, formatação, cookies (servidor)
├── services/       chamadas da interface à API
├── styles/         _variables.scss, _mixins.scss, globals.scss
└── types/          contratos da API
```
