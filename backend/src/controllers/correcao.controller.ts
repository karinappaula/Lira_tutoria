import type { NextFunction, Request, Response } from "express";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import { ErroValidacao } from "../errors/erros";
import {
  aprovarCorrecao,
  buscarCorrecaoVisivel,
  criarCorrecao,
  listarCorrecoesPendentes,
  solicitarAjuste,
  type AnotacaoInput,
} from "../services/correcao.service";

function id(req: Request, nome: string): number {
  const valor = Number(req.params[nome]);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ErroValidacao([{ campo: nome, mensagem: "Informe um identificador inteiro positivo." }]);
  }
  return valor;
}

function corpo(req: Request) {
  const body = typeof req.body === "object" && req.body !== null
    ? req.body as Record<string, unknown>
    : {};
  return body;
}

function nota(body: Record<string, unknown>, campo: string): number {
  const valor = Number(body[campo]);
  if (!Number.isFinite(valor)) {
    throw new ErroValidacao([{ campo, mensagem: "Informe uma nota numérica." }]);
  }
  return valor;
}

function textoOpcional(body: Record<string, unknown>, campo: string): string | undefined {
  const valor = body[campo];
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor !== "string") {
    throw new ErroValidacao([{ campo, mensagem: "Deve ser um texto." }]);
  }
  return valor;
}

function inputCorrecao(req: Request) {
  const body = corpo(req);
  const idVersao = Number(body.idVersao);
  if (!Number.isInteger(idVersao) || idVersao <= 0) {
    throw new ErroValidacao([{ campo: "idVersao", mensagem: "Informe um identificador válido." }]);
  }
  const anotacoes = body.anotacoes;
  if (anotacoes !== undefined && !Array.isArray(anotacoes)) {
    throw new ErroValidacao([{ campo: "anotacoes", mensagem: "Deve ser uma lista." }]);
  }
  return {
    idVersao,
    notaComp1: nota(body, "notaComp1"),
    notaComp2: nota(body, "notaComp2"),
    notaComp3: nota(body, "notaComp3"),
    notaComp4: nota(body, "notaComp4"),
    notaComp5: nota(body, "notaComp5"),
    comentarioComp1: textoOpcional(body, "comentarioComp1"),
    comentarioComp2: textoOpcional(body, "comentarioComp2"),
    comentarioComp3: textoOpcional(body, "comentarioComp3"),
    comentarioComp4: textoOpcional(body, "comentarioComp4"),
    comentarioComp5: textoOpcional(body, "comentarioComp5"),
    parecerGeral: textoOpcional(body, "parecerGeral"),
    recadoAdmin: textoOpcional(body, "recadoAdmin"),
    anotacoes: anotacoes as AnotacaoInput[] | undefined,
  };
}

export async function postCorrecao(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(201).json(await criarCorrecao(auth.idUsuario, inputCorrecao(req)));
  } catch (erro) { next(erro); }
}

export async function getCorrecoesPendentes(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await listarCorrecoesPendentes(auth.idUsuario, auth.papelAtivo === "ADMINISTRADOR"));
  } catch (erro) { next(erro); }
}

export async function getCorrecao(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await buscarCorrecaoVisivel(auth.idUsuario, auth.papelAtivo, id(req, "idCorrecao")));
  } catch (erro) { next(erro); }
}

export async function postAprovarCorrecao(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await aprovarCorrecao(auth.idUsuario, id(req, "idCorrecao")));
  } catch (erro) { next(erro); }
}

export async function postSolicitarAjuste(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const body = corpo(req);
    // "comentarioAjuste" é o nome correto; "recadoAdmin" segue aceito por
    // compatibilidade com a collection antiga do Insomnia.
    const comentario = body.comentarioAjuste ?? body.recadoAdmin;
    if (typeof comentario !== "string") {
      throw new ErroValidacao([{ campo: "comentarioAjuste", mensagem: "Campo obrigatório." }]);
    }
    res.status(200).json(await solicitarAjuste(auth.idUsuario, id(req, "idCorrecao"), comentario));
  } catch (erro) { next(erro); }
}
