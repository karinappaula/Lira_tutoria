import type { NextFunction, Request, Response } from "express";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import { ErroValidacao } from "../errors/erros";
import {
  atualizarTarefa,
  buscarTarefaVisivel,
  criarTarefaGeral,
  criarTarefaPorTutor,
  excluirTarefa,
  listarTarefasVisiveis,
  replicarTarefaGeral,
  type ModalidadeTarefa,
} from "../services/tarefa.service";

function id(req: Request, nome: string): number {
  const valor = Number(req.params[nome]);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ErroValidacao([{ campo: nome, mensagem: "Informe um identificador inteiro positivo." }]);
  }
  return valor;
}

function dadosTarefa(body: unknown, parcial = false) {
  const dados = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const detalhes: { campo: string; mensagem: string }[] = [];
  const resultado: {
    idTurma?: number; idTema?: number; tituloTarefa?: string; descricao?: string;
    prazoEntrega?: Date; modalidade?: ModalidadeTarefa;
  } = {};
  if (!parcial || dados.idTurma !== undefined) {
    if (!Number.isInteger(dados.idTurma) || Number(dados.idTurma) <= 0) detalhes.push({ campo: "idTurma", mensagem: "Informe um identificador válido." });
    else resultado.idTurma = dados.idTurma as number;
  }
  if (dados.idTema !== undefined && dados.idTema !== null) {
    if (!Number.isInteger(dados.idTema) || Number(dados.idTema) <= 0) detalhes.push({ campo: "idTema", mensagem: "Informe um identificador válido." });
    else resultado.idTema = dados.idTema as number;
  }
  if (!parcial || dados.tituloTarefa !== undefined) {
    if (typeof dados.tituloTarefa !== "string" || dados.tituloTarefa.trim() === "") detalhes.push({ campo: "tituloTarefa", mensagem: "Campo obrigatório e não vazio." });
    else if (dados.tituloTarefa.trim().length > 200) detalhes.push({ campo: "tituloTarefa", mensagem: "Máximo de 200 caracteres." });
    else resultado.tituloTarefa = dados.tituloTarefa.trim();
  }
  if (dados.descricao !== undefined && dados.descricao !== null) {
    if (typeof dados.descricao !== "string" || dados.descricao.length > 10000) detalhes.push({ campo: "descricao", mensagem: "Deve ser um texto de até 10000 caracteres." });
    else resultado.descricao = dados.descricao;
  }
  if (!parcial || dados.prazoEntrega !== undefined) {
    const prazo = typeof dados.prazoEntrega === "string" ? new Date(dados.prazoEntrega) : new Date(NaN);
    if (Number.isNaN(prazo.getTime())) detalhes.push({ campo: "prazoEntrega", mensagem: "Informe uma data válida em formato ISO 8601." });
    else if (prazo <= new Date()) detalhes.push({ campo: "prazoEntrega", mensagem: "O prazo deve ser futuro." });
    else resultado.prazoEntrega = prazo;
  }
  if (!parcial || dados.modalidade !== undefined) {
    if (dados.modalidade !== "AVALIATIVA" && dados.modalidade !== "GERAL") detalhes.push({ campo: "modalidade", mensagem: "Use AVALIATIVA ou GERAL." });
    else resultado.modalidade = dados.modalidade;
  }
  if (parcial && Object.keys(resultado).length === 0 && detalhes.length === 0) detalhes.push({ campo: "body", mensagem: "Informe ao menos um campo para atualizar." });
  if (detalhes.length) throw new ErroValidacao(detalhes);
  return resultado;
}

function dadosReplicacao(body: unknown): { idTurma: number; prazoEntrega: Date } {
  const dados = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const detalhes: { campo: string; mensagem: string }[] = [];
  const idTurma = dados.idTurma;
  const prazoEntrega = typeof dados.prazoEntrega === "string"
    ? new Date(dados.prazoEntrega)
    : new Date(NaN);

  if (!Number.isInteger(idTurma) || Number(idTurma) <= 0) {
    detalhes.push({ campo: "idTurma", mensagem: "Informe um identificador válido." });
  }
  if (Number.isNaN(prazoEntrega.getTime())) {
    detalhes.push({ campo: "prazoEntrega", mensagem: "Informe uma data válida em formato ISO 8601." });
  } else if (prazoEntrega <= new Date()) {
    detalhes.push({ campo: "prazoEntrega", mensagem: "O prazo deve ser futuro." });
  }
  if (detalhes.length) throw new ErroValidacao(detalhes);

  return { idTurma: idTurma as number, prazoEntrega };
}

export async function postTarefa(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const dados = dadosTarefa(req.body) as { idTurma: number; idTema?: number; tituloTarefa: string; descricao?: string; prazoEntrega: Date; modalidade: ModalidadeTarefa };
    const tarefa = auth.papelAtivo === "ADMINISTRADOR"
      ? await criarTarefaGeral(auth.idUsuario, { ...dados, modalidade: "GERAL" })
      : await criarTarefaPorTutor(auth.idUsuario, { ...dados, modalidade: "AVALIATIVA" });
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
    res.status(200).json(await atualizarTarefa(auth.idUsuario, id(req, "idTarefa"), dadosTarefa(req.body, true)));
  } catch (erro) { next(erro); }
}
export async function deleteTarefa(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    await excluirTarefa(auth.idUsuario, id(req, "idTarefa"));
    res.status(204).send();
  } catch (erro) { next(erro); }
}
export async function postReplicarTarefa(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const destino = dadosReplicacao(req.body);
    res.status(201).json(await replicarTarefaGeral(auth.idUsuario, id(req, "idTarefa"), destino.idTurma, destino.prazoEntrega));
  } catch (erro) { next(erro); }
}
