import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";
import { MAX_TUTORADOS_POR_TUTOR } from "../config/limitesNegocio";

const VALIDADE_CONVITE_DIAS = 30;
const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface ConviteCriado {
  codigo: string;
  papel: "TUTOR" | "ALUNO";
  idTurma: number;
  idTutor: number | null;
  expiraEm: Date;
  usado: boolean;
}

function codigoAleatorio(prefixo: "TUT" | "ALU"): string {
  let sufixo = "";
  for (let i = 0; i < 6; i += 1) {
    sufixo += ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)];
  }
  return `${prefixo}-${sufixo}`;
}

async function criarConviteComCodigo(
  data: Omit<Prisma.ConviteCreateInput, "codigo">,
  prefixo: "TUT" | "ALU"
): Promise<ConviteCriado> {
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    try {
      const convite = await prisma.convite.create({
        data: { ...data, codigo: codigoAleatorio(prefixo) },
      });
      return {
        codigo: convite.codigo,
        papel: convite.papel as "TUTOR" | "ALUNO",
        idTurma: convite.idTurma,
        idTutor: convite.idTutor,
        expiraEm: convite.expiraEm,
        usado: convite.usado,
      };
    } catch (erro) {
      if (!(erro instanceof Prisma.PrismaClientKnownRequestError) || erro.code !== "P2002") {
        throw erro;
      }
    }
  }
  throw new ErroNegocio(
    "Não foi possível gerar um código único. Tente novamente.",
    503,
    "CODIGO_INDISPONIVEL"
  );
}

function dataExpiracao(): Date {
  return new Date(Date.now() + VALIDADE_CONVITE_DIAS * 24 * 60 * 60 * 1000);
}

export async function gerarConviteTutor(idUsuarioAdmin: number, idTurma: number): Promise<ConviteCriado> {
  const [admin, turma] = await Promise.all([
    prisma.administrador.findUnique({ where: { idUsuario: idUsuarioAdmin } }),
    prisma.turma.findUnique({ where: { id: idTurma } }),
  ]);

  if (!admin) {
    throw new ErroNegocio("Somente administradores podem gerar convites de tutor.", 403, "SEM_PERMISSAO");
  }
  if (!turma) {
    throw new ErroNegocio("Turma não encontrada.", 404, "TURMA_NAO_ENCONTRADA");
  }
  if (turma.status !== "ATIVA") {
    throw new ErroNegocio("Não é possível gerar convite para uma turma inativa.", 409, "TURMA_INATIVA");
  }

  return criarConviteComCodigo(
    {
      papel: "TUTOR" as const,
      turma: { connect: { id: idTurma } },
      criadoPor: { connect: { id: idUsuarioAdmin } },
      expiraEm: dataExpiracao(),
    },
    "TUT"
  );
}

export async function gerarConviteAluno(idUsuarioTutor: number): Promise<ConviteCriado> {
  const tutor = await prisma.tutor.findUnique({
    where: { idUsuario: idUsuarioTutor },
    include: { turma: true },
  });

  if (!tutor) {
    throw new ErroNegocio("O usuário não possui um perfil de tutor.", 403, "SEM_PERMISSAO");
  }
  if (tutor.turma.status !== "ATIVA") {
    throw new ErroNegocio("Não é possível gerar convite para uma turma inativa.", 409, "TURMA_INATIVA");
  }

  const alunosAtuais = await prisma.aluno.count({ where: { idTutor: idUsuarioTutor } });
  if (alunosAtuais >= MAX_TUTORADOS_POR_TUTOR) {
    throw new ErroNegocio(
      `Este tutor já atingiu o limite de ${MAX_TUTORADOS_POR_TUTOR} tutorados.`,
      409,
      "LIMITE_ATINGIDO"
    );
  }

  return criarConviteComCodigo(
    {
      papel: "ALUNO" as const,
      turma: { connect: { id: tutor.idTurma } },
      tutor: { connect: { idUsuario: idUsuarioTutor } },
      criadoPor: { connect: { id: idUsuarioTutor } },
      expiraEm: dataExpiracao(),
    },
    "ALU"
  );
}

export async function listarConvitesAtivos(idUsuarioAdmin: number, idTurma?: number) {
  const admin = await prisma.administrador.findUnique({ where: { idUsuario: idUsuarioAdmin } });
  if (!admin) {
    throw new ErroNegocio("Somente administradores podem consultar convites.", 403, "SEM_PERMISSAO");
  }

  const convites = await prisma.convite.findMany({
    where: {
      ...(idTurma ? { idTurma } : {}),
      expiraEm: { gt: new Date() },
    },
    orderBy: { criadoEm: "desc" },
    include: {
      turma: { select: { id: true, nome: true, anoLetivo: true } },
      tutor: { include: { usuario: { select: { id: true, nome: true, email: true } } } },
    },
  });

  return convites.map((convite) => ({
    codigo: convite.codigo,
    papel: convite.papel,
    turma: convite.turma,
    tutor: convite.tutor
      ? {
          idUsuario: convite.tutor.idUsuario,
          nome: convite.tutor.usuario.nome,
          email: convite.tutor.usuario.email,
        }
      : null,
    usado: convite.usado,
    usosAtuais: convite.usado ? 1 : 0,
    usosMaximos: 1,
    ativo: !convite.usado && convite.expiraEm > new Date(),
    expiraEm: convite.expiraEm,
    criadoEm: convite.criadoEm,
  }));
}

async function anexarAluno(
  tx: Prisma.TransactionClient,
  idUsuario: number,
  idTutor: number
): Promise<void> {
  const alunoExistente = await tx.aluno.findUnique({ where: { idUsuario } });
  if (alunoExistente) {
    throw new ErroNegocio(
      "Esta conta já possui um vínculo de Aluno ativo.",
      409,
      "VINCULO_EXISTENTE"
    );
  }

  const quantidade = await tx.aluno.count({ where: { idTutor } });
  if (quantidade >= MAX_TUTORADOS_POR_TUTOR) {
    throw new ErroNegocio(
      `Este tutor já atingiu o limite de ${MAX_TUTORADOS_POR_TUTOR} tutorados.`,
      409,
      "LIMITE_ATINGIDO"
    );
  }

  await tx.aluno.create({ data: { idUsuario, idTutor } });
}

export async function participarComoAluno(idUsuario: number, codigo: string) {
  return prisma.$transaction(async (tx) => {
    const tutorDoUsuario = await tx.tutor.findUnique({ where: { idUsuario } });
    if (!tutorDoUsuario) {
      throw new ErroNegocio(
        "A participação como aluno está disponível para contas de tutor.",
        403,
        "SEM_PERMISSAO"
      );
    }

    const convite = await tx.convite.findUnique({ where: { codigo } });
    if (!convite) {
      throw new ErroNegocio("Convite não encontrado.", 404, "CONVITE_NAO_ENCONTRADO");
    }
    if (convite.papel !== "ALUNO" || !convite.idTutor) {
      throw new ErroNegocio("Este código não é um convite de aluno.", 400, "CONVITE_INVALIDO");
    }
    if (convite.usado) {
      throw new ErroNegocio("Este convite já foi utilizado.", 409, "CONVITE_USADO");
    }
    if (convite.expiraEm < new Date()) {
      throw new ErroNegocio("Este convite expirou.", 400, "CONVITE_EXPIRADO");
    }

    await anexarAluno(tx, idUsuario, convite.idTutor);
    await tx.convite.update({
      where: { codigo },
      data: { usado: true },
    });

    return { idUsuario, papelAtribuido: "ALUNO" as const, codigo };
  });
}
