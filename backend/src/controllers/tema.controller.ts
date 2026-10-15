import type { NextFunction, Request, Response } from "express";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import {
  atualizarTema,
  buscarTemaPorId,
  criarTema,
  excluirTema,
  listarTemas,
} from "../services/tema.service";
import { ErroValidacao } from "../errors/erros";

function idTema(req: Request): number {
  const valor = Number(req.params.idTema);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ErroValidacao([{ campo: "idTema", mensagem: "Informe um identificador inteiro positivo." }]);
  }
  return valor;
}

function lerDados(body: unknown, parcial: boolean) {
  const dados = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const resultado: { tituloTema?: string; textoMotivador?: string; origem?: string } = {};
  const detalhes: { campo: string; mensagem: string }[] = [];

  if (!parcial || dados.tituloTema !== undefined) {
    if (typeof dados.tituloTema !== "string" || dados.tituloTema.trim() === "") {
      detalhes.push({ campo: "tituloTema", mensagem: "Campo obrigatório e não vazio." });
    } else if (dados.tituloTema.trim().length > 200) {
      detalhes.push({ campo: "tituloTema", mensagem: "Máximo de 200 caracteres." });
    } else resultado.tituloTema = dados.tituloTema.trim();
  }
  for (const campo of ["textoMotivador", "origem"] as const) {
    if (dados[campo] !== undefined) {
      const max = campo === "origem" ? 100 : 10000;
      if (typeof dados[campo] !== "string" || dados[campo].trim().length > max) {
        detalhes.push({ campo, mensagem: `Deve ser um texto de até ${max} caracteres.` });
      } else resultado[campo] = dados[campo].trim();
    }
  }
  if (parcial && Object.keys(resultado).length === 0 && detalhes.length === 0) {
    detalhes.push({ campo: "body", mensagem: "Informe ao menos um campo para atualizar." });
  }
  if (detalhes.length) throw new ErroValidacao(detalhes);
  return resultado;
}

export async function postTema(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(201).json(await criarTema(auth.idUsuario, auth.papelAtivo, lerDados(req.body, false) as { tituloTema: string }));
  } catch (erro) { next(erro); }
}
export async function getTemas(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await listarTemas(auth.idUsuario, auth.papelAtivo));
  } catch (erro) { next(erro); }
}
export async function getTema(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await buscarTemaPorId(idTema(req), auth.idUsuario, auth.papelAtivo));
  } catch (erro) { next(erro); }
}
export async function patchTema(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await atualizarTema(auth.idUsuario, auth.papelAtivo, idTema(req), lerDados(req.body, true)));
  } catch (erro) { next(erro); }
}
export async function deleteTema(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    await excluirTema(auth.idUsuario, auth.papelAtivo, idTema(req));
    res.status(204).send();
  } catch (erro) { next(erro); }
}
