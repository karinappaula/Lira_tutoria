import type { NextFunction, Request, Response } from "express";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import { ErroValidacao } from "../errors/erros";
import {
  alterarStatusQuestao,
  atualizarAssunto,
  atualizarQuestao,
  buscarQuestao,
  criarAssunto,
  criarQuestao,
  excluirAssunto,
  excluirQuestao,
  listarAnosCadastrados,
  listarAssuntos,
  listarQuestoes,
  type AlternativaInput,
  type CriarQuestaoInput,
} from "../services/questao.service";

type Detalhe = { campo: string; mensagem: string };

function id(req: Request, nome: string) {
  const valor = Number(req.params[nome]);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ErroValidacao([{ campo: nome, mensagem: "Informe um identificador inteiro positivo." }]);
  }
  return valor;
}

function corpo(req: Request): Record<string, unknown> {
  return typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
}

function textoDaQuery(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim() ? valor.trim() : undefined;
}

function inteiroDaQuery(valor: unknown, campo: string, detalhes: Detalhe[]): number | undefined {
  if (valor === undefined || valor === "") return undefined;
  const numero = Number(valor);
  if (!Number.isInteger(numero)) {
    detalhes.push({ campo, mensagem: "Deve ser um número inteiro." });
    return undefined;
  }
  return numero;
}

// GET /questoes?pagina=1&limite=20&vestibular=ENEM&ano=2024&grauDificuldade=FACIL
//              &idAssunto=3&busca=texto&status=INATIVA (status: só Administração)
export async function getQuestoes(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const q = req.query;
    const detalhes: Detalhe[] = [];
    const filtro = {
      vestibular: textoDaQuery(q.vestibular),
      ano: inteiroDaQuery(q.ano, "ano", detalhes),
      idAssunto: inteiroDaQuery(q.idAssunto, "idAssunto", detalhes),
      pagina: inteiroDaQuery(q.pagina, "pagina", detalhes),
      limite: inteiroDaQuery(q.limite, "limite", detalhes),
      grauDificuldade: textoDaQuery(q.grauDificuldade),
      status: textoDaQuery(q.status),
      busca: textoDaQuery(q.busca)?.slice(0, 100),
    };
    if (detalhes.length) throw new ErroValidacao(detalhes);
    res.status(200).json(await listarQuestoes(filtro, auth.papelAtivo));
  } catch (erro) { next(erro); }
}

export async function getQuestao(req: Request, res: Response, next: NextFunction) {
  try { res.status(200).json(await buscarQuestao(id(req, "idQuestao"))); } catch (erro) { next(erro); }
}

function alternativaDoCorpo(item: unknown, indice: number, detalhes: Detalhe[]): AlternativaInput {
  const bruto = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
  const ok =
    typeof bruto.letraOpcao === "string" &&
    typeof bruto.textoAlternativa === "string" &&
    typeof bruto.alternativaCorreta === "boolean";
  if (!ok) {
    detalhes.push({
      campo: `alternativas[${indice}]`,
      mensagem: "Informe letraOpcao (texto), textoAlternativa (texto) e alternativaCorreta (true/false).",
    });
  }
  return {
    letraOpcao: String(bruto.letraOpcao ?? ""),
    textoAlternativa: String(bruto.textoAlternativa ?? ""),
    alternativaCorreta: bruto.alternativaCorreta === true,
  };
}

function questaoDoCorpo(req: Request): CriarQuestaoInput {
  const dados = corpo(req);
  const detalhes: Detalhe[] = [];

  for (const campo of ["enunciado", "vestibular", "grauDificuldade"]) {
    if (typeof dados[campo] !== "string") detalhes.push({ campo, mensagem: "Campo obrigatório (texto)." });
  }
  const ano = Number(dados.ano);
  if (!Number.isInteger(ano)) detalhes.push({ campo: "ano", mensagem: "Informe um ano inteiro." });

  let numeroQuestao: number | undefined;
  if (dados.numeroQuestao !== undefined && dados.numeroQuestao !== null) {
    numeroQuestao = Number(dados.numeroQuestao);
    if (!Number.isInteger(numeroQuestao)) {
      detalhes.push({ campo: "numeroQuestao", mensagem: "Deve ser um número inteiro." });
    }
  }
  for (const campo of ["imagemUrl", "explicacaoGabarito"]) {
    const valor = dados[campo];
    if (valor !== undefined && valor !== null && typeof valor !== "string") {
      detalhes.push({ campo, mensagem: "Deve ser um texto." });
    }
  }

  if (!Array.isArray(dados.alternativas)) {
    detalhes.push({ campo: "alternativas", mensagem: "Informe a lista de alternativas." });
  }
  if (!Array.isArray(dados.idAssuntos)) {
    detalhes.push({ campo: "idAssuntos", mensagem: "Informe a lista de assuntos." });
  }
  const alternativas = Array.isArray(dados.alternativas)
    ? dados.alternativas.map((item, indice) => alternativaDoCorpo(item, indice, detalhes))
    : [];
  const idAssuntos = Array.isArray(dados.idAssuntos) ? dados.idAssuntos.map(Number) : [];
  if (idAssuntos.some((item) => !Number.isInteger(item) || item <= 0)) {
    detalhes.push({ campo: "idAssuntos", mensagem: "Informe IDs de assuntos válidos." });
  }
  if (detalhes.length) throw new ErroValidacao(detalhes);

  return {
    enunciado: dados.enunciado as string,
    imagemUrl: typeof dados.imagemUrl === "string" ? dados.imagemUrl : undefined,
    vestibular: dados.vestibular as string,
    ano,
    numeroQuestao,
    grauDificuldade: dados.grauDificuldade as string,
    explicacaoGabarito: typeof dados.explicacaoGabarito === "string" ? dados.explicacaoGabarito : undefined,
    idAssuntos,
    alternativas,
  };
}

export async function postQuestao(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(201).json(await criarQuestao(auth.idUsuario, questaoDoCorpo(req)));
  } catch (erro) { next(erro); }
}

export async function patchQuestao(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await atualizarQuestao(auth.idUsuario, id(req, "idQuestao"), questaoDoCorpo(req)));
  } catch (erro) { next(erro); }
}

export async function deleteQuestao(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    await excluirQuestao(auth.idUsuario, id(req, "idQuestao"));
    res.status(204).send();
  } catch (erro) { next(erro); }
}

export async function postInativarQuestao(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await alterarStatusQuestao(auth.idUsuario, id(req, "idQuestao"), "INATIVA"));
  } catch (erro) { next(erro); }
}

export async function postAtivarQuestao(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await alterarStatusQuestao(auth.idUsuario, id(req, "idQuestao"), "ATIVA"));
  } catch (erro) { next(erro); }
}

// ------------------------------------------------------------------ assuntos

function nomeDoAssunto(req: Request): string {
  const nome = corpo(req).nomeAssunto;
  if (typeof nome !== "string") {
    throw new ErroValidacao([{ campo: "nomeAssunto", mensagem: "Campo obrigatório (texto)." }]);
  }
  return nome;
}

export async function getAssuntos(_req: Request, res: Response, next: NextFunction) {
  try { res.status(200).json(await listarAssuntos()); } catch (erro) { next(erro); }
}

export async function postAssunto(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(201).json(await criarAssunto(auth.idUsuario, nomeDoAssunto(req)));
  } catch (erro) { next(erro); }
}

export async function patchAssunto(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await atualizarAssunto(auth.idUsuario, id(req, "idAssunto"), nomeDoAssunto(req)));
  } catch (erro) { next(erro); }
}

export async function deleteAssunto(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    await excluirAssunto(auth.idUsuario, id(req, "idAssunto"));
    res.status(204).send();
  } catch (erro) { next(erro); }
}

export async function getAnos(_req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json(await listarAnosCadastrados());
  } catch (erro) {
    next(erro);
  }
}
