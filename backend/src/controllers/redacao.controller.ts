import type { NextFunction, Request, Response } from "express";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import { ErroValidacao } from "../errors/erros";
import {
  buscarRedacaoVisivel,
  criarReescrita,
  criarRascunho,
  enviarVersao,
  listarRedacoesVisiveis,
  salvarRascunho,
  type TipoFluxoRedacao,
} from "../services/redacao.service";

function id(req: Request): number {
  const valor = Number(req.params.idRedacao);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ErroValidacao([
      { campo: "idRedacao", mensagem: "Informe um identificador inteiro positivo." },
    ]);
  }
  return valor;
}

function texto(body: unknown, campo: string, obrigatorio: boolean): string {
  const dados = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const valor = dados[campo];
  if (typeof valor !== "string" || (obrigatorio && !valor.trim())) {
    throw new ErroValidacao([
      { campo, mensagem: obrigatorio ? "Campo obrigatório." : "Deve ser um texto." },
    ]);
  }
  return valor;
}

function criarInput(body: unknown) {
  const dados = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const detalhes: { campo: string; mensagem: string }[] = [];
  if (dados.tipoFluxo !== "TREINO" && dados.tipoFluxo !== "AVALIATIVA") {
    detalhes.push({ campo: "tipoFluxo", mensagem: "Use TREINO ou AVALIATIVA." });
  }
  const idTarefa =
    dados.idTarefa === undefined ? undefined : Number(dados.idTarefa);
  const idTema = dados.idTema === undefined ? undefined : Number(dados.idTema);
  for (const [campo, valor] of [["idTarefa", idTarefa], ["idTema", idTema]] as const) {
    if (valor !== undefined && (!Number.isInteger(valor) || valor <= 0)) {
      detalhes.push({ campo, mensagem: "Informe um identificador inteiro positivo." });
    }
  }
  if (detalhes.length) throw new ErroValidacao(detalhes);
  return {
    tipoFluxo: dados.tipoFluxo as TipoFluxoRedacao,
    idTarefa,
    idTema,
    conteudoTexto: dados.conteudoTexto === undefined ? undefined : texto(body, "conteudoTexto", false),
  };
}

export async function postRedacao(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(201).json(await criarRascunho(auth.idUsuario, criarInput(req.body)));
  } catch (erro) {
    next(erro);
  }
}

export async function getRedacoes(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await listarRedacoesVisiveis(auth.idUsuario, auth.papelAtivo));
  } catch (erro) {
    next(erro);
  }
}

export async function getRedacao(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await buscarRedacaoVisivel(auth.idUsuario, auth.papelAtivo, id(req)));
  } catch (erro) {
    next(erro);
  }
}

export async function patchRascunho(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await salvarRascunho(auth.idUsuario, id(req), texto(req.body, "conteudoTexto", false)));
  } catch (erro) {
    next(erro);
  }
}

export async function postEnviarRedacao(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await enviarVersao(auth.idUsuario, id(req)));
  } catch (erro) {
    next(erro);
  }
}

export async function postReescrita(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(201).json(await criarReescrita(auth.idUsuario, id(req)));
  } catch (erro) {
    next(erro);
  }
}
