import type { NextFunction, Request, Response } from "express";
import { gerarConviteAluno, gerarConviteTutor, listarConvitesAtivos } from "../services/convite.service";
import type { RequestAutenticada } from "../middlewares/auth.middleware";

function idTurma(req: Request): number {
  const valor = Number(req.params.idTurma);
  if (!Number.isInteger(valor) || valor <= 0) throw new Error("ID de turma inválido.");
  return valor;
}

export async function criarConviteTutor(req: Request, res: Response, next: NextFunction) {
  try {
    const autenticada = req as RequestAutenticada;
    const convite = await gerarConviteTutor(autenticada.autenticacao.idUsuario, idTurma(req));
    res.status(201).json(convite);
  } catch (erro) {
    next(erro);
  }
}

export async function criarConviteAluno(req: Request, res: Response, next: NextFunction) {
  try {
    const autenticada = req as RequestAutenticada;
    const convite = await gerarConviteAluno(autenticada.autenticacao.idUsuario);
    res.status(201).json(convite);
  } catch (erro) {
    next(erro);
  }
}

export async function listarConvites(req: Request, res: Response, next: NextFunction) {
  try {
    const autenticada = req as RequestAutenticada;
    const turma = req.query.turmaId;
    const idTurmaFiltro = turma === undefined ? undefined : Number(turma);
    if (idTurmaFiltro !== undefined && (!Number.isInteger(idTurmaFiltro) || idTurmaFiltro <= 0)) {
      throw new Error("ID de turma inválido.");
    }
    const convites = await listarConvitesAtivos(
      autenticada.autenticacao.idUsuario,
      idTurmaFiltro
    );
    res.json(convites);
  } catch (erro) {
    next(erro);
  }
}
