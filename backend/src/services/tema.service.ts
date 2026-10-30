import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";
import type { PapelAtivo } from "./token.service";

export interface CriarTemaInput {
  tituloTema: string;
  textoMotivador?: string;
  imagemUrl?: string;
  origem?: string;
}

export type AtualizarTemaInput = Partial<CriarTemaInput>;

const contagens = { _count: { select: { tarefas: true, redacoes: true } } } as const;

// Quem enxerga cada tema:
// - Administrador: todos os temas cadastrados no acervo;
// - Tutor: todos os temas criados por Tutores e Admins (e temas oficiais do acervo);
// - Aluno: temas oficiais/admin, temas do seu tutor e temas criados pelo próprio aluno.
async function filtroDeVisibilidade(idUsuario: number, papelAtivo: PapelAtivo): Promise<Prisma.TemaWhereInput> {
  if (papelAtivo === "ADMINISTRADOR") return {};
  if (papelAtivo === "TUTOR") {
    return {
      OR: [
        { origem: "ADMIN" },
        { origem: "TUTOR" },
        { origem: "OFICIAL" },
        { idCriador: null },
        { idCriador: idUsuario },
      ],
    };
  }
  const aluno = await prisma.aluno.findUnique({ where: { idUsuario }, select: { idTutor: true } });
  return {
    OR: [
      { idCriador: null },
      { origem: "ADMIN" },
      { origem: "OFICIAL" },
      { idCriador: idUsuario },
      ...(aluno ? [{ idCriador: aluno.idTutor, origem: "TUTOR" }, { idCriador: aluno.idTutor }] : []),
    ],
  };
}

// O campo 'origem' representa ESTRITAMENTE o perfil do criador ('ADMIN' ou 'TUTOR')
// e é atribuído automaticamente no backend com base na sessão autenticada.
export async function criarTema(idUsuario: number, papelAtivo: PapelAtivo, input: CriarTemaInput) {
  if (papelAtivo === "ADMINISTRADOR") {
    return prisma.tema.create({
      data: {
        tituloTema: input.tituloTema,
        textoMotivador: input.textoMotivador,
        imagemUrl: input.imagemUrl,
        origem: "ADMIN",
        idCriador: idUsuario,
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
      imagemUrl: input.imagemUrl,
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
  // O campo origem não se altera: representa estritamente o criador original
  return prisma.tema.update({
    where: { id: idTema },
    data: {
      tituloTema: input.tituloTema,
      textoMotivador: input.textoMotivador,
      imagemUrl: input.imagemUrl,
    },
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
