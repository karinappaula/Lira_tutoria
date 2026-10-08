import { Request, Response, NextFunction } from "express";
import { criarTurma, listarTurmas } from "../services/turma.service";

export async function postTurma(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome, anoLetivo, vestibularFoco } = req.body;

    if (!nome || !anoLetivo) {
      return res.status(400).json({ erro: "Campos 'nome' e 'anoLetivo' são obrigatórios." });
    }

    const turma = await criarTurma({ nome, anoLetivo, vestibularFoco });
    return res.status(201).json(turma);
  } catch (erro) {
    next(erro);
  }
}

export async function getTurmas(_req: Request, res: Response, next: NextFunction) {
  try {
    const turmas = await listarTurmas();
    return res.json(turmas);
  } catch (erro) {
    next(erro);
  }
}
