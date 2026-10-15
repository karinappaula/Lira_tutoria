import type { NextFunction, Request, Response } from "express";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import { ErroValidacao } from "../errors/erros";
import {
  buscarComunicado,
  contarNaoLidos,
  enviarComunicado,
  listarEnviados,
  listarRecebidos,
  marcarComoLido,
} from "../services/comunicado.service";

function id(req: Request) {
  const valor = Number(req.params.idComunicado);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ErroValidacao([{ campo: "idComunicado", mensagem: "Informe um identificador inteiro positivo." }]);
  }
  return valor;
}

// Os textos são guardados como texto puro. O frontend deve exibi-los como
// texto (nunca como HTML) para evitar XSS (RNF02).
export async function postComunicado(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const dados = typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
    const detalhes: { campo: string; mensagem: string }[] = [];
    if (typeof dados.tituloComunicado !== "string") {
      detalhes.push({ campo: "tituloComunicado", mensagem: "Campo obrigatório (texto)." });
    }
    if (typeof dados.mensagem !== "string") {
      detalhes.push({ campo: "mensagem", mensagem: "Campo obrigatório (texto)." });
    }
    let idTurma: number | undefined;
    if (dados.idTurma !== undefined && dados.idTurma !== null) {
      idTurma = Number(dados.idTurma);
      if (!Number.isInteger(idTurma) || idTurma <= 0) {
        detalhes.push({ campo: "idTurma", mensagem: "Informe um identificador inteiro positivo." });
      }
    }
    if (detalhes.length) throw new ErroValidacao(detalhes);
    res.status(201).json(
      await enviarComunicado(auth.idUsuario, auth.papelAtivo, {
        tituloComunicado: dados.tituloComunicado as string,
        mensagem: dados.mensagem as string,
        idTurma,
      })
    );
  } catch (erro) { next(erro); }
}

// GET /comunicados?naoLidos=true  (caixa de entrada do Tutor e do Aluno)
export async function getRecebidos(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await listarRecebidos(auth.idUsuario, auth.papelAtivo, req.query.naoLidos === "true"));
  } catch (erro) { next(erro); }
}

export async function getContagemNaoLidos(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await contarNaoLidos(auth.idUsuario, auth.papelAtivo));
  } catch (erro) { next(erro); }
}

export async function getEnviados(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await listarEnviados(auth.idUsuario));
  } catch (erro) { next(erro); }
}

export async function getComunicado(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await buscarComunicado(auth.idUsuario, auth.papelAtivo, id(req)));
  } catch (erro) { next(erro); }
}

export async function postLido(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    res.status(200).json(await marcarComoLido(auth.idUsuario, id(req)));
  } catch (erro) { next(erro); }
}
