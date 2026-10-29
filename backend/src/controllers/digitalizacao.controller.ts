import type { NextFunction, Request, Response } from "express";
import { ErroValidacao } from "../errors/erros";
import { digitalizarRedacao } from "../services/digitalizacao.service";

export async function postDigitalizarRedacao(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const imagem = req.file;
    if (!imagem) {
      throw new ErroValidacao([
        { campo: "imagem", mensagem: "Envie o arquivo no campo multipart 'imagem'." },
      ]);
    }
    res.status(200).json(await digitalizarRedacao(imagem.buffer, imagem.mimetype));
  } catch (erro) {
    next(erro);
  }
}
