import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";
import type { PapelAtivo } from "./token.service";

export type ModalidadeTarefa = "AVALIATIVA" | "GERAL";

export interface CriarTarefaInput {
  idTurma: number;
  idTema?: number;
  tituloTarefa: string;
  descricao?: string;
  prazoEntrega: Date;
  modalidade: ModalidadeTarefa;
}

export interface AtualizarTarefaInput {
  idTema?: number | null;
  tituloTarefa?: string;
  descricao?: string | null;
  prazoEntrega?: Date;
}

const tarefaInclude = {
  turma: { select: { id: true, nome: true, anoLetivo: true, status: true } },
  tema: { select: { id: true, tituloTema: true } },
  tutor: { include: { usuario: { select: { id: true, nome: true, email: true } } } },
  administrador: { include: { usuario: { select: { id: true, nome: true, email: true } } } },
} as const;

async function obterTutorNaTurma(idUsuario: number, idTurma: number) {
  const tutor = await prisma.tutor.findUnique({
    where: { idUsuario },
    include: { turma: true },
  });

  if (!tutor || tutor.idTurma !== idTurma) {
    throw new ErroNegocio(
      "Você não possui acesso a esta turma.",
      403,
      "SEM_PERMISSAO"
    );
  }
  return tutor;
}

async function validarTurmaAtiva(idTurma: number) {
  const turma = await prisma.turma.findUnique({ where: { id: idTurma } });
  if (!turma) {
    throw new ErroNegocio("Turma não encontrada.", 404, "TURMA_NAO_ENCONTRADA");
  }
  if (turma.status !== "ATIVA") {
    throw new ErroNegocio(
      "Não é possível criar ou aplicar tarefas em uma turma inativa.",
      409,
      "TURMA_INATIVA"
    );
  }
  return turma;
}

async function validarTema(idTema: number | undefined) {
  if (idTema === undefined) return;
  const tema = await prisma.tema.findUnique({ where: { id: idTema } });
  if (!tema) {
    throw new ErroNegocio("Tema não encontrado.", 404, "TEMA_NAO_ENCONTRADO");
  }
}

export async function criarTarefaPorTutor(
  idUsuarioTutor: number,
  input: CriarTarefaInput
) {
  if (input.modalidade !== "AVALIATIVA") {
    throw new ErroNegocio(
      "Tutors podem criar somente tarefas avaliativas.",
      403,
      "MODALIDADE_NAO_PERMITIDA"
    );
  }
  await obterTutorNaTurma(idUsuarioTutor, input.idTurma);
  await validarTurmaAtiva(input.idTurma);
  await validarTema(input.idTema);

  return prisma.tarefa.create({
    data: {
      idTutor: idUsuarioTutor,
      idTurma: input.idTurma,
      idTema: input.idTema,
      tituloTarefa: input.tituloTarefa,
      descricao: input.descricao,
      prazoEntrega: input.prazoEntrega,
      modalidade: input.modalidade,
    },
    include: tarefaInclude,
  });
}

export async function criarTarefaGeral(
  idUsuarioAdmin: number,
  input: CriarTarefaInput
) {
  if (input.modalidade !== "GERAL") {
    throw new ErroNegocio(
      "Atividades administrativas devem usar a modalidade GERAL.",
      400,
      "MODALIDADE_INVALIDA"
    );
  }
  await validarTurmaAtiva(input.idTurma);
  await validarTema(input.idTema);

  return prisma.tarefa.create({
    data: {
      idAdm: idUsuarioAdmin,
      idTurma: input.idTurma,
      idTema: input.idTema,
      tituloTarefa: input.tituloTarefa,
      descricao: input.descricao,
      prazoEntrega: input.prazoEntrega,
      modalidade: input.modalidade,
    },
    include: tarefaInclude,
  });
}

export async function listarTarefasVisiveis(
  idUsuario: number,
  papelAtivo: PapelAtivo
) {
  const where =
    papelAtivo === "ADMINISTRADOR"
      ? {}
      : papelAtivo === "TUTOR"
        ? { turma: { tutores: { some: { idUsuario } } } }
        : { turma: { tutores: { some: { alunos: { some: { idUsuario } } } } } };

  return prisma.tarefa.findMany({
    where,
    orderBy: [{ prazoEntrega: "asc" }, { criadoEm: "desc" }],
    include: tarefaInclude,
  });
}

export async function buscarTarefaVisivel(
  idUsuario: number,
  papelAtivo: PapelAtivo,
  idTarefa: number
) {
  const tarefa = await prisma.tarefa.findUnique({
    where: { id: idTarefa },
    include: {
      ...tarefaInclude,
      turma: {
        select: {
          id: true,
          nome: true,
          anoLetivo: true,
          status: true,
          tutores: {
            select: {
              idUsuario: true,
              alunos: { select: { idUsuario: true } },
            },
          },
        },
      },
    },
  });
  if (!tarefa) {
    throw new ErroNegocio("Tarefa não encontrada.", 404, "TAREFA_NAO_ENCONTRADA");
  }

  const visivel =
    papelAtivo === "ADMINISTRADOR" ||
    (papelAtivo === "TUTOR" &&
      tarefa.turma.tutores.some((tutor) => tutor.idUsuario === idUsuario)) ||
    (papelAtivo === "ALUNO" &&
      tarefa.turma.tutores.some((tutor) =>
        tutor.alunos.some((aluno) => aluno.idUsuario === idUsuario)
      ));

  if (!visivel) {
    throw new ErroNegocio(
      "Você não possui acesso a esta tarefa.",
      403,
      "SEM_PERMISSAO"
    );
  }
  return tarefa;
}

export async function atualizarTarefa(
  idUsuarioAdmin: number,
  idTarefa: number,
  input: AtualizarTarefaInput
) {
  const tarefa = await prisma.tarefa.findUnique({ where: { id: idTarefa } });
  if (!tarefa) {
    throw new ErroNegocio("Tarefa não encontrada.", 404, "TAREFA_NAO_ENCONTRADA");
  }
  if (tarefa.idAdm !== idUsuarioAdmin) {
    throw new ErroNegocio(
      "Somente o administrador criador pode atualizar esta atividade.",
      403,
      "SEM_PERMISSAO"
    );
  }
  await validarTema(input.idTema === null ? undefined : input.idTema);

  return prisma.tarefa.update({
    where: { id: idTarefa },
    data: input,
    include: tarefaInclude,
  });
}

export async function excluirTarefa(idUsuarioAdmin: number, idTarefa: number) {
  const tarefa = await prisma.tarefa.findUnique({
    where: { id: idTarefa },
    include: { _count: { select: { redacoes: true } } },
  });
  if (!tarefa) {
    throw new ErroNegocio("Tarefa não encontrada.", 404, "TAREFA_NAO_ENCONTRADA");
  }
  if (tarefa.idAdm !== idUsuarioAdmin) {
    throw new ErroNegocio("Somente o administrador criador pode excluir esta atividade.", 403, "SEM_PERMISSAO");
  }
  if (tarefa._count.redacoes > 0) {
    throw new ErroNegocio("Não é possível excluir uma tarefa com redações vinculadas.", 409, "TAREFA_EM_USO");
  }
  await prisma.tarefa.delete({ where: { id: idTarefa } });
}

export async function replicarTarefaGeral(
  idUsuarioAdmin: number,
  idTarefaOrigem: number,
  idTurmaDestino: number,
  prazoEntrega: Date
) {
  const origem = await prisma.tarefa.findUnique({ where: { id: idTarefaOrigem } });
  if (!origem) {
    throw new ErroNegocio("Tarefa de origem não encontrada.", 404, "TAREFA_NAO_ENCONTRADA");
  }
  if (origem.idAdm !== idUsuarioAdmin || origem.modalidade !== "GERAL") {
    throw new ErroNegocio(
      "Somente atividades gerais do próprio administrador podem ser replicadas.",
      403,
      "SEM_PERMISSAO"
    );
  }
  await validarTurmaAtiva(idTurmaDestino);

  return prisma.tarefa.create({
    data: {
      idAdm: idUsuarioAdmin,
      idTurma: idTurmaDestino,
      idTema: origem.idTema,
      idTarefaOrigem: origem.id,
      tituloTarefa: origem.tituloTarefa,
      descricao: origem.descricao,
      prazoEntrega,
      modalidade: "GERAL",
    },
    include: tarefaInclude,
  });
}
