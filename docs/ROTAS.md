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
```

Body de criação:

```json
{
  "nome": "3º A",
  "anoLetivo": 2026,
  "vestibularFoco": "ENEM"
}
```

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

Convites têm validade de 30 dias 

## Erros

As respostas usam:

```json
{
  "erro": "Mensagem",
  "codigo": "CODIGO_DO_ERRO"
}
```

Status utilizados: `400`, `401`, `403`, `404`, `409` e `500`.
