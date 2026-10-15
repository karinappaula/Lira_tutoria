import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma";
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

export async function exigirAutenticacao(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
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

    // Conta inativada depois do login perde o acesso na hora, sem esperar o
    // token expirar (RF02 / RNF03).
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.idUsuario },
      select: { status: true },
    });
    if (!usuario || usuario.status !== "ATIVO") {
      next(new ErroTokenInvalido("Conta inativa ou inexistente."));
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
