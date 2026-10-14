import type { NextFunction, Request, Response } from "express";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import { ErroValidacao } from "../errors/erros";
import {
  buscarResultado,
  buscarSimulado,
  criarSimulado,
  criarSimuladoDoCaderno,
  finalizarSimulado,
  iniciarSimulado,
  listarCadernoErros,
  listarSimulados,
  pausarSimulado,
  responderQuestao,
} from "../services/simulado.service";

type Detalhe = { campo: string; mensagem: string };

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

// Inteiro opcional: ausente/nulo vira undefined; texto inválido vira erro 400.
function inteiroOpcional(valor: unknown, campo: string, detalhes: Detalhe[]): number | undefined {
  if (valor === undefined || valor === null || valor === "") return undefined;
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

export async function postSimulado(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const dados = body(req);
    const detalhes: Detalhe[] = [];
    const quantidade = Number(dados.quantidade);
    if (!Number.isInteger(quantidade)) {
      detalhes.push({ campo: "quantidade", mensagem: "Informe uma quantidade inteira." });
    }
    const ano = inteiroOpcional(dados.ano, "ano", detalhes);
    const idAssunto = inteiroOpcional(dados.idAssunto, "idAssunto", detalhes);
    if (detalhes.length) throw new ErroValidacao(detalhes);

    res.status(201).json(await criarSimulado(auth.idUsuario, {
      quantidade,
      vestibular: textoOpcional(dados.vestibular),
      ano,
      grauDificuldade: textoOpcional(dados.grauDificuldade),
      idAssunto,
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
export async function getResultado(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await buscarResultado(auth.idUsuario, id(req, "idSimulado")));
  } catch (erro) { next(erro); }
}
export async function postIniciar(req: Request, res: Response, next: NextFunction) {
  try { const auth = (req as RequestAutenticada).autenticacao; res.status(200).json(await iniciarSimulado(auth.idUsuario, id(req, "idSimulado"))); } catch (erro) { next(erro); }
}
export async function postPausar(req: Request, res: Response, next: NextFunction) {
  try { const auth = (req as RequestAutenticada).autenticacao; res.status(200).json(await pausarSimulado(auth.idUsuario, id(req, "idSimulado"))); } catch (erro) { next(erro); }
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

// GET /caderno-erros?idAssunto=3
export async function getCaderno(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const detalhes: Detalhe[] = [];
    const idAssunto = inteiroOpcional(req.query.idAssunto, "idAssunto", detalhes);
    if (detalhes.length) throw new ErroValidacao(detalhes);
    res.status(200).json(await listarCadernoErros(auth.idUsuario, idAssunto));
  } catch (erro) { next(erro); }
}

// POST /caderno-erros/refazer  { quantidade?, idAssunto?, idsCaderno? }
export async function postRefazerErros(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const dados = body(req);
    const detalhes: Detalhe[] = [];
    const quantidade = inteiroOpcional(dados.quantidade, "quantidade", detalhes);
    if (quantidade !== undefined && quantidade > 50) {
      detalhes.push({ campo: "quantidade", mensagem: "Informe uma quantidade entre 1 e 50." });
    }
    const idAssunto = inteiroOpcional(dados.idAssunto, "idAssunto", detalhes);
    let idsCaderno: number[] | undefined;
    if (dados.idsCaderno !== undefined && dados.idsCaderno !== null) {
      if (!Array.isArray(dados.idsCaderno)) {
        detalhes.push({ campo: "idsCaderno", mensagem: "Informe uma lista de identificadores." });
      } else {
        idsCaderno = dados.idsCaderno.map(Number);
        if (idsCaderno.some((item) => !Number.isInteger(item) || item <= 0)) {
          detalhes.push({ campo: "idsCaderno", mensagem: "Informe identificadores inteiros positivos." });
        }
      }
    }
    if (detalhes.length) throw new ErroValidacao(detalhes);
    res.status(201).json(await criarSimuladoDoCaderno(auth.idUsuario, { quantidade, idAssunto, idsCaderno }));
  } catch (erro) { next(erro); }
}
