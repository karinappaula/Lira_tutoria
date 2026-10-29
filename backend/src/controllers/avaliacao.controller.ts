import type { NextFunction, Request, Response } from "express";
import { ErroValidacao } from "../errors/erros";
import { avaliarRedacao } from "../services/avaliacao.service";

export async function postAvaliarRedacao(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body =
      typeof req.body === "object" && req.body !== null && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};
    if (typeof body.texto !== "string") {
      throw new ErroValidacao([{ campo: "texto", mensagem: "Informe o texto da redação." }]);
    }
    if (body.tema !== undefined && typeof body.tema !== "string") {
      throw new ErroValidacao([{ campo: "tema", mensagem: "O tema deve ser um texto." }]);
    }

    res.status(200).json(await avaliarRedacao(body.texto, body.tema));
  } catch (erro) {
    next(erro);
  }
}
