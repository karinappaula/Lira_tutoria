import type { NextFunction, Request, Response } from "express";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import { ErroValidacao } from "../errors/erros";
import {
  adicionarAnexo,
  aplicarAtividadeGeral,
  atualizarTarefa,
  buscarTarefaVisivel,
  criarTarefaGeral,
  criarTarefaPorTutor,
  excluirTarefa,
  listarTarefasVisiveis,
  removerAnexo,
} from "../services/tarefa.service";

type Detalhe = { campo: string; mensagem: string };

function id(req: Request, nome: string): number {
  const valor = Number(req.params[nome]);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ErroValidacao([{ campo: nome, mensagem: "Informe um identificador inteiro positivo." }]);
  }
  return valor;
}

function corpo(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

function validarPrazo(valor: unknown, detalhes: Detalhe[]): Date | undefined {
  const prazo = typeof valor === "string" ? new Date(valor) : new Date(NaN);
  if (Number.isNaN(prazo.getTime())) {
    detalhes.push({ campo: "prazoEntrega", mensagem: "Informe uma data válida em formato ISO 8601." });
    return undefined;
  }
  if (prazo <= new Date()) {
    detalhes.push({ campo: "prazoEntrega", mensagem: "O prazo deve ser futuro." });
    return undefined;
  }
  return prazo;
}

// idTurma e modalidade deixaram de ser aceitos: a turma vem do Tutor e a
// modalidade vem de quem cria (Tutor = AVALIATIVA, Administração = GERAL).
function dadosTarefa(body: unknown, parcial = false) {
  const dados = corpo(body);
  const detalhes: Detalhe[] = [];
  const resultado: {
    idTema?: number;
    novoTema?: { tituloTema: string; textoMotivador?: string };
    tituloTarefa?: string;
    descricao?: string;
    prazoEntrega?: Date;
  } = {};

  if (dados.idTema !== undefined && dados.idTema !== null) {
    if (!Number.isInteger(dados.idTema) || Number(dados.idTema) <= 0) {
      detalhes.push({ campo: "idTema", mensagem: "Informe um identificador válido." });
    } else resultado.idTema = dados.idTema as number;
  }
  // novoTema só vale na criação; para trocar o tema depois, use idTema.
  if (!parcial && dados.novoTema !== undefined && dados.novoTema !== null) {
    const bruto = typeof dados.novoTema === "object" ? (dados.novoTema as Record<string, unknown>) : {};
    const titulo = typeof bruto.tituloTema === "string" ? bruto.tituloTema.trim() : "";
    const motivador = bruto.textoMotivador;
    if (!titulo || titulo.length > 200) {
      detalhes.push({ campo: "novoTema.tituloTema", mensagem: "Informe um título de até 200 caracteres." });
    }
    if (motivador !== undefined && (typeof motivador !== "string" || motivador.length > 10000)) {
      detalhes.push({ campo: "novoTema.textoMotivador", mensagem: "Deve ser um texto de até 10000 caracteres." });
    }
    resultado.novoTema = {
      tituloTema: titulo,
      textoMotivador: typeof motivador === "string" && motivador.trim() ? motivador.trim() : undefined,
    };
  }
  if (!parcial || dados.tituloTarefa !== undefined) {
    if (typeof dados.tituloTarefa !== "string" || dados.tituloTarefa.trim() === "") {
      detalhes.push({ campo: "tituloTarefa", mensagem: "Campo obrigatório e não vazio." });
    } else if (dados.tituloTarefa.trim().length > 200) {
      detalhes.push({ campo: "tituloTarefa", mensagem: "Máximo de 200 caracteres." });
    } else resultado.tituloTarefa = dados.tituloTarefa.trim();
  }
  if (dados.descricao !== undefined && dados.descricao !== null) {
    if (typeof dados.descricao !== "string" || dados.descricao.length > 10000) {
      detalhes.push({ campo: "descricao", mensagem: "Deve ser um texto de até 10000 caracteres." });
    } else resultado.descricao = dados.descricao;
  }
  if (!parcial || dados.prazoEntrega !== undefined) {
    resultado.prazoEntrega = validarPrazo(dados.prazoEntrega, detalhes);
  }
  if (parcial && detalhes.length === 0 && Object.values(resultado).every((v) => v === undefined)) {
    detalhes.push({ campo: "body", mensagem: "Informe ao menos um campo para atualizar." });
  }
  if (detalhes.length) throw new ErroValidacao(detalhes);
  return resultado;
}

function dadosAnexo(body: unknown) {
  const dados = corpo(body);
  const detalhes: Detalhe[] = [];
  const { nomeArquivo, url, tipoArquivo } = dados;
  if (typeof nomeArquivo !== "string" || !nomeArquivo.trim() || nomeArquivo.length > 255) {
    detalhes.push({ campo: "nomeArquivo", mensagem: "Informe o nome do arquivo (até 255 caracteres)." });
  }
  if (typeof url !== "string" || !url.trim() || url.length > 500) {
    detalhes.push({ campo: "url", mensagem: "Informe a URL do arquivo (até 500 caracteres)." });
  }
  if (typeof tipoArquivo !== "string" || !tipoArquivo.trim()) {
    detalhes.push({ campo: "tipoArquivo", mensagem: "Informe o tipo (MIME) do arquivo." });
  }
  if (detalhes.length) throw new ErroValidacao(detalhes);
  return {
    nomeArquivo: (nomeArquivo as string).trim(),
    url: (url as string).trim(),
    tipoArquivo: (tipoArquivo as string).trim(),
  };
}

export async function postTarefa(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const dados = dadosTarefa(req.body) as {
      idTema?: number;
      novoTema?: { tituloTema: string; textoMotivador?: string };
      tituloTarefa: string;
      descricao?: string;
      prazoEntrega: Date;
    };
    const tarefa =
      auth.papelAtivo === "ADMINISTRADOR"
        ? await criarTarefaGeral(auth.idUsuario, dados)
        : await criarTarefaPorTutor(auth.idUsuario, dados);
    res.status(201).json(tarefa);
  } catch (erro) { next(erro); }
}

export async function getTarefas(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await listarTarefasVisiveis(auth.idUsuario, auth.papelAtivo));
  } catch (erro) { next(erro); }
}

export async function getTarefa(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await buscarTarefaVisivel(auth.idUsuario, auth.papelAtivo, id(req, "idTarefa")));
  } catch (erro) { next(erro); }
}

export async function patchTarefa(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(
      await atualizarTarefa(auth.idUsuario, auth.papelAtivo, id(req, "idTarefa"), dadosTarefa(req.body, true))
    );
  } catch (erro) { next(erro); }
}

export async function deleteTarefa(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    await excluirTarefa(auth.idUsuario, auth.papelAtivo, id(req, "idTarefa"));
    res.status(204).send();
  } catch (erro) { next(erro); }
}

// Tutor aplica uma atividade geral ao próprio grupo; só o prazo é informado.
export async function postAplicarAtividadeGeral(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const detalhes: Detalhe[] = [];
    const prazo = validarPrazo(corpo(req.body).prazoEntrega, detalhes);
    if (detalhes.length || !prazo) throw new ErroValidacao(detalhes);
    res.status(201).json(await aplicarAtividadeGeral(auth.idUsuario, id(req, "idTarefa"), prazo));
  } catch (erro) { next(erro); }
}

export async function postAnexo(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(201).json(
      await adicionarAnexo(auth.idUsuario, auth.papelAtivo, id(req, "idTarefa"), dadosAnexo(req.body))
    );
  } catch (erro) { next(erro); }
}

export async function deleteAnexo(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    await removerAnexo(auth.idUsuario, auth.papelAtivo, id(req, "idTarefa"), id(req, "idAnexo"));
    res.status(204).send();
  } catch (erro) { next(erro); }
}
