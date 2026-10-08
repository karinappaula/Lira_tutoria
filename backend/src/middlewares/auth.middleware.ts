import type { NextFunction, Request, Response } from "express";
import {
  ErroTokenInvalido,
  type PapelAtivo,
  type PayloadSessao,
  verificarToken,
} from "../services/token.service";
import { ErroNegocio } from "../errors/erros";

export interface RequestAutenticada extends Request {
  autenticacao: PayloadSessao;
}

export function exigirAutenticacao(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const cabecalho = req.header("authorization");
  const token = cabecalho?.startsWith("Bearer ") ? cabecalho.slice(7).trim() : "";

  if (!token) {
    next(new ErroTokenInvalido("Token de sessão obrigatório."));
    return;
  }

  try {
    const payload = verificarToken(token);
    if (payload.tipo !== "sessao") {
      next(new ErroTokenInvalido("Use um token de sessão completo."));
      return;
    }

    (req as RequestAutenticada).autenticacao = payload;
    next();
  } catch (erro) {
    next(erro);
  }
}

export function exigirPapel(...papeisPermitidos: PapelAtivo[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const autenticacao = (req as Partial<RequestAutenticada>).autenticacao;
    if (!autenticacao || !papeisPermitidos.includes(autenticacao.papelAtivo)) {
      next(new ErroNegocio("Você não possui permissão para esta operação.", 403, "SEM_PERMISSAO"));
      return;
    }
    next();
  };
}
