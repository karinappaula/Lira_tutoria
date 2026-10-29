import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";
import { MAX_TUTORES_POR_TURMA, MAX_TUTORADOS_POR_TUTOR } from "../config/limitesNegocio";

const VALIDADE_CONVITE_DIAS = 30;
const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface ConviteCriado {
  codigo: string;
  papel: "TUTOR" | "ALUNO";
  idTurma: number;
  idTutor: number | null;
  expiraEm: Date;
  usado: boolean;
  usos: number;
  usosMaximos: number;
  vagasRestantes: number;
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
        usos: convite.usos,
        usosMaximos: convite.usosMaximos,
        vagasRestantes: Math.max(0, convite.usosMaximos - convite.usos),
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

export async function gerarConviteTutor(
  idUsuarioAdmin: number,
  idTurma: number,
  usosMaximos: number = 1
): Promise<ConviteCriado> {
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

  const quantidadeUsos = Number(usosMaximos);
  if (!Number.isInteger(quantidadeUsos) || quantidadeUsos < 1 || quantidadeUsos > MAX_TUTORES_POR_TURMA) {
    throw new ErroNegocio(
      `A quantidade de tutores deve ser um número inteiro entre 1 e ${MAX_TUTORES_POR_TURMA}.`,
      400,
      "DADOS_INVALIDOS"
    );
  }

  const tutoresAtuais = await prisma.tutor.count({ where: { idTurma } });
  if (tutoresAtuais + quantidadeUsos > MAX_TUTORES_POR_TURMA) {
    const vagas = Math.max(0, MAX_TUTORES_POR_TURMA - tutoresAtuais);
    throw new ErroNegocio(
      `A turma já possui ${tutoresAtuais} tutores cadastrados. Vagas disponíveis: ${vagas} de ${MAX_TUTORES_POR_TURMA}.`,
      409,
      "LIMITE_ATINGIDO"
    );
  }

  return criarConviteComCodigo(
    {
      papel: "TUTOR" as const,
      turma: { connect: { id: idTurma } },
      criadoPor: { connect: { id: idUsuarioAdmin } },
      usos: 0,
      usosMaximos: quantidadeUsos,
      expiraEm: dataExpiracao(),
    },
    "TUT"
  );
}

export async function gerarConviteAluno(
  idUsuarioTutor: number,
  renovar?: boolean
): Promise<ConviteCriado> {
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

  // Reutiliza o convite ativo do tutor se não foi solicitada a renovação explícita
  if (!renovar) {
    const conviteAtivo = await prisma.convite.findFirst({
      where: {
        idTutor: idUsuarioTutor,
        papel: "ALUNO",
        expiraEm: { gt: new Date() },
      },
      orderBy: { criadoEm: "desc" },
    });

    if (conviteAtivo) {
      return {
        codigo: conviteAtivo.codigo,
        papel: conviteAtivo.papel as "ALUNO",
        idTurma: conviteAtivo.idTurma,
        idTutor: conviteAtivo.idTutor,
        expiraEm: conviteAtivo.expiraEm,
        usado: conviteAtivo.usado,
        usos: conviteAtivo.usos,
        usosMaximos: conviteAtivo.usosMaximos,
        vagasRestantes: Math.max(0, conviteAtivo.usosMaximos - conviteAtivo.usos),
      };
    }
  }

  const alunosAtuais = await prisma.aluno.count({ where: { idTutor: idUsuarioTutor } });
  if (alunosAtuais >= MAX_TUTORADOS_POR_TUTOR) {
    throw new ErroNegocio(
      `Este tutor já atingiu o limite de ${MAX_TUTORADOS_POR_TUTOR} tutorados.`,
      409,
      "LIMITE_ATINGIDO"
    );
  }

  // Se renovar foi solicitado, invalida convites ativos anteriores deste tutor
  if (renovar) {
    await prisma.convite.updateMany({
      where: {
        idTutor: idUsuarioTutor,
        papel: "ALUNO",
        usado: false,
      },
      data: { usado: true },
    });
  }

  return criarConviteComCodigo(
    {
      papel: "ALUNO" as const,
      turma: { connect: { id: tutor.idTurma } },
      tutor: { connect: { idUsuario: idUsuarioTutor } },
      criadoPor: { connect: { id: idUsuarioTutor } },
      usos: 0,
      usosMaximos: MAX_TUTORADOS_POR_TUTOR,
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
    usosAtuais: convite.usos,
    usosMaximos: convite.usosMaximos,
    vagasRestantes: Math.max(0, convite.usosMaximos - convite.usos),
    ativo: !convite.usado && convite.usos < convite.usosMaximos && convite.expiraEm > new Date(),
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
    if (convite.usado || convite.usos >= convite.usosMaximos) {
      throw new ErroNegocio("Este convite já atingiu o limite máximo de utilizações.", 409, "CONVITE_USADO");
    }
    if (convite.expiraEm < new Date()) {
      throw new ErroNegocio("Este convite expirou.", 400, "CONVITE_EXPIRADO");
    }

    await anexarAluno(tx, idUsuario, convite.idTutor);

    const novosUsos = convite.usos + 1;
    const agoraUsado = novosUsos >= convite.usosMaximos;

    await tx.convite.update({
      where: { codigo },
      data: {
        usos: novosUsos,
        usado: agoraUsado,
      },
    });

    return { idUsuario, papelAtribuido: "ALUNO" as const, codigo };
  });
}
