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

// "TUTOR" e "ALUNO" são origens reservadas: só o sistema as atribui.
const ORIGENS_RESERVADAS = ["TUTOR", "ALUNO"];

// Quem enxerga cada tema:
// - oficial (sem criador, criado pela Administração): todos;
// - tema do Tutor (origem TUTOR): o próprio Tutor, os tutorados dele e a Administração;
// - tema do aluno (origem ALUNO): só o próprio aluno e a Administração.
async function filtroDeVisibilidade(idUsuario: number, papelAtivo: PapelAtivo): Promise<Prisma.TemaWhereInput> {
  if (papelAtivo === "ADMINISTRADOR") return {};
  if (papelAtivo === "TUTOR") {
    return { OR: [{ idCriador: null }, { idCriador: idUsuario }] };
  }
  const aluno = await prisma.aluno.findUnique({ where: { idUsuario }, select: { idTutor: true } });
  return {
    OR: [
      { idCriador: null },
      { idCriador: idUsuario },
      ...(aluno ? [{ idCriador: aluno.idTutor, origem: "TUTOR" }] : []),
    ],
  };
}

function validarOrigemDaAdministracao(origem: string | undefined) {
  if (origem && ORIGENS_RESERVADAS.includes(origem.trim().toUpperCase())) {
    throw new ErroNegocio(
      "As origens TUTOR e ALUNO são reservadas ao sistema.",
      400,
      "ORIGEM_RESERVADA"
    );
  }
}

// Administração cria tema oficial. O Tutor cria tema próprio, que serve às
// tarefas dele (e fica visível aos tutorados dele).
export async function criarTema(idUsuario: number, papelAtivo: PapelAtivo, input: CriarTemaInput) {
  if (papelAtivo === "ADMINISTRADOR") {
    validarOrigemDaAdministracao(input.origem);
    return prisma.tema.create({
      data: {
        tituloTema: input.tituloTema,
        textoMotivador: input.textoMotivador,
        origem: input.origem ?? "OFICIAL",
      },
    });
  }
  if (papelAtivo !== "TUTOR") {
    throw new ErroNegocio("Você não possui permissão para criar temas.", 403, "SEM_PERMISSAO");
  }
  return prisma.tema.create({
    data: {
      tituloTema: input.tituloTema,
      textoMotivador: input.textoMotivador,
      origem: "TUTOR",
      idCriador: idUsuario,
    },
  });
}

export async function listarTemas(idUsuario: number, papelAtivo: PapelAtivo) {
  return prisma.tema.findMany({
    where: await filtroDeVisibilidade(idUsuario, papelAtivo),
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
  const filtro = await filtroDeVisibilidade(idUsuario, papelAtivo);
  const tema = await prisma.tema.findFirst({
    where: { AND: [{ id: idTema }, filtro] },
    include: contagens,
  });
  if (!tema) {
    // 404 de propósito: não revela que o tema existe.
    throw new ErroNegocio("Tema não encontrado.", 404, "TEMA_NAO_ENCONTRADO");
  }
  return tema;
}

// Administração altera qualquer tema. O Tutor altera apenas os que ele criou.
async function obterTemaParaAlterar(idTema: number, idUsuario: number, papelAtivo: PapelAtivo) {
  const tema = await obterTema(idTema);
  if (papelAtivo === "ADMINISTRADOR") return tema;

  if (tema.idCriador !== null && tema.idCriador !== idUsuario) {
    throw new ErroNegocio("Tema não encontrado.", 404, "TEMA_NAO_ENCONTRADO");
  }
  if (tema.idCriador === null || tema.origem !== "TUTOR") {
    throw new ErroNegocio(
      "Você só pode alterar os temas que criou como tutor.",
      403,
      "SEM_PERMISSAO"
    );
  }
  return tema;
}

export async function atualizarTema(
  idUsuario: number,
  papelAtivo: PapelAtivo,
  idTema: number,
  input: AtualizarTemaInput
) {
  await obterTemaParaAlterar(idTema, idUsuario, papelAtivo);
  if (papelAtivo === "ADMINISTRADOR") {
    validarOrigemDaAdministracao(input.origem);
    return prisma.tema.update({ where: { id: idTema }, data: input });
  }
  // O Tutor não muda a origem.
  return prisma.tema.update({
    where: { id: idTema },
    data: { tituloTema: input.tituloTema, textoMotivador: input.textoMotivador },
  });
}

export async function excluirTema(idUsuario: number, papelAtivo: PapelAtivo, idTema: number) {
  const tema = await obterTemaParaAlterar(idTema, idUsuario, papelAtivo);
  if (tema._count.tarefas > 0 || tema._count.redacoes > 0) {
    throw new ErroNegocio(
      "Não é possível excluir um tema utilizado por tarefas ou redações.",
      409,
      "TEMA_EM_USO"
    );
  }

  await prisma.tema.delete({ where: { id: idTema } });
}
