import type { NextFunction, Request, Response } from "express";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import { ErroValidacao } from "../errors/erros";
import {
  alterarStatusUsuario,
  buscarUsuario,
  listarUsuarios,
  trocarTurmaDoTutor,
  trocarTutorDoAluno,
} from "../services/vinculo.service";

type Detalhe = { campo: string; mensagem: string };

function idDaRota(req: Request, nome: string): number {
  const valor = Number(req.params[nome]);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ErroValidacao([{ campo: nome, mensagem: "Informe um identificador inteiro positivo." }]);
  }
  return valor;
}

function corpo(req: Request): Record<string, unknown> {
  return typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
}

function idDoCorpo(valor: unknown, campo: string): number {
  const numero = Number(valor);
  if (valor === undefined || valor === null || !Number.isInteger(numero) || numero <= 0) {
    throw new ErroValidacao([{ campo, mensagem: "Informe um identificador inteiro positivo." }]);
  }
  return numero;
}

function texto(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim() ? valor.trim() : undefined;
}

// GET /usuarios?papel=TUTOR&idTurma=1&status=ATIVO&busca=ana
export async function getUsuarios(req: Request, res: Response, next: NextFunction) {
  try {
    const detalhes: Detalhe[] = [];
    let idTurma: number | undefined;
    if (req.query.idTurma !== undefined && req.query.idTurma !== "") {
      idTurma = Number(req.query.idTurma);
      if (!Number.isInteger(idTurma) || idTurma <= 0) {
        detalhes.push({ campo: "idTurma", mensagem: "Deve ser um número inteiro positivo." });
      }
    }
    if (detalhes.length) throw new ErroValidacao(detalhes);
    res.status(200).json(
      await listarUsuarios({
        papel: texto(req.query.papel),
        status: texto(req.query.status),
        busca: texto(req.query.busca)?.slice(0, 100),
        idTurma,
      })
    );
  } catch (erro) { next(erro); }
}

export async function getUsuario(req: Request, res: Response, next: NextFunction) {
  try { res.status(200).json(await buscarUsuario(idDaRota(req, "idUsuario"))); } catch (erro) { next(erro); }
}

export async function patchStatusUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const status = corpo(req).status;
    if (typeof status !== "string") {
      throw new ErroValidacao([{ campo: "status", mensagem: "Informe ATIVO ou INATIVO." }]);
    }
    res.status(200).json(await alterarStatusUsuario(auth.idUsuario, idDaRota(req, "idUsuario"), status));
  } catch (erro) { next(erro); }
}

export async function patchTutorDoAluno(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(
      await trocarTutorDoAluno(auth.idUsuario, idDaRota(req, "idAluno"), idDoCorpo(corpo(req).idTutor, "idTutor"))
    );
  } catch (erro) { next(erro); }
}

export async function patchTurmaDoTutor(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(
      await trocarTurmaDoTutor(auth.idUsuario, idDaRota(req, "idTutor"), idDoCorpo(corpo(req).idTurma, "idTurma"))
    );
  } catch (erro) { next(erro); }
}
