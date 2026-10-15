import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";
import { registrarAuditoria } from "./auditoria.service";

export interface FiltroUsuarios {
  papel?: string;
  idTurma?: number;
  status?: string;
  busca?: string;
}

const PAPEIS = ["ADMINISTRADOR", "TUTOR", "ALUNO"];
const STATUS = ["ATIVO", "INATIVO"];

const usuarioInclude = {
  administrador: { select: { idUsuario: true } },
  tutor: {
    select: {
      idTurma: true,
      turma: { select: { id: true, nome: true } },
      _count: { select: { alunos: true } },
    },
  },
  aluno: {
    select: {
      idTutor: true,
      tutor: {
        select: {
          idTurma: true,
          turma: { select: { id: true, nome: true } },
          usuario: { select: { nome: true } },
        },
      },
    },
  },
} as const;

async function carregarUsuarios(where: Prisma.UsuarioWhereInput) {
  return prisma.usuario.findMany({
    where,
    orderBy: { nome: "asc" },
    take: 200,
    include: usuarioInclude,
  });
}

type UsuarioComVinculos = Awaited<ReturnType<typeof carregarUsuarios>>[number];

// Nunca devolve o hash da senha.
function resumir(usuario: UsuarioComVinculos) {
  const papeis: string[] = [];
  if (usuario.administrador) papeis.push("ADMINISTRADOR");
  if (usuario.tutor) papeis.push("TUTOR");
  if (usuario.aluno) papeis.push("ALUNO");
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    status: usuario.status,
    criadoEm: usuario.criadoEm,
    papeis,
    tutor: usuario.tutor
      ? { turma: usuario.tutor.turma, tutorados: usuario.tutor._count.alunos }
      : null,
    aluno: usuario.aluno
      ? {
          idTutor: usuario.aluno.idTutor,
          nomeTutor: usuario.aluno.tutor.usuario.nome,
          turma: usuario.aluno.tutor.turma,
        }
      : null,
  };
}

// RF02: acompanhamento das relações entre Turmas, Tutores e Alunos.
export async function listarUsuarios(filtro: FiltroUsuarios) {
  const papel = filtro.papel?.trim().toUpperCase();
  const status = filtro.status?.trim().toUpperCase();
  if (papel && !PAPEIS.includes(papel)) {
    throw new ErroNegocio("Papel inválido. Use ADMINISTRADOR, TUTOR ou ALUNO.", 400, "PAPEL_INVALIDO");
  }
  if (status && !STATUS.includes(status)) {
    throw new ErroNegocio("Status inválido. Use ATIVO ou INATIVO.", 400, "STATUS_INVALIDO");
  }

  const where: Prisma.UsuarioWhereInput = {
    ...(papel === "ADMINISTRADOR" ? { administrador: { isNot: null } } : {}),
    ...(papel === "TUTOR" ? { tutor: { isNot: null } } : {}),
    ...(papel === "ALUNO" ? { aluno: { isNot: null } } : {}),
    ...(status ? { status } : {}),
    ...(filtro.busca
      ? { OR: [{ nome: { contains: filtro.busca } }, { email: { contains: filtro.busca } }] }
      : {}),
    ...(filtro.idTurma !== undefined
      ? { AND: [{ OR: [{ tutor: { idTurma: filtro.idTurma } }, { aluno: { tutor: { idTurma: filtro.idTurma } } }] }] }
      : {}),
  };
  return (await carregarUsuarios(where)).map(resumir);
}

export async function buscarUsuario(idUsuario: number) {
  const [usuario] = await carregarUsuarios({ id: idUsuario });
  if (!usuario) {
    throw new ErroNegocio("Usuário não encontrado.", 404, "USUARIO_NAO_ENCONTRADO");
  }
  return resumir(usuario);
}

// Inativar bloqueia o login e também as sessões já abertas (ver
// auth.middleware). O histórico do usuário é preservado.
export async function alterarStatusUsuario(idAdmin: number, idUsuario: number, status: string) {
  const novoStatus = status.trim().toUpperCase();
  if (!STATUS.includes(novoStatus)) {
    throw new ErroNegocio("Status inválido. Use ATIVO ou INATIVO.", 400, "STATUS_INVALIDO");
  }
  if (idAdmin === idUsuario) {
    throw new ErroNegocio("Você não pode alterar o status da própria conta.", 409, "AUTO_ALTERACAO");
  }
  const atual = await buscarUsuario(idUsuario);

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id: idUsuario }, data: { status: novoStatus } });
    await registrarAuditoria(
      {
        idUsuario: idAdmin,
        acao: novoStatus === "INATIVO" ? "USUARIO_INATIVADO" : "USUARIO_ATIVADO",
        entidade: "USUARIO",
        idRegistro: idUsuario,
      },
      tx
    );
  });

  const aviso =
    novoStatus === "INATIVO" && atual.tutor && atual.tutor.tutorados > 0
      ? `Este tutor ainda possui ${atual.tutor.tutorados} tutorado(s). Troque o tutor deles para que as redações continuem sendo corrigidas.`
      : null;
  return { ...(await buscarUsuario(idUsuario)), aviso };
}

// A turma do aluno é a do seu Tutor (DEC-009), então trocar de Tutor pode
// trocar de turma. A fila de correção acompanha o aluno para o novo Tutor.
export async function trocarTutorDoAluno(idAdmin: number, idAluno: number, idTutor: number) {
  if (idAluno === idTutor) {
    throw new ErroNegocio("Uma pessoa não pode ser tutora de si mesma.", 409, "VINCULO_INVALIDO");
  }
  const aluno = await prisma.aluno.findUnique({
    where: { idUsuario: idAluno },
    include: {
      tutor: { select: { idTurma: true, turma: { select: { nome: true } }, usuario: { select: { nome: true } } } },
    },
  });
  if (!aluno) throw new ErroNegocio("Aluno não encontrado.", 404, "ALUNO_NAO_ENCONTRADO");
  if (aluno.idTutor === idTutor) {
    throw new ErroNegocio("O aluno já é tutorado deste tutor.", 409, "SEM_ALTERACAO");
  }

  const novo = await prisma.tutor.findUnique({
    where: { idUsuario: idTutor },
    include: { usuario: { select: { nome: true, status: true } }, turma: { select: { nome: true, status: true } } },
  });
  if (!novo) throw new ErroNegocio("Tutor não encontrado.", 404, "TUTOR_NAO_ENCONTRADO");
  if (novo.usuario.status !== "ATIVO") {
    throw new ErroNegocio("O tutor escolhido está inativo.", 409, "TUTOR_INATIVO");
  }
  if (novo.turma.status !== "ATIVA") {
    throw new ErroNegocio("A turma do tutor escolhido não está ativa.", 409, "TURMA_INATIVA");
  }

  await prisma.$transaction(async (tx) => {
    await tx.aluno.update({ where: { idUsuario: idAluno }, data: { idTutor } });
    await registrarAuditoria(
      {
        idUsuario: idAdmin,
        acao: "ALUNO_TUTOR_ALTERADO",
        entidade: "ALUNO",
        idRegistro: idAluno,
        descricao: `Tutor ${aluno.idTutor} (${aluno.tutor.usuario.nome}) para ${idTutor} (${novo.usuario.nome}). Turma: ${aluno.tutor.turma.nome} para ${novo.turma.nome}.`,
      },
      tx
    );
  });

  return {
    idAluno,
    tutorAnterior: { id: aluno.idTutor, nome: aluno.tutor.usuario.nome },
    tutorNovo: { id: idTutor, nome: novo.usuario.nome },
    turmaAnterior: aluno.tutor.turma.nome,
    turmaNova: novo.turma.nome,
    turmaMudou: aluno.tutor.idTurma !== novo.idTurma,
  };
}

// Os tutorados acompanham o Tutor para a nova turma.
export async function trocarTurmaDoTutor(idAdmin: number, idTutor: number, idTurma: number) {
  const tutor = await prisma.tutor.findUnique({
    where: { idUsuario: idTutor },
    include: { turma: { select: { nome: true } }, usuario: { select: { nome: true } }, _count: { select: { alunos: true } } },
  });
  if (!tutor) throw new ErroNegocio("Tutor não encontrado.", 404, "TUTOR_NAO_ENCONTRADO");
  if (tutor.idTurma === idTurma) {
    throw new ErroNegocio("O tutor já pertence a esta turma.", 409, "SEM_ALTERACAO");
  }
  const turma = await prisma.turma.findUnique({ where: { id: idTurma } });
  if (!turma) throw new ErroNegocio("Turma não encontrada.", 404, "TURMA_NAO_ENCONTRADA");
  if (turma.status !== "ATIVA") {
    throw new ErroNegocio("A turma escolhida não está ativa.", 409, "TURMA_INATIVA");
  }

  await prisma.$transaction(async (tx) => {
    await tx.tutor.update({ where: { idUsuario: idTutor }, data: { idTurma } });
    await registrarAuditoria(
      {
        idUsuario: idAdmin,
        acao: "TUTOR_TURMA_ALTERADA",
        entidade: "TUTOR",
        idRegistro: idTutor,
        descricao: `Turma ${tutor.turma.nome} para ${turma.nome}. ${tutor._count.alunos} tutorado(s) acompanham.`,
      },
      tx
    );
  });

  return {
    idTutor,
    nome: tutor.usuario.nome,
    turmaAnterior: tutor.turma.nome,
    turmaNova: turma.nome,
    tutoradosAfetados: tutor._count.alunos,
  };
}
