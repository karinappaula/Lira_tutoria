import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";
import type { PapelAtivo } from "./token.service";

export interface CriarTemaInput {
  tituloTema: string;
  textoMotivador?: string;
  origem?: string;
}

export type AtualizarTemaInput = Partial<CriarTemaInput>;

const contagens = { _count: { select: { tarefas: true, redacoes: true } } } as const;

// Temas oficiais (criados pela Administração) não têm criador.
// Tema próprio do aluno (US06) guarda quem o criou e só ele o enxerga.
function filtroDeVisibilidade(idUsuario: number, papelAtivo: PapelAtivo): Prisma.TemaWhereInput {
  if (papelAtivo === "ADMINISTRADOR") return {};
  if (papelAtivo === "TUTOR") return { idCriador: null };
  return { OR: [{ idCriador: null }, { idCriador: idUsuario }] };
}

export async function criarTema(input: CriarTemaInput) {
  return prisma.tema.create({
    data: {
      tituloTema: input.tituloTema,
      textoMotivador: input.textoMotivador,
      origem: input.origem ?? "OFICIAL",
    },
  });
}

export async function listarTemas(idUsuario: number, papelAtivo: PapelAtivo) {
  return prisma.tema.findMany({
    where: filtroDeVisibilidade(idUsuario, papelAtivo),
    orderBy: { id: "desc" },
    include: contagens,
  });
}

async function obterTema(idTema: number) {
  const tema = await prisma.tema.findUnique({ where: { id: idTema }, include: contagens });
  if (!tema) {
    throw new ErroNegocio("Tema não encontrado.", 404, "TEMA_NAO_ENCONTRADO");
  }
  return tema;
}

export async function buscarTemaPorId(idTema: number, idUsuario: number, papelAtivo: PapelAtivo) {
  const tema = await obterTema(idTema);
  const visivel =
    papelAtivo === "ADMINISTRADOR" ||
    tema.idCriador === null ||
    (papelAtivo === "ALUNO" && tema.idCriador === idUsuario);
  if (!visivel) {
    // 404 de propósito: não revela que o tema existe.
    throw new ErroNegocio("Tema não encontrado.", 404, "TEMA_NAO_ENCONTRADO");
  }
  return tema;
}

export async function atualizarTema(idTema: number, input: AtualizarTemaInput) {
  await obterTema(idTema);
  return prisma.tema.update({ where: { id: idTema }, data: input });
}

export async function excluirTema(idTema: number) {
  const tema = await obterTema(idTema);
  if (tema._count.tarefas > 0 || tema._count.redacoes > 0) {
    throw new ErroNegocio(
      "Não é possível excluir um tema utilizado por tarefas ou redações.",
      409,
      "TEMA_EM_USO"
    );
  }

  await prisma.tema.delete({ where: { id: idTema } });
}
