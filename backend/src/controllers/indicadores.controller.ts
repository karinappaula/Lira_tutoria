import type { NextFunction, Request, Response } from "express";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import { ErroValidacao } from "../errors/erros";
import {
  desempenhoPorTurma,
  desempenhoPorTutor,
  desempenhoRedacoesDoTutor,
  desempenhoSimuladosDoTutor,
  historicoDeCorrecoes,
  indicadoresDoAluno,
  indicadoresDoAlunoParaGestao,
  listarTutorados,
} from "../services/indicadores.service";

type Detalhe = { campo: string; mensagem: string };

function auth(req: Request) {
  return (req as RequestAutenticada).autenticacao;
}

function inteiroOpcional(valor: unknown, campo: string, detalhes: Detalhe[]): number | undefined {
  if (valor === undefined || valor === "") return undefined;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    detalhes.push({ campo, mensagem: "Deve ser um número inteiro positivo." });
    return undefined;
  }
  return numero;
}

function textoOpcional(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim() ? valor.trim() : undefined;
}

export async function getIndicadoresAluno(req: Request, res: Response, next: NextFunction) {
  try { res.status(200).json(await indicadoresDoAluno(auth(req).idUsuario)); } catch (erro) { next(erro); }
}

export async function getIndicadoresDoAluno(req: Request, res: Response, next: NextFunction) {
  try {
    const idAluno = Number(req.params.idAluno);
    if (!Number.isInteger(idAluno) || idAluno <= 0) {
      throw new ErroValidacao([{ campo: "idAluno", mensagem: "Informe um identificador inteiro positivo." }]);
    }
    const { idUsuario, papelAtivo } = auth(req);
    res.status(200).json(await indicadoresDoAlunoParaGestao(idUsuario, papelAtivo, idAluno));
  } catch (erro) { next(erro); }
}

export async function getTutorados(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json(await listarTutorados(auth(req).idUsuario, textoOpcional(req.query.busca)?.slice(0, 100)));
  } catch (erro) { next(erro); }
}

export async function getDesempenhoRedacoes(req: Request, res: Response, next: NextFunction) {
  try { res.status(200).json(await desempenhoRedacoesDoTutor(auth(req).idUsuario)); } catch (erro) { next(erro); }
}

export async function getDesempenhoSimulados(req: Request, res: Response, next: NextFunction) {
  try { res.status(200).json(await desempenhoSimuladosDoTutor(auth(req).idUsuario)); } catch (erro) { next(erro); }
}

// GET /indicadores/historico-correcoes?mes=2026-09&idTutor=&idTurma=&tipoFluxo=
// O Tutor só enxerga as próprias correções, mesmo que informe outro idTutor.
export async function getHistoricoCorrecoes(req: Request, res: Response, next: NextFunction) {
  try {
    const { idUsuario, papelAtivo } = auth(req);
    const detalhes: Detalhe[] = [];
    const idTutor = inteiroOpcional(req.query.idTutor, "idTutor", detalhes);
    const idTurma = inteiroOpcional(req.query.idTurma, "idTurma", detalhes);
    if (detalhes.length) throw new ErroValidacao(detalhes);
    res.status(200).json(
      await historicoDeCorrecoes({
        idTutor: papelAtivo === "TUTOR" ? idUsuario : idTutor,
        idTurma,
        mes: textoOpcional(req.query.mes),
        tipoFluxo: textoOpcional(req.query.tipoFluxo)?.toUpperCase(),
      })
    );
  } catch (erro) { next(erro); }
}

export async function getDesempenhoTurmas(req: Request, res: Response, next: NextFunction) {
  try {
    const detalhes: Detalhe[] = [];
    const idTurma = inteiroOpcional(req.query.idTurma, "idTurma", detalhes);
    if (detalhes.length) throw new ErroValidacao(detalhes);
    res.status(200).json(await desempenhoPorTurma(idTurma));
  } catch (erro) { next(erro); }
}

export async function getDesempenhoTutores(_req: Request, res: Response, next: NextFunction) {
  try { res.status(200).json(await desempenhoPorTutor()); } catch (erro) { next(erro); }
}
