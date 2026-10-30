import { Request, Response, NextFunction } from "express";
import {
  arquivarTurma,
  atualizarTurma,
  buscarTurmaVisivelPorId,
  criarTurma,
  desarquivarTurma,
  listarTurmasVisiveis,
} from "../services/turma.service";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import { ErroValidacao, type DetalheValidacao } from "../errors/erros";

function obterIdTurma(req: Request): number {
  const idTurma = Number(req.params.idTurma);
  if (!Number.isInteger(idTurma) || idTurma <= 0) {
    throw new ErroValidacao([
      { campo: "idTurma", mensagem: "Informe um identificador inteiro positivo." },
    ]);
  }
  return idTurma;
}

function validarDadosTurma(body: unknown, parcial: boolean): {
  nome?: string;
  anoLetivo?: number;
  vestibularFoco?: string;
} {
  const dados = typeof body === "object" && body !== null
    ? body as Record<string, unknown>
    : {};
  const detalhes: DetalheValidacao[] = [];
  const resultado: {
    nome?: string;
    anoLetivo?: number;
    vestibularFoco?: string;
  } = {};

  if (!parcial || dados.nome !== undefined) {
    if (typeof dados.nome !== "string" || dados.nome.trim() === "") {
      detalhes.push({ campo: "nome", mensagem: "Deve ser um texto não vazio." });
    } else if (dados.nome.trim().length > 100) {
      detalhes.push({ campo: "nome", mensagem: "Máximo de 100 caracteres." });
    } else {
      resultado.nome = dados.nome.trim();
    }
  }

  if (!parcial || dados.anoLetivo !== undefined) {
    if (
      !Number.isInteger(dados.anoLetivo) ||
      Number(dados.anoLetivo) < 2000 ||
      Number(dados.anoLetivo) > 2200
    ) {
      detalhes.push({
        campo: "anoLetivo",
        mensagem: "Informe um ano letivo inteiro entre 2000 e 2200.",
      });
    } else {
      resultado.anoLetivo = dados.anoLetivo as number;
    }
  }

  if (dados.vestibularFoco !== undefined) {
    if (
      typeof dados.vestibularFoco !== "string" ||
      dados.vestibularFoco.trim() === "" ||
      dados.vestibularFoco.trim().length > 20
    ) {
      detalhes.push({
        campo: "vestibularFoco",
        mensagem: "Deve ser um texto não vazio de até 20 caracteres.",
      });
    } else {
      resultado.vestibularFoco = dados.vestibularFoco.trim();
    }
  }

  if (parcial && Object.keys(resultado).length === 0 && detalhes.length === 0) {
    detalhes.push({ campo: "body", mensagem: "Informe ao menos um campo para atualizar." });
  }

  if (detalhes.length > 0) {
    throw new ErroValidacao(detalhes);
  }

  return resultado;
}

export async function postTurma(req: Request, res: Response, next: NextFunction) {
  try {
    const dados = validarDadosTurma(req.body, false);
    const turma = await criarTurma(dados as { nome: string; anoLetivo: number; vestibularFoco?: string });
    return res.status(201).json(turma);
  } catch (erro) {
    next(erro);
  }
}

export async function getTurma(req: Request, res: Response, next: NextFunction) {
  try {
    const autenticada = req as RequestAutenticada;
    const turma = await buscarTurmaVisivelPorId(
      autenticada.autenticacao.idUsuario,
      autenticada.autenticacao.papelAtivo,
      obterIdTurma(req)
    );
    return res.status(200).json(turma);
  } catch (erro) {
    next(erro);
  }
}

export async function patchTurma(req: Request, res: Response, next: NextFunction) {
  try {
    const dados = validarDadosTurma(req.body, true);
    const turma = await atualizarTurma(obterIdTurma(req), dados);
    return res.status(200).json(turma);
  } catch (erro) {
    next(erro);
  }
}

export async function postArquivarTurma(req: Request, res: Response, next: NextFunction) {
  try {
    const turma = await arquivarTurma(obterIdTurma(req));
    return res.status(200).json(turma);
  } catch (erro) {
    next(erro);
  }
}

export async function postDesarquivarTurma(req: Request, res: Response, next: NextFunction) {
  try {
    const turma = await desarquivarTurma(obterIdTurma(req));
    return res.status(200).json(turma);
  } catch (erro) {
    next(erro);
  }
}

export async function getTurmas(req: Request, res: Response, next: NextFunction) {
  try {
    const autenticada = req as RequestAutenticada;
    const turmas = await listarTurmasVisiveis(
      autenticada.autenticacao.idUsuario,
      autenticada.autenticacao.papelAtivo
    );
    return res.json(turmas);
  } catch (erro) {
    next(erro);
  }
}
