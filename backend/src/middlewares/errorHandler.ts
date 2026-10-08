import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ErroAutenticacao } from "../services/login.service";
import { ErroTokenInvalido } from "../services/token.service";
import { ErroNegocio, ErroValidacao, type DetalheValidacao } from "../errors/erros";

const STATUS_AUTENTICACAO: Record<ErroAutenticacao["codigo"], number> = {
  CREDENCIAIS_INVALIDAS: 401,
  TOKEN_INVALIDO: 401,
  CONTA_INATIVA: 403,
  SEM_PAPEL: 403,
};

// Formato da resposta de erro. `erro` continua sendo um TEXTO (compatível com o
// que as rotas e o frontend já esperavam); `codigo` e `detalhes` são acréscimos.
function responder(
  res: Response,
  status: number,
  erro: string,
  codigo: string,
  detalhes?: DetalheValidacao[]
) {
  return res.status(status).json({ erro, codigo, ...(detalhes ? { detalhes } : {}) });
}

// Middleware central de tratamento de erros. Toda rota que chamar
// next(erro) ou lançar uma exceção async cai aqui.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // --- Erros esperados (não são logados como falha) ---
  if (err instanceof ErroValidacao) {
    return responder(res, 400, err.message, "VALIDACAO", err.detalhes);
  }

  if (err instanceof ErroAutenticacao) {
    return responder(res, STATUS_AUTENTICACAO[err.codigo], err.message, err.codigo);
  }

  if (err instanceof ErroTokenInvalido) {
    return responder(res, 401, err.message, "TOKEN_INVALIDO");
  }

  if (err instanceof ErroNegocio) {
    return responder(res, err.status, err.message, err.codigo);
  }

  // Violação de UNIQUE no banco (ex.: dois cadastros simultâneos com o mesmo e-mail).
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return responder(res, 409, "Já existe um registro com esses dados.", "REGISTRO_DUPLICADO");
  }

  // JSON malformado no corpo da requisição (erro do express.json()).
  if (err instanceof SyntaxError && "body" in err) {
    return responder(res, 400, "O corpo da requisição não é um JSON válido.", "JSON_INVALIDO");
  }

  // LEGADO: `throw new Error("...")` puro, usado pelos services antigos (ex.: turma.service)
  // para sinalizar regra de negócio. Mantém o comportamento anterior (400 + mensagem).
  // Só vale para o `Error` exato: TypeError, erros do Prisma etc. NÃO entram aqui.
  // Ao migrar cada service para ErroNegocio, este bloco deixa de ser usado.
  if (err instanceof Error && err.constructor === Error) {
    return responder(res, 400, err.message, "REGRA_DE_NEGOCIO");
  }

  // --- Falha inesperada: loga internamente e NÃO expõe detalhes ao cliente ---
  console.error(err);
  return responder(res, 500, "Erro interno do servidor.", "ERRO_INTERNO");
}
