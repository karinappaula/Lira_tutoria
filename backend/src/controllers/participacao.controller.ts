import type { NextFunction, Request, Response } from "express";
import { participarComoAluno } from "../services/convite.service";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import { ErroValidacao } from "../errors/erros";

export async function participarAluno(req: Request, res: Response, next: NextFunction) {
  try {
    const codigo = typeof req.body?.codigo === "string" ? req.body.codigo.trim().toUpperCase() : "";
    if (!codigo) {
      throw new ErroValidacao([{ campo: "codigo", mensagem: "Campo obrigatório." }]);
    }
    const autenticada = req as RequestAutenticada;
    const resultado = await participarComoAluno(autenticada.autenticacao.idUsuario, codigo);
    res.status(201).json(resultado);
  } catch (erro) {
    next(erro);
  }
}
