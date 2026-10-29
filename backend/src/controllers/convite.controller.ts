import type { NextFunction, Request, Response } from "express";
import { gerarConviteAluno, gerarConviteTutor, listarConvitesAtivos } from "../services/convite.service";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import { ErroValidacao } from "../errors/erros";

function idTurma(req: Request): number {
  const valor = Number(req.params.idTurma);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ErroValidacao([{ campo: "idTurma", mensagem: "Informe um identificador inteiro positivo." }]);
  }
  return valor;
}

export async function criarConviteTutor(req: Request, res: Response, next: NextFunction) {
  try {
    const autenticada = req as RequestAutenticada;
    let usosMaximos = 1;
    if (req.body && typeof req.body === "object" && req.body.usosMaximos !== undefined) {
      const parsed = Number(req.body.usosMaximos);
      if (Number.isInteger(parsed) && parsed >= 1) {
        usosMaximos = parsed;
      }
    }
    const convite = await gerarConviteTutor(autenticada.autenticacao.idUsuario, idTurma(req), usosMaximos);
    res.status(201).json(convite);
  } catch (erro) {
    next(erro);
  }
}

export async function criarConviteAluno(req: Request, res: Response, next: NextFunction) {
  try {
    const autenticada = req as RequestAutenticada;
    const renovar = Boolean(req.body?.renovar || req.query.renovar === "true");
    const convite = await gerarConviteAluno(autenticada.autenticacao.idUsuario, renovar);
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
      throw new ErroValidacao([
        { campo: "turmaId", mensagem: "Informe um identificador inteiro positivo." },
      ]);
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
