import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { gerarHashSenha } from "./senha.service";
import { MAX_TUTORES_POR_TURMA, MAX_TUTORADOS_POR_TUTOR } from "../config/limitesNegocio";
import { ErroNegocio } from "../errors/erros";

interface CadastrarViaConviteInput {
  codigo: string;
  email: string;
  nome?: string;
  senha?: string;
}

interface ResultadoCadastro {
  idUsuario: number;
  papelAtribuido: "TUTOR" | "ALUNO";
  contaJaExistia: boolean;
}

/**
 * Realiza o cadastro ou vínculo de usuário a partir de um código de convite.
 * Executado dentro de uma transação atômica (prisma.$transaction) para garantir
 * que falhas em qualquer etapa revertam a criação de contas ou alteração de convites.
 *
 * Violações de regra de negócio lançam ErroNegocio (status HTTP + código para o front).
 */
export async function cadastrarViaConvite(
  input: CadastrarViaConviteInput
): Promise<ResultadoCadastro> {
  const emailNormalizado = input.email.trim().toLowerCase();
  const codigoNormalizado = input.codigo.trim().toUpperCase();

  return prisma.$transaction(async (tx) => {
    // 1. Buscar e validar convite
    const convite = await tx.convite.findUnique({ where: { codigo: codigoNormalizado } });

    if (!convite) {
      throw new ErroNegocio(
        "Convite não encontrado. Confira o código recebido.",
        404,
        "CONVITE_NAO_ENCONTRADO"
      );
    }
    if (convite.usado) {
      throw new ErroNegocio("Este convite já foi utilizado.", 409, "CONVITE_USADO");
    }
    if (convite.expiraEm < new Date()) {
      throw new ErroNegocio("Este convite expirou. Peça um novo link.", 400, "CONVITE_EXPIRADO");
    }

    // 2. Buscar ou criar o usuário
    let usuario = await tx.usuario.findUnique({ where: { email: emailNormalizado } });
    const contaJaExistia = !!usuario;

    if (!usuario) {
      if (!input.nome || !input.senha) {
        throw new ErroNegocio(
          "Nome e senha são obrigatórios para criar uma nova conta.",
          400,
          "DADOS_INCOMPLETOS"
        );
      }
      const senhaHash = await gerarHashSenha(input.senha);
      usuario = await tx.usuario.create({
        data: {
          nome: input.nome.trim(),
          email: emailNormalizado,
          senhaHash,
        },
      });
    }

    // 3. Anexar o papel correspondente (na mesma transação)
    if (convite.papel === "TUTOR") {
      await anexarPapelTutor(tx, usuario.id, convite.idTurma);
    } else if (convite.papel === "ALUNO") {
      if (!convite.idTutor) {
        throw new ErroNegocio(
          "O convite de aluno precisa estar associado a um tutor válido.",
          400,
          "CONVITE_INVALIDO"
        );
      }
      await anexarPapelAluno(tx, usuario.id, convite.idTutor);
    } else {
      throw new ErroNegocio(
        `Papel de convite desconhecido: ${convite.papel}`,
        400,
        "CONVITE_INVALIDO"
      );
    }

    // 4. Marcar convite como utilizado
    await tx.convite.update({
      where: { codigo: convite.codigo },
      data: { usado: true },
    });

    return {
      idUsuario: usuario.id,
      papelAtribuido: convite.papel as "TUTOR" | "ALUNO",
      contaJaExistia,
    };
  });
}

/**
 * Anexa o papel de Tutor ao usuário, vinculando-o à Turma (Schema V3 - 3NF).
 * Impede a troca automática de turma via convite para evitar reatribuição indesejada de alunos.
 */
async function anexarPapelTutor(
  tx: Prisma.TransactionClient,
  idUsuario: number,
  idTurma: number
) {
  const tutorExistente = await tx.tutor.findUnique({ where: { idUsuario } });

  if (!tutorExistente) {
    const quantidadeTutoresNaTurma = await tx.tutor.count({ where: { idTurma } });
    if (quantidadeTutoresNaTurma >= MAX_TUTORES_POR_TURMA) {
      throw new ErroNegocio(
        `Esta turma já atingiu o limite de ${MAX_TUTORES_POR_TURMA} tutores.`,
        409,
        "LIMITE_ATINGIDO"
      );
    }

    await tx.tutor.create({ data: { idUsuario, idTurma } });
    return;
  }

  if (tutorExistente.idTurma === idTurma) {
    return; // Idempotente: já está vinculado a essa mesma turma
  }

  // Se já é Tutor em outra turma, bloqueia a movimentação automática
  const turmaAtual = await tx.turma.findUnique({ where: { id: tutorExistente.idTurma } });
  throw new ErroNegocio(
    `Este tutor já está vinculado à turma "${turmaAtual?.nome ?? tutorExistente.idTurma}". ` +
      "Para transferi-lo para outra turma, fale com a Administração.",
    409,
    "VINCULO_EXISTENTE"
  );
}

/**
 * Anexa o papel de Aluno ao usuário, vinculando-o ao Tutor (Schema V3 - 3NF).
 */
async function anexarPapelAluno(
  tx: Prisma.TransactionClient,
  idUsuario: number,
  idTutor: number
) {
  const alunoExistente = await tx.aluno.findUnique({ where: { idUsuario } });

  if (alunoExistente) {
    throw new ErroNegocio(
      "Esta conta já possui um vínculo de Aluno ativo. " +
        "Para trocar de turma/tutor, fale com a Administração.",
      409,
      "VINCULO_EXISTENTE"
    );
  }

  const quantidadeTutoradosDoTutor = await tx.aluno.count({ where: { idTutor } });
  if (quantidadeTutoradosDoTutor >= MAX_TUTORADOS_POR_TUTOR) {
    throw new ErroNegocio(
      `Este tutor já atingiu o limite de ${MAX_TUTORADOS_POR_TUTOR} tutorados.`,
      409,
      "LIMITE_ATINGIDO"
    );
  }

  await tx.aluno.create({ data: { idUsuario, idTutor } });
}
