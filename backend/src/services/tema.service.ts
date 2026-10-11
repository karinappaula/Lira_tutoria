import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";

export interface CriarTemaInput {
  tituloTema: string;
  textoMotivador?: string;
  origem?: string;
}

export type AtualizarTemaInput = Partial<CriarTemaInput>;

export async function criarTema(input: CriarTemaInput) {
  return prisma.tema.create({
    data: {
      tituloTema: input.tituloTema,
      textoMotivador: input.textoMotivador,
      origem: input.origem,
    },
  });
}

export async function listarTemas() {
  return prisma.tema.findMany({
    orderBy: { id: "desc" },
    include: { _count: { select: { tarefas: true, redacoes: true } } },
  });
}

export async function buscarTemaPorId(idTema: number) {
  const tema = await prisma.tema.findUnique({
    where: { id: idTema },
    include: { _count: { select: { tarefas: true, redacoes: true } } },
  });

  if (!tema) {
    throw new ErroNegocio("Tema não encontrado.", 404, "TEMA_NAO_ENCONTRADO");
  }

  return tema;
}

export async function atualizarTema(idTema: number, input: AtualizarTemaInput) {
  await buscarTemaPorId(idTema);
  return prisma.tema.update({ where: { id: idTema }, data: input });
}

export async function excluirTema(idTema: number) {
  const tema = await buscarTemaPorId(idTema);
  if (tema._count.tarefas > 0 || tema._count.redacoes > 0) {
    throw new ErroNegocio(
      "Não é possível excluir um tema utilizado por tarefas ou redações.",
      409,
      "TEMA_EM_USO"
    );
  }

  await prisma.tema.delete({ where: { id: idTema } });
}
