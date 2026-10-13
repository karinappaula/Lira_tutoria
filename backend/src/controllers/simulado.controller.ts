import type { NextFunction, Request, Response } from "express";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import { ErroValidacao } from "../errors/erros";
import {
  criarSimulado,
  criarSimuladoDoCaderno,
  buscarSimulado,
  finalizarSimulado,
  iniciarSimulado,
  listarCadernoErros,
  listarSimulados,
  responderQuestao,
  revisarErro,
} from "../services/simulado.service";

function id(req: Request, nome: string) {
  const valor = Number(req.params[nome]);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ErroValidacao([{ campo: nome, mensagem: "Informe um identificador inteiro positivo." }]);
  }
  return valor;
}

function body(req: Request) {
  return typeof req.body === "object" && req.body !== null ? req.body as Record<string, unknown> : {};
}

export async function postSimulado(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const dados = body(req);
    const quantidade = Number(dados.quantidade);
    if (!Number.isInteger(quantidade)) {
      throw new ErroValidacao([{ campo: "quantidade", mensagem: "Informe uma quantidade inteira." }]);
    }
    res.status(201).json(await criarSimulado(auth.idUsuario, {
      tipoSimulado: typeof dados.tipoSimulado === "string" ? dados.tipoSimulado : "PERSONALIZADO",
      quantidade,
      vestibular: typeof dados.vestibular === "string" ? dados.vestibular : undefined,
      ano: dados.ano === undefined ? undefined : Number(dados.ano),
      grauDificuldade: typeof dados.grauDificuldade === "string" ? dados.grauDificuldade : undefined,
      idAssunto: dados.idAssunto === undefined ? undefined : Number(dados.idAssunto),
    }));
  } catch (erro) { next(erro); }
}

export async function getSimulados(req: Request, res: Response, next: NextFunction) {
  try { res.status(200).json(await listarSimulados((req as RequestAutenticada).autenticacao.idUsuario)); } catch (erro) { next(erro); }
}
export async function getSimulado(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await buscarSimulado(auth.idUsuario, id(req, "idSimulado")));
  } catch (erro) { next(erro); }
}
export async function postIniciar(req: Request, res: Response, next: NextFunction) {
  try { const auth = (req as RequestAutenticada).autenticacao; res.status(200).json(await iniciarSimulado(auth.idUsuario, id(req, "idSimulado"))); } catch (erro) { next(erro); }
}
export async function patchResposta(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const dados = body(req);
    if (typeof dados.resposta !== "string") throw new ErroValidacao([{ campo: "resposta", mensagem: "Campo obrigatório." }]);
    const idQuestao = Number(dados.idQuestao);
    if (!Number.isInteger(idQuestao) || idQuestao <= 0) {
      throw new ErroValidacao([{ campo: "idQuestao", mensagem: "Informe um identificador inteiro positivo." }]);
    }
    res.status(200).json(await responderQuestao(auth.idUsuario, id(req, "idSimulado"), idQuestao, dados.resposta));
  } catch (erro) { next(erro); }
}
export async function postFinalizar(req: Request, res: Response, next: NextFunction) {
  try { const auth = (req as RequestAutenticada).autenticacao; res.status(200).json(await finalizarSimulado(auth.idUsuario, id(req, "idSimulado"))); } catch (erro) { next(erro); }
}
export async function getCaderno(req: Request, res: Response, next: NextFunction) {
  try { res.status(200).json(await listarCadernoErros((req as RequestAutenticada).autenticacao.idUsuario)); } catch (erro) { next(erro); }
}
export async function postRevisarErro(req: Request, res: Response, next: NextFunction) {
  try { const auth = (req as RequestAutenticada).autenticacao; res.status(200).json(await revisarErro(auth.idUsuario, id(req, "idCaderno"))); } catch (erro) { next(erro); }
}
export async function postRefazerErros(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const dados = body(req);
    const quantidade = dados.quantidade === undefined ? undefined : Number(dados.quantidade);
    if (quantidade !== undefined && (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 50)) {
      throw new ErroValidacao([{ campo: "quantidade", mensagem: "Informe uma quantidade entre 1 e 50." }]);
    }
    res.status(201).json(await criarSimuladoDoCaderno(auth.idUsuario, quantidade));
  } catch (erro) { next(erro); }
}
