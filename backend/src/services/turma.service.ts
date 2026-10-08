import { prisma } from "../db/prisma";

export interface CriarTurmaInput {
  nome: string;
  anoLetivo: number;
  vestibularFoco?: string;
}

export interface AtualizarTurmaInput {
  nome?: string;
  anoLetivo?: number;
  vestibularFoco?: string;
  status?: "ATIVA" | "ARQUIVADA" | "INATIVA";
}

export interface TurmaComContagem {
  id: number;
  nome: string;
  anoLetivo: number;
  vestibularFoco: string;
  status: string;
  criadoEm: Date;
  totalTutores: number;
  totalAlunos: number;
}

/**
 * Cria uma nova turma no sistema.
 * Regra de negócio: a combinação de `nome` + `anoLetivo` deve ser única.
 */
export async function criarTurma(input: CriarTurmaInput) {
  const jaExiste = await prisma.turma.findFirst({
    where: { nome: input.nome, anoLetivo: input.anoLetivo },
  });

  if (jaExiste) {
    throw new Error(
      `Já existe uma turma "${input.nome}" cadastrada para o ano letivo ${input.anoLetivo}.`
    );
  }

  return prisma.turma.create({
    data: {
      nome: input.nome,
      anoLetivo: input.anoLetivo,
      vestibularFoco: input.vestibularFoco ?? "ENEM",
    },
  });
}

/**
 * Lista todas as turmas ordenadas por ano letivo decrescente.
 * Ajustado para o Schema V3 (3NF): O total de alunos é calculado
 * somando os tutorados de cada tutor pertencente à turma.
 */
export async function listarTurmas(): Promise<TurmaComContagem[]> {
  const turmas = await prisma.turma.findMany({
    orderBy: { anoLetivo: "desc" },
    include: {
      tutores: {
        select: {
          idUsuario: true,
          _count: {
            select: { alunos: true },
          },
        },
      },
    },
  });

  return turmas.map((turma) => {
    const totalTutores = turma.tutores.length;
    const totalAlunos = turma.tutores.reduce(
      (acc, tutor) => acc + tutor._count.alunos,
      0
    );

    return {
      id: turma.id,
      nome: turma.nome,
      anoLetivo: turma.anoLetivo,
      vestibularFoco: turma.vestibularFoco,
      status: turma.status,
      criadoEm: turma.criadoEm,
      totalTutores,
      totalAlunos,
    };
  });
}

/**
 * Busca os detalhes completos de uma turma, incluindo tutores e alunos vinculados.
 */
export async function buscarTurmaPorId(idTurma: number) {
  const turma = await prisma.turma.findUnique({
    where: { id: idTurma },
    include: {
      tutores: {
        include: {
          usuario: {
            select: { id: true, nome: true, email: true, status: true },
          },
          alunos: {
            include: {
              usuario: {
                select: { id: true, nome: true, email: true, status: true },
              },
            },
          },
        },
      },
      _count: {
        select: { tarefas: true, convites: true },
      },
    },
  });

  if (!turma) {
    throw new Error(`Turma com ID ${idTurma} não foi encontrada.`);
  }

  return turma;
}

/**
 * Atualiza os dados cadastrais de uma turma existente.
 */
export async function atualizarTurma(idTurma: number, input: AtualizarTurmaInput) {
  const turmaExistente = await prisma.turma.findUnique({ where: { id: idTurma } });

  if (!turmaExistente) {
    throw new Error(`Turma com ID ${idTurma} não encontrada.`);
  }

  if (input.nome || input.anoLetivo) {
    const novoNome = input.nome ?? turmaExistente.nome;
    const novoAno = input.anoLetivo ?? turmaExistente.anoLetivo;

    const duplicada = await prisma.turma.findFirst({
      where: {
        nome: novoNome,
        anoLetivo: novoAno,
        NOT: { id: idTurma },
      },
    });

    if (duplicada) {
      throw new Error(
        `Já existe outra turma "${novoNome}" cadastrada para o ano ${novoAno}.`
      );
    }
  }

  return prisma.turma.update({
    where: { id: idTurma },
    data: input,
  });
}

/**
 * Arquiva uma turma alterando seu status para "ARQUIVADA".
 */
export async function arquivarTurma(idTurma: number) {
  return atualizarTurma(idTurma, { status: "ARQUIVADA" });
}