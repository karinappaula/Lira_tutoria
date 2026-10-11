import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";

export interface FiltroQuestoes {
  vestibular?: string;
  ano?: number;
  grauDificuldade?: string;
  idAssunto?: number;
  limite?: number;
}

const alternativasPublicas = {
  select: {
    id: true,
    letraOpcao: true,
    textoAlternativa: true,
  },
} as const;

export async function listarQuestoes(filtro: FiltroQuestoes) {
  const limite = filtro.limite ?? 50;
  if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
    throw new ErroNegocio("O limite deve estar entre 1 e 100.", 400, "LIMITE_INVALIDO");
  }

  return prisma.questao.findMany({
    where: {
      ...(filtro.vestibular ? { vestibular: filtro.vestibular } : {}),
      ...(filtro.ano !== undefined ? { ano: filtro.ano } : {}),
      ...(filtro.grauDificuldade ? { grauDificuldade: filtro.grauDificuldade } : {}),
      ...(filtro.idAssunto
        ? { assuntos: { some: { idAssunto: filtro.idAssunto } } }
        : {}),
    },
    orderBy: { id: "asc" },
    take: limite,
    include: {
      alternativas: alternativasPublicas,
      assuntos: { include: { assunto: true } },
    },
  });
}

export async function listarAssuntos() {
  return prisma.assunto.findMany({
    orderBy: { nomeAssunto: "asc" },
    include: { _count: { select: { questoes: true } } },
  });
}
